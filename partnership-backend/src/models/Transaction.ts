import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
    PURCHASE_TARIFF = 'PURCHASE_TARIFF',
    BONUS_GREEN = 'BONUS_GREEN', // 50% referral bonus
    BONUS_YELLOW = 'BONUS_YELLOW', // 50% to yellow pool
    LEVEL_UP_REWARD = 'LEVEL_UP_REWARD', // 5th level close
    WITHDRAWAL = 'WITHDRAWAL',
    ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
    AVATAR_BONUS = 'AVATAR_BONUS', // Avatar matrix bonuses
    GAME_FEE = 'GAME_FEE',
    DEPOSIT = 'DEPOSIT'
}

export interface ITransaction extends Document {
    user: mongoose.Types.ObjectId;
    amount: number;
    currency: string; // Added for compatibility
    type: TransactionType;
    description?: string;
    createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
