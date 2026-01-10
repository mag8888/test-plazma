import mongoose, { Document, Schema } from 'mongoose';

export interface IGiftInventory extends Document {
    userId: mongoose.Types.ObjectId;
    templateId: mongoose.Types.ObjectId; // Ref to GiftTemplate
    status: 'CLOSED' | 'OPENED';
    acquiredAt: Date;
    openedAt?: Date;
    reward?: string; // Snapshot of what was received (JSON stringified or specific format)
}

const GiftInventorySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'GiftTemplate', required: true },
    status: { type: String, enum: ['CLOSED', 'OPENED'], default: 'CLOSED' },
    acquiredAt: { type: Date, default: Date.now },
    openedAt: { type: Date },
    reward: { type: String } // Simplified for now
});

GiftInventorySchema.index({ userId: 1, status: 1 });

export const GiftInventory = mongoose.model<IGiftInventory>('GiftInventory', GiftInventorySchema);
