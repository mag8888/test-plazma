import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
    text: string;
    image?: string;
    delayMinutes: number; // For drip: delay from start/trigger. For one-time: 0.
}

export interface ICampaign extends Document {
    name: string;
    type: 'BROADCAST' | 'DRIP';
    trigger: 'MANUAL' | 'SCHEDULED' | 'REGISTRATION';
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
    startTime?: Date; // For Scheduled Broadcasts
    messages: IMessage[];
    targetFilter?: {
        isMaster?: boolean;
        hasPlayed?: boolean;
        minBalance?: number;
    };
    stats: {
        sentCount: number;
        clickCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema: Schema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['BROADCAST', 'DRIP'], required: true },
    trigger: { type: String, enum: ['MANUAL', 'SCHEDULED', 'REGISTRATION'], default: 'MANUAL' },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'], default: 'DRAFT' },
    startTime: { type: Date },
    messages: [{
        text: { type: String, required: true },
        image: { type: String },
        delayMinutes: { type: Number, default: 0 }
    }],
    targetFilter: {
        isMaster: { type: Boolean },
        hasPlayed: { type: Boolean },
        minBalance: { type: Number }
    },
    stats: {
        sentCount: { type: Number, default: 0 },
        clickCount: { type: Number, default: 0 }
    }
}, { timestamps: true });

export const CampaignModel = mongoose.model<ICampaign>('Campaign', CampaignSchema);
