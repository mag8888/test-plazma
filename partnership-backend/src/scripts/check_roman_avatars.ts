
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'partnership-backend/.env') });

import mongoose from 'mongoose';
import { connectDB } from '../db';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';

async function run() {
    await connectDB();

    const username = 'roman_arctur';
    // const telegramId = 6840451873;

    console.log(`Searching for user: ${username}`);
    const user = await User.findOne({ username });

    if (!user) {
        console.log('User not found by username. Trying Telegram ID 6840451873...');
        const userById = await User.findOne({ telegram_id: 6840451873 });
        if (!userById) {
            console.error('User not found by ID either.');
            process.exit(1);
        }
        console.log(`Found user by ID: ${userById.username} (${userById._id})`);
    } else {
        console.log(`Found user: ${user.username} (${user._id})`);
    }

    const targetUser = user || await User.findOne({ telegram_id: 6840451873 });
    if (!targetUser) process.exit(1);

    const avatars = await Avatar.find({ owner: targetUser._id });
    console.log(`\nTotal Avatars found: ${avatars.length}`);

    avatars.forEach(a => {
        console.log(`- Avatar ${a._id}: Type=${a.type}, Level=${a.level}, Active=${a.isActive}, Created=${a.createdAt}`);
    });

    process.exit(0);
}

run();
