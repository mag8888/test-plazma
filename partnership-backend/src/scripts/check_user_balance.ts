
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import path from 'path';

// Load env from root of partnership-backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TARGET_TELEGRAM_ID = 246680504; // Mikhail9

const run = async () => {
    try {
        const mongoURI = process.env.MONGO_URL;
        if (!mongoURI) {
            console.error('MONGO_URL not found');
            process.exit(1);
        }

        console.log('Connecting to DB...');
        await mongoose.connect(mongoURI, { dbName: 'moneo' });
        console.log('Connected.');

        const user = await User.findOne({ telegram_id: TARGET_TELEGRAM_ID });
        if (!user) {
            console.error(`User with telegram_id ${TARGET_TELEGRAM_ID} not found.`);
            process.exit(1);
        }

        console.log(`Found User: ${user.username} (${user._id})`);
        console.log(`Green Balance: $${user.greenBalance}`);
        console.log(`Referral Balance: $${user.referralBalance}`);
        console.log('------------------------------------------------');

        const transactions = await Transaction.find({ user: user._id }).sort({ createdAt: 1 });

        console.log(`Found ${transactions.length} transactions:`);

        let calculatedSum = 0;

        transactions.forEach(t => {
            console.log(`[${t.createdAt.toISOString()}] ${t.type} | Amount: $${t.amount} | Desc: ${t.description || 'N/A'}`);
            if (t.currency === 'USD' || t.currency === 'USDT' || t.currency === 'GREEN') {
                // Assuming Green transactions count towards Green Balance
                calculatedSum += t.amount;
            }
        });

        console.log('------------------------------------------------');
        console.log(`Calculated Sum from Transactions: $${calculatedSum}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
