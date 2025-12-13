import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer {
    id: string; // Socket ID or User ID
    name: string;
    isReady: boolean;
    dream?: string;
    token?: string;
    userId?: string; // Link to registered user
    professionName?: string; // Assigned at game start
    isBankrupted?: boolean;
}

export interface IRoom extends Document {
    name: string;
    creatorId: string;
    maxPlayers: number;
    timer: number;
    password?: string;
    status: 'waiting' | 'playing' | 'finished';
    players: IPlayer[];
    createdAt: Date;
    updatedAt: Date;
    gameState?: any;
}

const RoomSchema: Schema = new Schema({
    name: { type: String, required: true },
    creatorId: { type: String, required: true },
    maxPlayers: { type: Number, default: 4 },
    timer: { type: Number, default: 60 },
    password: { type: String },
    status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
    gameState: { type: Schema.Types.Mixed },
    players: [{
        id: String,
        name: String,
        isReady: { type: Boolean, default: false },
        dream: String,
        token: String,
        userId: String,
        isBankrupted: { type: Boolean, default: false }
    }],
    createdAt: { type: Date, expires: '12h', default: Date.now }
}, { timestamps: true });

// Prevent multiple waiting rooms for the same creator
RoomSchema.index({ creatorId: 1 }, { unique: true, partialFilterExpression: { status: 'waiting' } });

// Virtual to populate ID properly if needed, but _id is standard
export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
