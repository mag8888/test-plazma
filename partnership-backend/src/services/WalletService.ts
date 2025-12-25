import { User } from '../models/User';
import { Transaction, TransactionType } from '../models/Transaction';
import mongoose from 'mongoose';

export enum Currency {
    GREEN = 'greenBalance',
    YELLOW = 'yellowBalance',
    RED = 'balanceRed'
}

export class WalletService {

    /**
     * Atomically charge user balance.
     * Throws error if insufficient funds.
     */
    static async charge(userId: string | mongoose.Types.ObjectId, currency: Currency, amount: number, description: string): Promise<number> {
        if (amount <= 0) throw new Error('Amount must be positive');

        // Atomic check and update
        const user = await User.findOneAndUpdate(
            {
                _id: userId,
                [currency]: { $gte: amount }
            },
            { $inc: { [currency]: -amount } },
            { new: true }
        );

        if (!user) {
            // Check if user exists to give better error
            const exists = await User.exists({ _id: userId });
            if (!exists) throw new Error('User not found');
            throw new Error(`Insufficient ${currency} balance`);
        }

        // Log Transaction
        await Transaction.create({
            user: userId,
            amount: -amount,
            type: TransactionType.GAME_FEE, // Generic type, maybe refine later
            description: description,
            currency: currency
        });

        return (user as any)[currency];
    }

    /**
     * Atomically deposit to user balance.
     */
    static async deposit(userId: string | mongoose.Types.ObjectId, currency: Currency, amount: number, description: string, type: TransactionType = TransactionType.DEPOSIT): Promise<number> {
        if (amount <= 0) throw new Error('Amount must be positive');

        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { [currency]: amount } },
            { new: true }
        );

        if (!user) throw new Error('User not found');

        // Log Transaction
        await Transaction.create({
            user: userId,
            amount: amount,
            type: type,
            description: description,
            currency: currency
        });

        return (user as any)[currency];
    }

    /**
     * Get user balances
     */
    static async getBalances(userId: string | mongoose.Types.ObjectId) {
        const user = await User.findById(userId).select('greenBalance yellowBalance balanceRed referralBalance');
        if (!user) throw new Error('User not found');

        return {
            green: user.greenBalance || 0,
            yellow: user.yellowBalance || 0,
            red: user.balanceRed || 0,
            referral: user.referralBalance || 0 // Legacy
        };
    }
}
