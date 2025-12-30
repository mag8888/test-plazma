import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    // Core fields
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    password?: string; // For non-Telegram users

    // Balances
    greenBalance: number;
    yellowBalance: number;
    balanceRed: number;
    referralBalance: number; // Legacy from Game Backend

    // Game data
    rating: number;
    wins: number;
    gamesPlayed: number;
    isMaster?: boolean;
    masterExpiresAt?: Date;

    // Referrals
    referredBy?: string; // Legacy string referrer
    referrer?: mongoose.Types.ObjectId; // Better: ref to User
    referralsCount: number;

    // Auth
    authCode?: string;
    authCodeExpires?: Date;

    // Game preferences
    preferences?: {
        dream?: string;
        token?: string;
        displayName?: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    telegram_id: { type: Number, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    first_name: { type: String },
    last_name: { type: String },
    photo_url: { type: String },
    password: { type: String },

    // Balances
    greenBalance: { type: Number, default: 0 },
    yellowBalance: { type: Number, default: 0 },
    balanceRed: { type: Number, default: 0 },
    referralBalance: { type: Number, default: 0 },

    // Game data
    rating: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    isMaster: { type: Boolean, default: false },
    masterExpiresAt: { type: Date },

    // Referrals
    referredBy: { type: String },
    referrer: { type: Schema.Types.ObjectId, ref: 'User' },
    referralsCount: { type: Number, default: 0 },

    // Auth
    authCode: { type: String },
    authCodeExpires: { type: Date },

    // Game preferences
    preferences: {
        dream: String,
        token: String,
        displayName: String
    }
}
}, { timestamps: true });

// Indexes for High Performance
UserSchema.index({ referrer: 1 }); // Critical for "Get Partners" queries
UserSchema.index({ telegram_id: 1 }); // Ensure fast login lookups

export const User = mongoose.model<IUser>('User', UserSchema);
