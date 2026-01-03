import { Avatar, AvatarType, IAvatar } from '../models/Avatar';
import { User } from '../models/User';
import { AvatarPurchase } from '../models/AvatarPurchase';
import { Transaction, TransactionType } from '../models/Transaction';
import { LevelTransition } from '../models/LevelTransition';
import { WalletService, Currency } from './WalletService';
import { NotificationService } from './NotificationService';
import mongoose from 'mongoose';

// Avatar costs and configurations
const AVATAR_CONFIG = {
    BASIC: { cost: 20, subscriptionMonths: 1 },
    ADVANCED: { cost: 100, subscriptionMonths: 12 },
    PREMIUM: { cost: 1000, subscriptionMonths: null } // Lifetime
};

const PREMIUM_AVATAR_LIMIT = 25;

export class MatrixService {

    /**
     * Check if user has active subscription
     */
    static async hasActiveSubscription(userId: mongoose.Types.ObjectId): Promise<boolean> {
        const now = new Date();
        const activeAvatar = await Avatar.findOne({
            owner: userId,
            isActive: true,
            $or: [
                { subscriptionExpires: { $gt: now } },
                { subscriptionExpires: null }
            ]
        });
        return !!activeAvatar;
    }

    /**
     * Check premium limit
     */
    static async checkPremiumLimit(): Promise<boolean> {
        const count = await Avatar.countDocuments({ type: AvatarType.PREMIUM, isActive: true });
        return count < PREMIUM_AVATAR_LIMIT;
    }

    /**
     * BFS Search for First Empty Slot
     * Scans the sub-tree starting from 'rootAvatarId' level-by-level (Top-to-Bottom, Left-to-Right)
     * Returns the first avatar found with < 3 partners.
     */
    static async findFirstEmptySlotBFS(rootAvatarId: mongoose.Types.ObjectId, type: AvatarType): Promise<IAvatar | null> {
        // Queue stores IDs to visit
        const queue: mongoose.Types.ObjectId[] = [rootAvatarId];
        // Visited set to prevent cycles (though tree shouldn't have them)
        const visited = new Set<string>();
        visited.add(rootAvatarId.toString());

        while (queue.length > 0) {
            const currentId = queue.shift()!;

            const currentAvatar = await Avatar.findById(currentId);
            if (!currentAvatar || !currentAvatar.isActive) continue;

            // Strict Validation: Get counts of ACTUAL ACTIVE partners
            const activePartners = await Avatar.find({
                _id: { $in: currentAvatar.partners },
                isActive: true
            });

            // Self-Repair: If mismatch found (e.g. Ghost partners), clean it up
            if (activePartners.length !== currentAvatar.partners.length) {
                // console.log(`[Matrix] Repairing ghost partners for ${currentAvatar._id}`);
                currentAvatar.partners = activePartners.map(p => p._id as mongoose.Types.ObjectId);
                await currentAvatar.save();
            }

            // Check Space
            if (activePartners.length < 3) {
                return currentAvatar;
            }

            // STRICT ORDER ENFORCEMENT: Left-To-Right
            // MongoDB .find with $in does NOT guarantee order. We must manually sort.

            // Map for O(1) lookup
            const partnerMap = new Map<string, any>();
            activePartners.forEach(p => partnerMap.set(p._id.toString(), p));

            // Iterate using the original 'partners' array (Source of Truth for Order)
            for (const pid of currentAvatar.partners) {
                const p = partnerMap.get(pid.toString());
                if (p && !visited.has(p._id.toString())) {
                    visited.add(p._id.toString());
                    queue.push(p._id as mongoose.Types.ObjectId);
                }
            }
        }

        return null;
    }

    /**
     * Find Global Root for Type
     * (Oldest Active Avatar of that type)
     */
    static async findGlobalRoot(type: AvatarType): Promise<IAvatar | null> {
        return Avatar.findOne({ type, isActive: true }).sort({ createdAt: 1 });
    }

