
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });
        console.log('Connected to DB');

        const u1 = await User.findOne({ username: 'roman_arctur' }).populate('referrer');
        const u2 = await User.findOne({ username: 'MaximCashflow' }).populate('referrer');
        const u3 = await User.findOne({ username: 'RomanGemini' }).populate('referrer');

        console.log(`roman_arctur Referrer: ${(u1?.referrer as any)?.username || 'None'}`);
        console.log(`MaximCashflow Referrer: ${(u2?.referrer as any)?.username || 'None'}`);
        console.log(`RomanGemini Referrer: ${(u3?.referrer as any)?.username || 'None'}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
