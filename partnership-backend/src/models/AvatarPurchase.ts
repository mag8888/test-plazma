import mongoose, { Document, Schema } from 'mongoose';

export interface IAvatarPurchase extends Document {
    buyer: mongoose.Types.ObjectId; // User who bought
    avatarId: mongoose.Types.ObjectId; // Created avatar
    type: string; // BASIC, ADVANCED, PREMIUM
    cost: number;

    // Bonus distribution
    referrerBonus: number; // Green bonus to referrer
    referrerId?: mongoose.Types.ObjectId; // Who got the green bonus

    parentBonus: number; // Yellow bonus to parent avatar owner
    parentAvatarId?: mongoose.Types.ObjectId; // Parent avatar in matrix
    parentOwnerId?: mongoose.Types.ObjectId; // Owner of parent avatar

    createdAt: Date;
}

const AvatarPurchaseSchema: Schema = new Schema({
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'Avatar', required: true },
    type: { type: String, required: true },
    cost: { type: Number, required: true },

    referrerBonus: { type: Number, default: 0 },
    referrerId: { type: Schema.Types.ObjectId, ref: 'User' },

    parentBonus: { type: Number, default: 0 },
    parentAvatarId: { type: Schema.Types.ObjectId, ref: 'Avatar' },
    parentOwnerId: { type: Schema.Types.ObjectId, ref: 'User' },

    createdAt: { type: Date, default: Date.now }
});

export const AvatarPurchase = mongoose.model<IAvatarPurchase>('AvatarPurchase', AvatarPurchaseSchema);
