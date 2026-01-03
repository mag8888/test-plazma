
import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function run() {
    console.log(`🔌 Connecting to DB: ${LOCAL_MONGO_URL} (dbName: test)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'test' });

    const TARGET_USER = 'izobilioner';
    const user = await User.findOne({ username: TARGET_USER });

    if (!user) {
        console.log("User not found");
        process.exit(1);
    }

    console.log(`Target: ${user.username} (_id: ${user._id}, tid: ${user.telegram_id})`);

    // 1. Count by ObjectId
    const countById = await User.countDocuments({ referrer: user._id });
    console.log(`Count by ObjectId: ${countById}`);

    // 2. Count by String (if any legacy data exists)
    // Note: referrer is Schema.Types.ObjectId, so usually Mongo casts queries.
    // checking field type manually via aggregation might be needed if there's type mismatch

    // 3. List all referrals
    const referrals = await User.find({ referrer: user._id }).select('username telegram_id referredBy createdAt');
    console.log(`Fetched ${referrals.length} referrals.`);

    // Check 'referredBy' text field (Legacy text referral)
    const countByText = await User.countDocuments({ referredBy: { $regex: new RegExp(TARGET_USER, 'i') } });
    console.log(`Count by 'referredBy' text: ${countByText}`);

    // 4. Compare with "Bot Logic" Simulation
    const allUsers = await User.find({}).lean();
    let botCount = 0;
    const refMap = new Map();

    allUsers.forEach((u: any) => {
        if (u.referrer) {
            const r = String(u.referrer);
            if (r === String(user._id)) {
                botCount++;
            }
        }
    });
    console.log(`Bot Logic Count (Iterating All): ${botCount}`);

    process.exit(0);
}

run().catch(console.error);