    /**
     * Place Avatar Logic (BFS / Closest-to-Anchor)
     * 1. Anchor: Direct Inviter's Oldest Avatar (Personal Root)
     * 2. If no inviter or full, fallback to Global Root and search down.
     */
    static async placeAvatar(
        newAvatar: IAvatar,
        referrerId?: mongoose.Types.ObjectId
    ): Promise<{ parent: IAvatar | null }> {
        let parentAvatar: IAvatar | null = null;
        let anchorAvatar: IAvatar | null = null;

        // 1. Determine Anchor (Where to start searching)
        if (referrerId) {
            // Find Referrer's "Root" avatar for this type (Oldest one)
            // This defines their sub-matrix.
            anchorAvatar = await Avatar.findOne({
                owner: referrerId,
                type: newAvatar.type,
                isActive: true
            }).sort({ createdAt: 1 });
        }

        // 2. Search under Anchor
        if (anchorAvatar) {
            parentAvatar = await this.findFirstEmptySlotBFS(anchorAvatar._id as mongoose.Types.ObjectId, newAvatar.type);
        }

        // 3. Fallback: Search under Global Root (Spillover from very top)
        if (!parentAvatar) {
            // console.log(`[Matrix] No space under referrer ${referrerId}, searching from Global Root`);
            const globalRoot = await this.findGlobalRoot(newAvatar.type);

            // Critical Check: Prevent Self-Loop if this IS the Global Root (First Avatar)
            if (globalRoot && globalRoot._id.toString() !== newAvatar._id.toString()) {
                // Search BFS from Global Root
                parentAvatar = await this.findFirstEmptySlotBFS(globalRoot._id as mongoose.Types.ObjectId, newAvatar.type);
            }
        }

        // Link
        if (parentAvatar) {
            newAvatar.parent = parentAvatar._id;
            newAvatar.level = 0;
            parentAvatar.partners.push(newAvatar._id);
            await parentAvatar.save();
        } else {
            console.warn(`[Matrix] ORPHAN AVATAR! No parent found for ${newAvatar._id} (${newAvatar.type})`);
        }

        await newAvatar.save();
        return { parent: parentAvatar };
    }

    /**
     * Core Logic: Level Up Check
     * Triggered when:
     * 1. An avatar receives a new partner (Level 0 accumulation)
     * 2. A child avatar levels up (Level X accumulation)
     */
    static async checkLevelProgression(avatar: IAvatar, depth: number = 0): Promise<void> {
        if (depth > 10) return; // Recursion safety

        // Requirement: 3 Partners
        if (avatar.partners.length < 3) return;

        // Check if we have funds for NEXT level
        // Formula:
        // L0->1: Requires 3 * Level0_Value ($50) = $150. (Held in yellowBalance)
        // L1->2: Requires 3 * Level1_Transition_Value ($200 from child's L1 upgrade) ?

        // Wait. Let's trace the money.
        // Purchasing ($100) -> $50 Inviter, $50 to Parent (Yellow).
        // Parent collects 3 * $50 = $150.
        // Parent Check: Level 0. Balance $150. Req: $150. -> UPGRADE L0->L1.
        // Action L0->L1:
        //    Total $150.
        //    1/3 ($50) -> Inviter (Green).
        //    2/3 ($100) -> Upgrade Cost (Flows to *Matrix Parent*).

        // So `getRequiredBalance` matches `totalPot` needed for transition.
        const requiredBalance = this.getRequiredBalanceForLevel(avatar.type, avatar.level);

        if (avatar.yellowBalance < requiredBalance - 0.01) { // Float tolerance
            // Not enough funds yet. (Maybe waiting for 3rd partner to upgrade?)
            return;
        }

        console.log(`[Matrix] Level Up Trigger: Avatar ${avatar._id} L${avatar.level} -> L${avatar.level + 1}. Funds: ${avatar.yellowBalance}`);

        // Perform Upgrade
        const currentLevel = avatar.level;
        const nextLevel = currentLevel + 1;
        const totalPot = requiredBalance;

        // DEDUCT FUNDS NOW
        avatar.yellowBalance -= totalPot;

        // Level 5 Completion Check
        if (nextLevel === 5) {
            // 4->5: 100% to Owner.
            const owner = await User.findById(avatar.owner);
            if (owner) {
                await WalletService.deposit(
                    owner._id,
                    Currency.GREEN,
                    totalPot,
                    `Matrix Completed! Level 5 Bonus for ${avatar.type}`,
                    TransactionType.AVATAR_BONUS
                );
            }
            avatar.level = 5;
            avatar.isClosed = true;
            await avatar.save();
            return;
        }

        // Standard Transition (0->1 ... 3->4)
        // 1/3 Green to Inviter
        // 2/3 Yellow to Matrix Parent
        const inviterBonus = totalPot / 3;
        const upgradeCost = (totalPot * 2) / 3;

        // 1. Pay Inviter
        const ownerUser = await User.findById(avatar.owner);
        if (ownerUser && ownerUser.referrer) {
            const referrer = await User.findById(ownerUser.referrer);
            if (referrer) {
                // Check active status
                if (await this.hasActiveSubscription(referrer._id)) {
                    await WalletService.deposit(
                        referrer._id,
                        Currency.GREEN,
                        inviterBonus,
                        `Level Bonus: ${ownerUser.username} reached L${nextLevel}`,
                        TransactionType.AVATAR_BONUS
                    );
                    // Notification could go here
                }
            }
        }

        // 2. Pay Matrix Parent (The "Upgrade Cost")
        if (avatar.parent) {
            const matrixParent = await Avatar.findById(avatar.parent);
            if (matrixParent) {
                // Add to Yellow Balance
                matrixParent.yellowBalance = (matrixParent.yellowBalance || 0) + upgradeCost;
                await matrixParent.save();

                // Credit Log?
                /* await Transaction.create({ ... }) optional debug log */

                // RECURSIVE CHECK: Parent might now have enough to upgrade!
                // Parent needs this payment from 3 children.
                await this.checkLevelProgression(matrixParent, depth + 1);
            }
        }

        // 3. Update Avatar State
        avatar.level = nextLevel;
        avatar.lastLevelUpAt = new Date();
        await avatar.save();

        // Log Transition
        await LevelTransition.create({
            avatar: avatar._id,
            fromLevel: currentLevel,
            toLevel: nextLevel,
            referrerBonus: inviterBonus,
            yellowBonusSent: upgradeCost
        });
    }

