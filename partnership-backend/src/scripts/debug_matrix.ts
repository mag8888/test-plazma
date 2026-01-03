
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });
        console.log('Connected to DB');

        // Check RomanGemini User and Avatars
        const geminiName = 'RomanGemini';
        const geminiUser = await User.findOne({ username: { $regex: new RegExp(`^${geminiName}$`, 'i') } });

        if (geminiUser) {
            console.log(`\n--- User: ${geminiUser.username} (${geminiUser._id}) ---`);
            const avatars = await Avatar.find({ owner: geminiUser._id }).populate('parent');
            for (const av of avatars) {
                const parent = av.parent as any;
                const parentOwner = parent ? await User.findById(parent.owner) : null;
                console.log(`Avatar ${av._id} [${av.type}]`);
                console.log(`  Parent: ${parent?._id} (Owner: ${parentOwner?.username})`);
            }
        } else {
            console.log('RomanGemini user not found');
        }

        // Check denyagood partners owners
        const dName = 'denyagood';
        const dUser = await User.findOne({ username: dName });
        if (dUser) {
            console.log(`\n--- User: ${dUser.username} ---`);
            const dAvatars = await Avatar.find({ owner: dUser._id });
            for (const av of dAvatars) {
                console.log(`Avatar ${av._id} [${av.type}] - Partners:`);
                for (const pid of av.partners) {
                    const pAv = await Avatar.findById(pid);
                    const pOwner = pAv ? await User.findById(pAv.owner) : null;
                    console.log(`  - ${pid} -> Owner: ${pOwner?.username}`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
