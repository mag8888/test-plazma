
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction, TransactionType } from '../models/Transaction';
import { Avatar, AvatarType } from '../models/Avatar';
import { NotificationService } from './NotificationService';
import { WalletService, Currency } from './WalletService';

// Configurations (Duplicate from MatrixService to ensure independent check)
const AVATAR_CONFIG = {
    BASIC: { cost: 20 },
    ADVANCED: { cost: 100 },
    PREMIUM: { cost: 1000 }
};

interface AuditResult {
    userId: string;
    username?: string;
    telegram_id?: number;
    issues: string[];
    details: {
        actualGreen: number;
        calcGreen: number;
        actualYellow: number;
        calcYellow: number;
        actualBonuses: number;
        theoreticalBonuses: number;
    };
}

export class AuditService {

    /**
     * Perform full audit for all users or a specific user
     */
    static async performAudit(specificUserId?: string): Promise<AuditResult[]> {
        const results: AuditResult[] = [];
        const users = specificUserId
            ? [await User.findById(specificUserId)]
            : await User.find({});

        for (const user of users) {
            if (!user) continue;

            const result = await this.auditUser(user);
            if (result.issues.length > 0) {
                results.push(result);

                // Alert Admin if issues found
                if (user.telegram_id) { // Or send to Main Admin ID
                    await this.alertAdmin(result);
                }
            }
        }
        return results;
    }

    /**
     * Audit single user
     */
    static async auditUser(user: any): Promise<AuditResult> {
        const issues: string[] = [];

        // 1. Balance Integrity Check
        // Fetch all transactions
        const transactions = await Transaction.find({ user: user._id });

        let calcGreen = 0;
        let calcYellow = 0;
        let calcRed = 0;

        // Sum transactions
        for (const t of transactions) {
            if (t.currency === 'GREEN' || t.currency === Currency.GREEN) calcGreen += t.amount;
            if (t.currency === 'YELLOW' || t.currency === Currency.YELLOW) calcYellow += t.amount;
            if (t.currency === 'RED') calcRed += t.amount;
        }

        // Check vs User Model (Store Actual)
        const actualGreen = user.greenBalance || 0;
        const actualYellow = user.yellowBalance || 0;

        // Allow small float diff (0.01)
        if (Math.abs(actualGreen - calcGreen) > 0.05) {
            issues.push(`Integrity Fail: Green Balance Mismatch. DB=${actualGreen}, TransSum=${calcGreen.toFixed(2)}`);
        }
        if (Math.abs(actualYellow - calcYellow) > 0.05) {
            issues.push(`Integrity Fail: Yellow Balance Mismatch. DB=${actualYellow}, TransSum=${calcYellow.toFixed(2)}`);
        }

        // 2. Bonus Legitimacy Check
        // Actual Bonuses Received
        // 2. Bonus Legitimacy Check
        // Actual Bonuses Received (GREEN ONLY)
        const actualBonuses = transactions
            .filter(t => (t.type === TransactionType.AVATAR_BONUS || t.type === TransactionType.BONUS_GREEN) && (t.currency === 'GREEN' || t.currency === Currency.GREEN))
            .reduce((sum, t) => sum + t.amount, 0);

        // Theoretical Bonuses Expected
        const theoreticalBonuses = await this.calculateExpectedBonuses(user._id);

        // Detection: If received significantly more than theoretical max
        if (actualBonuses > theoreticalBonuses + 1.0) { // $1 buffer
            issues.push(`Legitimacy Fail: Excessive Bonus Payouts. Received=$${actualBonuses}, Expected=$${theoreticalBonuses}`);
        }

        return {
            userId: user._id.toString(),
            username: user.username,
            telegram_id: user.telegram_id,
            issues,
            details: {
                actualGreen,
                calcGreen,
                actualYellow,
                calcYellow,
                actualBonuses,
                theoreticalBonuses
            }
        };
    }

    /**
     * Calculate Theoretical Max Bonuses a user should have received based on matrix state
     */
    static async calculateExpectedBonuses(userId: mongoose.Types.ObjectId): Promise<number> {
        let expectedTotal = 0;

        // 1. Direct Referral Bonuses (50% of cost)
        // Find avatars OWNED by people REFERRED by this user
        // We need to find users referred by 'userId'
        const referrals = await User.find({ referrer: userId });
        const referralIds = referrals.map(u => u._id);

        if (referralIds.length > 0) {
            const referralAvatars = await Avatar.find({ owner: { $in: referralIds } });

            for (const av of referralAvatars) {
                const config = AVATAR_CONFIG[av.type as keyof typeof AVATAR_CONFIG];
                if (config) {
                    expectedTotal += config.cost * 0.5; // 50% Direct Bonus
                }
            }
        }

        // 2. Level Bonuses (Indirect)
        // User gets bonuses when *their referrals' avatars* level up?
        // Wait, logic review:
        // L0->1 (Inviter gets), L1->2 (Inviter gets).
        // Yes, Inviter gets 1/3 of the Pot at EVERY level up of their direct referrals.

        // So we iterate through the SAME `referralAvatars` and check their Levels.
        // For each avatar, if it is Level L, it means it passed 1..L transitions.

        if (referralIds.length > 0) {
            const referralAvatars = await Avatar.find({ owner: { $in: referralIds } });
            for (const av of referralAvatars) {
                const type = av.type as keyof typeof AVATAR_CONFIG;

                // Sum bonuses for levels 1 to av.level
                for (let l = 1; l <= av.level; l++) {
                    // Bonus for reaching Level 'l'
                    // Pot needed for L(prev)->L(next)
                    // Config from MatrixService math:
                    // Inviter Bonus = TotalPot / 3
                    // Total Pot = RequiredBalance(prevLevel)

                    const bonusAmount = this.getTheoreticalLevelBonus(type, l);
                    expectedTotal += bonusAmount;
                }
            }
        }

        // 3. Matrix Completion Bonuses (Self)
        // Verify if user's OWN avatars reached Level 5.
        // MatrixService: "if (nextLevel === 5) { ... 100% to Owner ... }"
        const myAvatars = await Avatar.find({ owner: userId });
        for (const av of myAvatars) {
            if (av.level >= 5) {
                const config = AVATAR_CONFIG[av.type as keyof typeof AVATAR_CONFIG];
                if (config) {
                    // Check MatrixService.getRequiredBalanceForLevel logic for L4->L5 transition value.
                    // L4 pot is used to enter L5.
                    // Actually MatrixService pays the POT value when entering L5.
                    const potFunctions = this.getTheoreticalLevelBonusPot(av.type, 5);
                    expectedTotal += potFunctions;
                }
            }
        }

        // 3. What about Matrix (Yellow) Bonuses?
        // The audit requested "Bonus Alert" generally implies Green (Real Money).
        // Yellow is internal. We focus on Green for now as that's "Money out of pocket".

        return expectedTotal;
    }

