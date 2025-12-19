import mongoose, { Document, Schema } from 'mongoose';

export enum TariffType {
    GUEST = 'GUEST', // 0$
    PLAYER = 'PLAYER', // 20$
    MASTER = 'MASTER', // 100$
    PARTNER = 'PARTNER' // 1000$
}

export interface IAvatar extends Document {
    owner: mongoose.Types.ObjectId;
    tariff: TariffType;
    parent?: mongoose.Types.ObjectId; // Ref to Avatar
    partners: mongoose.Types.ObjectId[]; // Ref to Avatars
    level: number;
    isActive: boolean;
    createdAt: Date;
    // Helper to check if level 5 closed
    isLevel5Closed: boolean;
}

const AvatarSchema: Schema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tariff: { type: String, enum: Object.values(TariffType), required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Avatar' },
    partners: [{ type: Schema.Types.ObjectId, ref: 'Avatar' }], // Max 3
    level: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isLevel5Closed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export const Avatar = mongoose.model<IAvatar>('Avatar', AvatarSchema);
