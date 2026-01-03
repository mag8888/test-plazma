import { User } from '../models/User';
import { Avatar, AvatarType } from '../models/Avatar';
import { Transaction, TransactionType } from '../models/Transaction';

// DEPRECATED - Old finance service, use MatrixService instead for new avatar logic
export class FinanceService {

    // Comment out old service methods - use MatrixService for all new avatar logic
    static async distributePayment(amount: number, userId: string, referrerId?: string) {
        // DEPRECATED - use MatrixService.purchaseAvatar instead
        return { success: false, error: 'Use MatrixService.purchase Avatar instead' };
    }

    static async payoutLevel5(avatar: any) {
        // DEPRECATED - use MatrixService.checkLevelProgression instead
        return;
    }

    static async processWithdrawal(userId: string, amount: number, walletAddress: string) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Check balance
        if ((user.greenBalance || 0) < amount) throw new Error('Insufficient green balance');

        // Determine Commission based on Best Active Avatar
        // Logic should match UI:
        // Guest: 30% (Comm 70%)
        // Player/Basic: 50% (Comm 50%)
        // Master/Advanced: 60% (Comm 40%)
        // Partner/Premium: 80% (Comm 20%)

        const bestAvatar = await Avatar.findOne({ owner: user._id, isActive: true }).sort({ cost: -1 });
        let commissionRate = 0.7; // Guest

        if (bestAvatar) {
            if (bestAvatar.type === AvatarType.BASIC) commissionRate = 0.5;
            if (bestAvatar.type === AvatarType.ADVANCED) commissionRate = 0.4;
            if (bestAvatar.type === AvatarType.PREMIUM) commissionRate = 0.2;
        }

        const commission = amount * commissionRate;
        const payout = amount - commission;

        user.greenBalance -= amount;
        await user.save();

        await Transaction.create({
            user: userId,
            amount: -amount,
            type: TransactionType.WITHDRAWAL,
            description: `Withdrawal to ${walletAddress}. Payout: ${payout.toFixed(2)}. Commission: ${commission.toFixed(2)} (${commissionRate * 100}%)`
        });

        // NOTIFY ADMIN
        // Use a configured Admin Chat ID
        const ADMIN_CHAT_ID = process.env.ADMIN_TEL_ID || '6840451873'; // Fallback to developer for now?
        if (ADMIN_CHAT_ID) {
            const msg = `💸 <b>New Withdrawal Request</b>\n` +
                `User: @${user.username} (ID: <code>${user.telegram_id}</code>)\n` +
                `Amount: <b>$${amount}</b>\n` +
                `Wallet (BEP20): <code>${walletAddress}</code>\n` +
                `Payout: $${payout.toFixed(2)}\n` +
                `Commission: ${commissionRate * 100}%\n` +
                `Tariff: ${bestAvatar ? bestAvatar.type : 'GUEST'}`;

            // We need to import NotificationService here.
            // But circular dependency check? NotificationService depends on nothing. Safe.
            const { NotificationService } = require('./NotificationService');
            await NotificationService.sendTelegramMessage(ADMIN_CHAT_ID, msg);
        }

        return { payout, commission, walletAddress };
    }
}
