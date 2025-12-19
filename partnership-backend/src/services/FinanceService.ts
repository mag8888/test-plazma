import { User } from '../models/User';
import { Avatar, IAvatar, TariffType } from '../models/Avatar';
import { Transaction, TransactionType } from '../models/Transaction';

const TARIFF_PRICES = {
    [TariffType.GUEST]: 0,
    [TariffType.PLAYER]: 20,
    [TariffType.MASTER]: 100,
    [TariffType.PARTNER]: 1000
};

const LEVEL_5_PAYOUTS = {
    [TariffType.GUEST]: 0,
    [TariffType.PLAYER]: 480,
    [TariffType.MASTER]: 2400,
    [TariffType.PARTNER]: 24000
};

const WITHDRAWAL_LIMITS = {
    [TariffType.GUEST]: 0.3, // Only on win
    [TariffType.PLAYER]: 0.5,
    [TariffType.MASTER]: 0.6,
    [TariffType.PARTNER]: 0.8
};

export class FinanceService {

    static async distributePayment(amount: number, payerId: string, referrerId?: string) {
        if (!referrerId) return; // No referrer, money stays in system (Admin)

        const referrer = await User.findById(referrerId);
        if (!referrer) return;

        // 50% to Green
        const greenShare = amount * 0.5;
        // 50% to Yellow (Bonus Pool)
        const yellowShare = amount * 0.5;

        // Update Referrer
        referrer.greenBalance += greenShare;
        referrer.yellowBalance += yellowShare; // Accumulate as per spec? "Accumulates inside structure"
        await referrer.save();

        // Create Transactions
        await Transaction.create({
            user: referrerId,
            amount: greenShare,
            type: TransactionType.BONUS_GREEN,
            description: `Referral bonus from user ${payerId}`
        });

        await Transaction.create({
            user: referrerId,
            amount: yellowShare,
            type: TransactionType.BONUS_YELLOW,
            description: `Yellow bonus from user ${payerId}`
        });
    }

    static async payoutLevel5(avatar: IAvatar) {
        const owner = await User.findById(avatar.owner);
        if (!owner) return;

        const payoutAmount = LEVEL_5_PAYOUTS[avatar.tariff];

        if (payoutAmount > 0) {
            owner.greenBalance += payoutAmount;

            if (owner.yellowBalance >= payoutAmount) {
                owner.yellowBalance -= payoutAmount;
            } else {
                owner.yellowBalance = 0;
            }

            await owner.save();

            await Transaction.create({
                user: owner._id,
                amount: payoutAmount,
                type: TransactionType.LEVEL_UP_REWARD,
                description: `Level 5 Closed for Avatar ${avatar._id}`
            });
        }
    }

    static async processWithdrawal(userId: string, amount: number) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Check balance
        if (user.greenBalance < amount) throw new Error('Insufficient green balance');

        // Determine limit based on MAX tariff the user has
        const avatars = await Avatar.find({ owner: userId, isActive: true });

        // Find highest tariff value
        let maxLimit = 0.3; // Default GUEST

        avatars.forEach(avatar => {
            const limit = WITHDRAWAL_LIMITS[avatar.tariff];
            if (limit > maxLimit) maxLimit = limit;
        });

        // Calculate payout and commission
        const payout = amount * maxLimit;
        const commission = amount - payout;

        user.greenBalance -= amount;
        await user.save();

        await Transaction.create({
            user: userId,
            amount: -amount, // Total deducted
            type: TransactionType.WITHDRAWAL,
            description: `Withdrawal request: ${amount}. Payout: ${payout}. Comm: ${commission}`
        });

        return { payout, commission };
    }
}
