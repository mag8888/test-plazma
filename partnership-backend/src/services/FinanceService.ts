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

    static async processWithdrawal(userId: string, amount: number) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Check balance
        if (user.greenBalance < amount) throw new Error('Insufficient green balance');

        // Simple withdrawal - no tariff-based limits for now
        // TODO: Implement withdrawal limits based on avatar tier
        const payout = amount * 0.7; // 70% payout, 30% commission
        const commission = amount - payout;

        user.greenBalance -= amount;
        await user.save();

        await Transaction.create({
            user: userId,
            amount: -amount,
            type: TransactionType.WITHDRAWAL,
            description: `Withdrawal: ${amount}. Payout: ${payout}. Commission: ${commission}`
        });

        return { payout, commission };
    }
}
