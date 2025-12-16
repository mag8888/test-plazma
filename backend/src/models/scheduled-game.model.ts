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
        type: 'PROMO' | 'PAID';
        joinedAt: Date;
    }[];
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    createdAt: Date;
}

const ScheduledGameSchema: Schema = new Schema({
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    price: { type: Number, default: 20 },
    maxPlayers: { type: Number, required: true, default: 8 },
    promoSpots: { type: Number, required: true, default: 6 },
    participants: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        type: { type: String, enum: ['PROMO', 'PAID'] },
        joinedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' }
}, { timestamps: true });

export const ScheduledGameModel = mongoose.models.ScheduledGame || mongoose.model<IScheduledGame>('ScheduledGame', ScheduledGameSchema);
