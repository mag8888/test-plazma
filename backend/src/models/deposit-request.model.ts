import mongoose, { Schema, Document } from 'mongoose';

export interface IDepositRequest extends Document {
    userId: string;
    user?: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    method?: string;
    proofUrl?: string;
    status: string;
    adminComment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DepositRequestSchema: Schema = new Schema({
    userId: { type: String, required: true }, // Aligned with Partnership-Backend
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional legacy/alternative
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String }, // Added to match
    proofUrl: { type: String }, // Made optional
    status: { type: String, default: 'PENDING' },
    adminComment: { type: String }
}, { timestamps: true });

export const DepositRequestModel = mongoose.models.DepositRequest || mongoose.model<IDepositRequest>('DepositRequest', DepositRequestSchema);
