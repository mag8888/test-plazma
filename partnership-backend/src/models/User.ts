import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    telegramId: string;
    username?: string;
    greenBalance: number;
    yellowBalance: number;
    referrer?: mongoose.Types.ObjectId; // Ref to User
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    telegramId: { type: String, required: true, unique: true },
    username: { type: String },
    greenBalance: { type: Number, default: 0 },
    yellowBalance: { type: Number, default: 0 },
    referrer: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);
