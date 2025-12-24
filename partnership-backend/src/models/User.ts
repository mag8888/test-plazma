import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    greenBalance: number;
    yellowBalance: number;
    balanceRed: number;
    referrer?: mongoose.Types.ObjectId; // Ref to User
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    telegram_id: { type: Number, required: true, unique: true },
    username: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    greenBalance: { type: Number, default: 0 },
    yellowBalance: { type: Number, default: 0 },
    balanceRed: { type: Number, default: 0 }, // Game Balance
    referrer: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);
