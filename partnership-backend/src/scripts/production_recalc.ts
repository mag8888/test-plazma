
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';
import { MatrixService } from '../services/MatrixService';
import dotenv from 'dotenv';
dotenv.config();

// Live DB URL (from successful migration)
const LIVE_MONGO_URL = 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const run = async () => {
    console.log('🚀 Connecting to LIVE DB...');
    await mongoose.connect(LIVE_MONGO_URL, { dbName: 'moneo' });
    console.log('✅ Connected.');

    // 1. Rebuild Referrals
    console.log('\n🔄 Rebuilding User Referrals...');
    const allUsers = await User.find({});
    let repaired = 0;

    for (const user of allUsers) {
        if (!user.referredBy) continue;
        const cleanRef = user.referredBy.trim();
        const conditions: any[] = [{ username: new RegExp(`^${cleanRef}$`, 'i') }];
        const numRef = Number(cleanRef);
        if (!isNaN(numRef)) conditions.push({ telegram_id: numRef });

        const correctReferrer = await User.findOne({ $or: conditions });
        if (correctReferrer && correctReferrer._id.toString() !== user._id.toString()) {
            if (user.referrer?.toString() !== correctReferrer._id.toString()) {
                user.referrer = correctReferrer._id;
                await user.save();
                repaired++;
                process.stdout.write('.');
            }
        }
    }
    console.log(`\n✅ Linked ${repaired} users to correct referrers.`);

    // 2. Recalculate Matrix
    console.log('\n🔄 Recalculating Matrix (Avatars)...');

    // Reset
    await Avatar.updateMany(
        { isActive: true },
        {
            $set: {
                parent: null,
                partners: [],
                level: 0,
                yellowBalance: 0,
                isClosed: false,
                lastLevelUpAt: null
            }
        }
    );
    console.log('   Stats reset. Replaying...');

    const avatars = await Avatar.find({ isActive: true }).sort({ createdAt: 1 }).populate('owner');
    let processed = 0;

    for (const avatar of avatars) {
        try {
            const freshAvatar = await Avatar.findById(avatar._id);
            if (!freshAvatar) continue;

            const owner = avatar.owner as any;
            if (!owner) {
                console.log(`Skipping avatar ${avatar._id} - No owner`);
                continue;
            }

            const { parent } = await MatrixService.placeAvatar(freshAvatar, owner.referrer);

            if (parent) {
                const matrixValue = (freshAvatar.cost || 0) / 2;
                parent.yellowBalance = (parent.yellowBalance || 0) + matrixValue;
                await parent.save();
                await MatrixService.checkLevelProgression(parent, 0, true);
            }
            processed++;
            if (processed % 10 === 0) process.stdout.write('.');
        } catch (e) {
            console.error(`Err av ${avatar._id}:`, e);
        }
    }

    console.log(`\n✅ Matrix Recalculated. Processed ${processed} avatars.`);

    process.exit(0);
};

run().catch(console.error);
