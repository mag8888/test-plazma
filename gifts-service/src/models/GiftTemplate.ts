import mongoose, { Document, Schema } from 'mongoose';

export interface IGiftItem {
    type: 'AVATAR' | 'BALANCE_GREEN' | 'BALANCE_RED' | 'GIFT_BOX';
    value: string | number; // e.g., 'PREMIUM' or 1000
    weight: number; // Probability weight
}

export interface IGiftTemplate extends Document {
    slug: string;
    name: string;
    description: string;
    imageUrl: string;
    price: number;
    currency: 'RED' | 'GREEN' | 'TON';
    isSecret: boolean; // true = Random Roll, false = Bundle
    items: IGiftItem[];
    isActive: boolean;
    createdAt: Date;
}

const GiftTemplateSchema: Schema = new Schema({
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, enum: ['RED', 'GREEN', 'TON'], required: true },
    isSecret: { type: Boolean, default: false },
    items: [
        {
            type: { type: String, enum: ['AVATAR', 'BALANCE_GREEN', 'BALANCE_RED', 'GIFT_BOX'], required: true },
            value: { type: Schema.Types.Mixed, required: true },
            weight: { type: Number, required: true }
        }
    ],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

export const GiftTemplate = mongoose.model<IGiftTemplate>('GiftTemplate', GiftTemplateSchema);
