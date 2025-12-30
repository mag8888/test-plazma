
import mongoose, { Schema, Document } from 'mongoose';

export interface ICard extends Document {
    id: string; // Internal ID (e.g. e21)
    type: 'MARKET' | 'EXPENSE' | 'DEAL_SMALL' | 'DEAL_BIG' | 'BUSINESS' | 'DREAM';
    title: string;
    description: string;
    cost?: number;
    cashflow?: number;
    price?: number;
    downPayment?: number;
    liability?: number; // Mortgage
    roi?: number;
    symbol?: string; // For stocks
    mandatory?: boolean;
    // Market specific
    action?: 'OFFER';
    targetTitle?: string;
    offerPrice?: number;
    businessType?: 'CLASSIC' | 'NETWORK';
    subtype?: 'MLM_ROLL' | 'CHARITY_ROLL';
    assetType?: 'REAL_ESTATE' | 'BUSINESS' | 'STOCK' | 'OTHER';
    maxQuantity?: number;
    outcomeDescription?: string;
    displayId?: number; // Visual ID (e.g. No 1) used in Admin Panel
}

const CardSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    cost: { type: Number },
    cashflow: { type: Number },
    price: { type: Number },
    downPayment: { type: Number },
    liability: { type: Number },
    roi: { type: Number },
    symbol: { type: String },
    mandatory: { type: Boolean },
    action: { type: String },
    targetTitle: { type: String },
    offerPrice: { type: Number },
    businessType: { type: String },
    subtype: { type: String },
    assetType: { type: String },
    maxQuantity: { type: Number },
    outcomeDescription: { type: String },
    displayId: { type: Number }
}, { timestamps: true });

export const CardModel = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);
