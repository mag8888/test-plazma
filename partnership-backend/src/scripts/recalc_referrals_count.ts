
import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function run() {
    console.log(`🔌 Connecting to DB: ${LOCAL_MONGO_URL} (dbName: test)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'test' });

    console.log("⏳ Fetching all users...");
    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    let updated = 0;

    for (const u of users) {
        // Count actual children
        const realCount = await User.countDocuments({ referrer: u._id });

        if (u.referralsCount !== realCount) {
            console.log(`Fixing ${u.username || u.telegram_id}: Stored=${u.referralsCount}, Real=${realCount}`);
            u.referralsCount = realCount;
            await u.save();
            updated++;
        }
    }

    console.log(`✅ Referrals Count Recalculation Complete. Updated: ${updated}`);
    process.exit(0);
}

run().catch(console.error);
