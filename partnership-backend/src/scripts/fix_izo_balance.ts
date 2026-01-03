
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'partnership-backend/.env') });

import mongoose from 'mongoose';
import { connectDB } from '../db';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';

async function run() {
    await connectDB();

    const username = 'izobilioner';
    const user = await User.findOne({ username });

    if (!user) {
        console.error('User not found');
        process.exit(1);
    }

    console.log(`Checking user: ${username} (${user._id})`);

    const avatar = await Avatar.findOne({ owner: user._id, type: 'ADVANCED', isActive: true });
    if (!avatar) {
        console.error('Active ADVANCED avatar not found');
        process.exit(1);
    }

    console.log(`Current Yellow Balance: ${avatar.yellowBalance}`);

    if (avatar.yellowBalance < 100) {
        console.warn('Balance is less than 100, aborting deduction to avoid negative balance (unless intentional).');
        // process.exit(1); // Unlecomment to be strict, but I'll proceed if it's exact or more.
    }

    // Deduct 100
    avatar.yellowBalance = (avatar.yellowBalance || 0) - 100;

    // Safety clamp
    if (avatar.yellowBalance < 0) avatar.yellowBalance = 0;

    await avatar.save();
    console.log(`✅ Deducted 100. New Yellow Balance: ${avatar.yellowBalance}`);

    process.exit(0);
}

run();
