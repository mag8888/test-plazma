
import mongoose, { Schema, Document } from 'mongoose';

export enum DepositStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export enum DepositMethod {
    USDT_BEP20 = 'USDT_BEP20',
    USDT_TRC20 = 'USDT_TRC20',
    SBER_RUB = 'SBER_RUB'
}

export interface IDepositRequest extends Document {
    userId: string;
    amount: number;         // Amount in USD (or target currency value)
    currency: string;       // 'USD' or 'RUB'
    method: DepositMethod;
    status: DepositStatus;
    proofUrl?: string;
    adminComment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DepositRequestSchema = new Schema({
    userId: { type: String, required: true, index: true }, // Telegram ID (string) or MongoID depending on system usage
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String, enum: Object.values(DepositMethod), required: true },
    status: { type: String, enum: Object.values(DepositStatus), default: DepositStatus.PENDING, index: true },
    proofUrl: { type: String },
    adminComment: { type: String }
}, {
    timestamps: true
});

export const DepositRequest = mongoose.model<IDepositRequest>('DepositRequest', DepositRequestSchema);
