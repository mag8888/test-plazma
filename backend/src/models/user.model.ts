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
    referrer?: mongoose.Types.ObjectId; // Reference to User
    authCode?: string;
    authCodeExpires?: Date;
    createdAt: Date;
    wins: { type: Number, default: 0 };
    gamesPlayed: { type: Number, default: 0 };
    rating: { type: Number, default: 0 };
    isMaster?: { type: Boolean, default: false };
    masterExpiresAt?: Date;
    language?: 'ru' | 'en' | 'tr' | 'ar';
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Telegram users
    first_name: { type: String },
    last_name: { type: String },
    photo_url: { type: String },
    telegram_id: { type: Number, unique: true, sparse: true },
    referralBalance: { type: Number, default: 0 }, // DEPRECATED - Migrated to Green Balance in Partnership Service
    balanceRed: { type: Number, default: 0 },      // DEPRECATED - Managed by Partnership Service (Wallet)
    // Partnership Balances (Shared with Partnership Backend)
    greenBalance: { type: Number, default: 0 },
    yellowBalance: { type: Number, default: 0 },

    referralsCount: { type: Number, default: 0 },
    referredBy: { type: String }, // Store referrer's username or ID
    referrer: { type: Schema.Types.ObjectId, ref: 'User' }, // Better: ObjectId reference
    authCode: { type: String },
    authCodeExpires: { type: Date },
    wins: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    isMaster: { type: Boolean, default: false },
    masterExpiresAt: { type: Date },
    language: { type: String, default: 'ru' },
    preferences: {
        dream: String,
        token: String,
        displayName: String
    }
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
