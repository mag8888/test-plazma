
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import path from 'path';

// Explicitly load the same .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const check = async () => {
    try {
        console.log('ENV MONGO_URL:', process.env.MONGO_URL);

        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });
        console.log('Connected to DB:', mongoose.connection.db?.databaseName);

        const count = await User.countDocuments();
        console.log('User Count:', count);

        if (count === 195) {
            console.log('✅ Matches Restore Count');
        } else if (count === 169) {
            console.log('❌ Matches Stale Admin Count');
        } else {
            console.log('❓ Mismatch (Neither 195 nor 169)');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
