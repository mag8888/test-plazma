import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduledGame extends Document {
    hostId: string; // User ID of the Master
    startTime: Date;
    price: number;
    maxPlayers: number;
    promoSpots: number;
    participants: {
        userId: string;
        username: string; // Cache for display
        type: 'PROMO' | 'PAID' | 'ONSITE';
        paymentStatus?: 'PAID' | 'PAY_AT_GAME';
        joinedAt: Date;
    }[];
    description?: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    createdAt: Date;
}

const ScheduledGameSchema: Schema = new Schema({
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    price: { type: Number, default: 20 },
    description: { type: String, maxlength: 500 },
    maxPlayers: { type: Number, required: true, default: 8 },
    promoSpots: { type: Number, required: true, default: 6 },
    participants: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        firstName: { type: String },
        username: { type: String },
        type: { type: String, enum: ['PROMO', 'PAID', 'ONSITE'] },
        paymentStatus: { type: String, enum: ['PAID', 'PAY_AT_GAME'], default: 'PAID' },
        joinedAt: { type: Date, default: Date.now },
        postLink: { type: String },
        isVerified: { type: Boolean, default: false },
        lastReminderSentAt: { type: Date }
    }],
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
    reminder24hSent: { type: Boolean, default: false },
    reminder30mSent: { type: Boolean, default: false },
    reminderStartSent: { type: Boolean, default: false }
}, { timestamps: true });

export const ScheduledGameModel = mongoose.models.ScheduledGame || mongoose.model<IScheduledGame>('ScheduledGame', ScheduledGameSchema);