    /**
     * Helpers
     */
    static getRequiredBalanceForLevel(type: AvatarType, currentLevel: number): number {
        const config = AVATAR_CONFIG[type];
        // Base Entry Value into Matrix = 50% of Cost
        const baseValue = config.cost / 2;

        // Formula: 3 * (Entry Value * 2^Level) ?
        // L0->1: Need 3 * $50 = $150. (Pot) -> $50 Ref, $100 Upgrade.
        // L1->2: Next level receives $100 per child. Need 3 * $100 = $300.
        //        Split: $100 Ref, $200 Upgrade.
        // L2->3: Receives $200. Need 3 * $200 = $600.
        //        Split: $200 Ref, $400 Upgrade.

        // Pattern: Required = 3 * baseValue * (2^currentLevel)
        // L0: 3 * 50 * 1 = 150.
        // L1: 3 * 50 * 2 = 300.
        return 3 * baseValue * Math.pow(2, currentLevel);
    }


    /**
     * Entry Point: Purchase
     */
    static async purchaseAvatar(userId: mongoose.Types.ObjectId, type: AvatarType): Promise<any> {
        const config = AVATAR_CONFIG[type];
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Check Limit
        if (type === AvatarType.PREMIUM && !(await this.checkPremiumLimit())) {
            throw new Error('Premium limit reached');
        }

        // Charge Green Wallet
        await WalletService.charge(userId, Currency.GREEN, config.cost, `Purchase ${type}`);

        // 1. Immediate 50% Bonus to Direct Inviter
        const halfCost = config.cost / 2;
        let referrerBonusSent = 0;
        let referrerId: mongoose.Types.ObjectId | undefined;

        if (user.referrer) {
            const referrer = await User.findById(user.referrer);
            if (referrer && await this.hasActiveSubscription(referrer._id)) {
                await WalletService.deposit(
                    referrer._id,
                    Currency.GREEN,
                    halfCost,
                    `Direct Bonus: ${user.username} bought ${type}`,
                    TransactionType.AVATAR_BONUS
                );
                referrerBonusSent = halfCost;
                referrerId = referrer._id;
            }
        }

        // Create Avatar
        const avatar = new Avatar({
            owner: userId,
            type,
            cost: config.cost,
            level: 0,
            yellowBalance: 0,
            isActive: true,
            subscriptionExpires: config.subscriptionMonths ?
                new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * config.subscriptionMonths) : null
        });

        // Place (Global Hungry Logic)
        const { parent } = await this.placeAvatar(avatar, user.referrer);

        let parentBonusSent = 0;
        let parentOwnerId: mongoose.Types.ObjectId | undefined;

        // 2. Feed Matrix Parent (Remaining 50% Value)
        if (parent) {
            parent.yellowBalance = (parent.yellowBalance || 0) + halfCost;
            await parent.save();
            parentBonusSent = halfCost;

            // Log for Parent Owner
            const parentOwner = await User.findById(parent.owner);
            if (parentOwner) {
                parentOwnerId = parentOwner._id;
                await Transaction.create({
                    user: parentOwner._id, // User ID
                    amount: halfCost,
                    currency: 'YELLOW',
                    type: TransactionType.AVATAR_BONUS,
                    description: `Yellow bonus: ${type} placed by ${user.username}`
                });
            }

            // Trigger Chain Reaction
            await this.checkLevelProgression(parent);
        }

        // Log Purchase
        await AvatarPurchase.create({
            buyer: userId,
            avatarId: avatar._id,
            type,
            cost: config.cost,
            parentAvatarId: parent?._id,
            referrerBonus: referrerBonusSent,
            referrerId,
            parentBonus: parentBonusSent,
            parentOwnerId
        });

        return { success: true, avatar };
    }
}