    // Helper for Personal Matrix Completion Payout (Level 5)
    static getTheoreticalLevelBonusPot(type: string, levelReached: number): number {
        const config = AVATAR_CONFIG[type as keyof typeof AVATAR_CONFIG];
        if (!config) return 0;
        const base = config.cost / 2;

        // MatrixService.getRequiredBalanceForLevel logic:
        // Required = 3 * baseValue * (2^currentLevel)
        // Transition to Level 5 means we completed Level 4.
        // Pot comes from 3 partners at Level 4 upgrading.
        // Pot = 3 * Base * 2^4 = 3 * Base * 16 = 48 * Base.

        // Wait, let's verify Formula.
        // L0->1: Pot = 3*Base*1.
        // L4->5: Pot = 3*Base*(2^4).

        return 3 * base * Math.pow(2, levelReached - 1);
    }

    // Duplicate math from MatrixService (safest to hardcode expected values to detect logic drift)
    static getTheoreticalLevelBonus(type: string, levelReached: number): number {
        const config = AVATAR_CONFIG[type as keyof typeof AVATAR_CONFIG];
        if (!config) return 0;
        const base = config.cost / 2;

        if (levelReached >= 5) return 0; // Inviter gets nothing for L5

        return base * Math.pow(2, levelReached - 1);
    }

    static async alertAdmin(result: AuditResult) {
        const adminId = process.env.TELEGRAM_ADMIN_ID;
        if (!adminId) return;

        let message = `🚨 <b>AUDIT ALERT: ${result.username || result.userId}</b>\n\n`;
        result.issues.forEach(issue => message += `❌ ${issue}\n`);

        message += `\n<b>Details:</b>\n`;
        message += `Green DB: $${result.details.actualGreen} | Calc: $${result.details.calcGreen.toFixed(2)}\n`;
        message += `Bonuses Received: $${result.details.actualBonuses} | Expected: $${result.details.theoreticalBonuses}\n`;

        await NotificationService.sendTelegramMessage(Number(adminId), message).catch(console.error);
    }
    /**
     * Fix Balances for a user
     * Detects excess bonuses and deducts them from Green Balance.
     */
    static async fixBalances(userId: string): Promise<{ success: boolean, message: string, deducted: number }> {
        console.log(`[AuditService v2.5] FIX START for ${userId}`);
        const user = await User.findById(userId);
        if (!user) return { success: false, message: 'User not found', deducted: 0 };

        const audit = await this.auditUser(user);

        // Check for discrepancy
        const discrepancy = audit.details.actualBonuses - audit.details.theoreticalBonuses;

        // CASE 1: Excess (User has too much) - Deduct
        if (discrepancy > 1.0) {
            console.log(`[AuditFix] Fixing user ${user.username}. Deducting Excess: ${discrepancy}`);

            user.greenBalance = (user.greenBalance || 0) - discrepancy;
            if (user.greenBalance < 0) user.greenBalance = 0;
            await user.save();

            await Transaction.create({
                user: user._id,
                amount: -discrepancy,
                currency: 'GREEN',
                type: TransactionType.ADMIN_ADJUSTMENT,
                description: `Audit Correction: Removed duplicate/excess bonuses ($${discrepancy.toFixed(2)})`
            });

            return {
                success: true,
                message: `Fixed Excess! Deducted $${discrepancy.toFixed(2)}. New Balance: $${user.greenBalance}`,
                deducted: discrepancy
            };
        }

        // CASE 2: Deficit (User has too little - likely due to wrongful deduction) - Restore
        if (discrepancy < -1.0) {
            const refundAmount = Math.abs(discrepancy);
            console.log(`[AuditFix] Fixing user ${user.username}. Restoring Deficit: ${refundAmount}`);

            user.greenBalance = (user.greenBalance || 0) + refundAmount;
            await user.save();

            await Transaction.create({
                user: user._id,
                amount: refundAmount,
                currency: 'GREEN',
                type: TransactionType.ADMIN_ADJUSTMENT,
                description: `Audit Correction: Restored missing/wrongfully deducted funds ($${refundAmount.toFixed(2)})`
            });

            return {
                success: true,
                message: `Fixed Deficit! Restored $${refundAmount.toFixed(2)}. New Balance: $${user.greenBalance}`,
                deducted: -refundAmount // Negative deduction = addition
            };
        }

        return { success: true, message: 'Balance is correct (matches theoretical).', deducted: 0 };
    }
}
