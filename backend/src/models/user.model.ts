import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    telegram_id?: number;
    referralBalance: number; // Green (Legacy)
    balanceRed: number;      // Red
    greenBalance?: number;   // Green (Partnership)
    yellowBalance?: number;  // Yellow (Partnership)
    referralsCount: number;
    referredBy?: string;
    authCode?: string;
    authCodeExpires?: Date;
    createdAt: Date;
    wins: { type: Number, default: 0 };
    rating: { type: Number, default: 1000 };
    isMaster?: { type: Boolean, default: false };
    masterExpiresAt?: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Telegram users
    first_name: { type: String },
    last_name: { type: String },
    photo_url: { type: String },
    telegram_id: { type: Number, unique: true, sparse: true },
    referralBalance: { type: Number, default: 0 }, // GREEN Balance (Real Money)
    balanceRed: { type: Number, default: 0 },      // RED Balance (Game Only)
    // Partnership Balances (Shared with Partnership Backend)
    greenBalance: { type: Number, default: 0 },
    yellowBalance: { type: Number, default: 0 },

    referralsCount: { type: Number, default: 0 },
    referredBy: { type: String }, // Store referrer's username or ID
    authCode: { type: String },
    authCodeExpires: { type: Date },
    wins: { type: Number, default: 0 },
    rating: { type: Number, default: 1000 },
    isMaster: { type: Boolean, default: false },
    masterExpiresAt: { type: Date },
    preferences: {
        dream: String,
        token: String,
        displayName: String
    }
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
