
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';
import dotenv from 'dotenv';
import path from 'path';

// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function run() {
    console.log(`🔌 Connecting to DB: ${LOCAL_MONGO_URL} (dbName: test)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'test' });
    console.log("🔌 Connected to DB");

    const username = 'SvetaSvetlanaRodionova';
    const user = await User.findOne({ username });
    if (!user) {
        console.error("User not found!");
        process.exit(1);
    }

    console.log(`Working on user: ${user.username} (${user._id})`);

    // Find her avatars
    const avatars = await Avatar.find({ owner: user._id });
    console.log(`Found ${avatars.length} avatars.`);

    // Date to set: Dec 25 2025, 06:00 (Before idudin)
    // idudin was Dec 25 14:13
    const newDate = new Date('2025-12-25T06:00:00.000Z');

    for (const a of avatars) {
        console.log(`Updating Avatar ${a._id}. Old Date: ${a.createdAt}`);
        a.createdAt = newDate;
        // Make sure it's active
        a.isActive = true;
        await a.save();
        console.log(`Updated Avatar ${a._id}. New Date: ${a.createdAt}`);
    }

    console.log("✅ Fix Complete.");
    process.exit(0);
}

run().catch(console.error);
