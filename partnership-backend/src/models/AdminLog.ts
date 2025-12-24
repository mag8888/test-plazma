import mongoose, { Document, Schema } from 'mongoose';

export enum AdminActionType {
    BALANCE_CHANGE = 'BALANCE_CHANGE',
    REFERRER_CHANGE = 'REFERRER_CHANGE',
    OTHER = 'OTHER'
}

export interface IAdminLog extends Document {
    adminName: string;
    action: AdminActionType;
    targetUser?: mongoose.Types.ObjectId;
    details: string; // JSON string or text description
    createdAt: Date;
}

const AdminLogSchema: Schema = new Schema({
    adminName: { type: String, required: true },
    action: { type: String, enum: Object.values(AdminActionType), required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
    details: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const AdminLog = mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);
