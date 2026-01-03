
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Avatar } from '../models/Avatar';
import { User } from '../models/User';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });

        const user = await User.findOne({ username: 'roman_arctur' });
        if (!user) return;

        const avatars = await Avatar.find({ owner: user._id }).sort({ createdAt: 1 });

        console.log(`Avatars for roman_arctur (${user._id}):`);
        for (const av of avatars) {
            let parentInfo = 'None';
            if (av.parent) {
                const parent = await Avatar.findById(av.parent).populate('owner');
                const pUser = parent?.owner as any;
                parentInfo = `${pUser?.username} (${parent?._id})`;
            }
            console.log(`- ID: ${av._id} | Created: ${av.createdAt.toISOString()} | Level: ${av.level} | Parent: ${parentInfo}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
