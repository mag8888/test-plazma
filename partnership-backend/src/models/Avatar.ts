import mongoose, { Document, Schema } from 'mongoose';

export enum AvatarType {
    BASIC = 'BASIC',       // $20 - 1 month subscription
    ADVANCED = 'ADVANCED', // $100 - 1 year subscription
    PREMIUM = 'PREMIUM'    // $1000 - lifetime subscription (max 25)
}

export interface IAvatar extends Document {
    owner: mongoose.Types.ObjectId;
    type: AvatarType;
    cost: number; // Purchase price
    parent?: mongoose.Types.ObjectId; // Ref to Avatar (same type only)
    partners: mongoose.Types.ObjectId[]; // Ref to Avatars (max 3)
    level: number;
    subscriptionExpires?: Date; // null = lifetime (PREMIUM)
    isActive: boolean;

    // Level progression tracking
    yellowBalance: number; // Accumulated funds for next level
    lastLevelUpAt?: Date; // Timestamp of last level transition
    isClosed: boolean; // True when level 5 reached

    createdAt: Date;
}

const AvatarSchema: Schema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(AvatarType), required: true },
    cost: { type: Number, required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Avatar' },
    partners: [{ type: Schema.Types.ObjectId, ref: 'Avatar' }], // Max 3
    level: { type: Number, default: 0 }, // Start at 0
    subscriptionExpires: { type: Date }, // null for PREMIUM
    isActive: { type: Boolean, default: true },

    // Level progression
    yellowBalance: { type: Number, default: 0 }, // Accumulated funds for next level
    lastLevelUpAt: { type: Date },
    isClosed: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
AvatarSchema.index({ owner: 1, type: 1 });
AvatarSchema.index({ type: 1, isActive: 1 });
AvatarSchema.index({ parent: 1 });

export const Avatar = mongoose.model<IAvatar>('Avatar', AvatarSchema);
