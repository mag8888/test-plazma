import mongoose, { Schema, Document } from 'mongoose';

export interface IDepositRequest extends Document {
    user: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    proofUrl: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminComment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DepositRequestSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    proofUrl: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    adminComment: { type: String }
}, { timestamps: true });

export const DepositRequestModel = mongoose.models.DepositRequest || mongoose.model<IDepositRequest>('DepositRequest', DepositRequestSchema);
