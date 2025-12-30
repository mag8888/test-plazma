import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number;
    currency: 'RED' | 'GREEN';
    type: 'REFERRAL' | 'GAME_FEE' | 'GAME_REFUND' | 'TRANSFER' | 'DEPOSIT';
    description?: string;
    relatedUserId?: mongoose.Types.ObjectId; // For referrals
    createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['RED', 'GREEN'], required: true },
    type: { type: String, enum: ['REFERRAL', 'GAME_FEE', 'GAME_REFUND', 'TRANSFER', 'DEPOSIT'], required: true },
    description: { type: String },
    relatedUserId: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const TransactionModel = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
