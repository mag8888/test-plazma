
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Avatar } from '../models/Avatar';
import { User } from '../models/User';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });
        console.log('Connected to DB');

        const avatars = await Avatar.find({ isActive: true }).sort({ createdAt: 1 }).limit(20);

        console.log('--- Checking Timestamps ---');
        let prevTime = 0;
        let identicalCount = 0;

        for (const av of avatars) {
            const time = new Date(av.createdAt).getTime();
            const user = await User.findById(av.owner);
            console.log(`${user?.username}: ${av.createdAt.toISOString()} (_id: ${av._id})`);

            if (time === prevTime) {
                identicalCount++;
            }
            prevTime = time;
        }

        if (identicalCount > 0) {
            console.log(`\nWARNING: Found ${identicalCount} identical timestamps in first 20! Sort might be unstable.`);
        } else {
            console.log('\nTimestamps look distinct.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
