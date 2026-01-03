
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Avatar } from '../models/Avatar';
import { User } from '../models/User';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });

        const names = ['roman_arctur', 'MaximCashflow', 'RomanGemini'];

        for (const name of names) {
            const user = await User.findOne({ username: name });
            if (!user) continue;

            const avatar = await Avatar.findOne({ owner: user._id }).populate('parent');
            let parentName = 'None';
            if (avatar?.parent) {
                const parentAv = await Avatar.findById(avatar.parent).populate('owner');
                parentName = (parentAv?.owner as any)?.username;
            }

            console.log(`User: ${name} -> Parent: ${parentName}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
