import mongoose, { Document, Schema } from 'mongoose';

export interface ILevelTransition extends Document {
    avatar: mongoose.Types.ObjectId;
    fromLevel: number;
    toLevel: number;
    yellowBonusSent: number; // Total yellow bonus generated
    referrerBonus: number; // Green bonus paid to referrer
    ownerPayout: number; // For level 5 closure
    createdAt: Date;
}

const LevelTransitionSchema: Schema = new Schema({
    avatar: { type: Schema.Types.ObjectId, ref: 'Avatar', required: true },
    fromLevel: { type: Number, required: true },
    toLevel: { type: Number, required: true },
    yellowBonusSent: { type: Number, required: true },
    referrerBonus: { type: Number, default: 0 },
    ownerPayout: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export const LevelTransition = mongoose.model<ILevelTransition>('LevelTransition', LevelTransitionSchema);
