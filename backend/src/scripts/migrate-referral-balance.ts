import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../models/user.model';
import { PartnershipClient, Currency, TransactionType } from '../services/partnership.client';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function migrate() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const users = await UserModel.find({ referralBalance: { $gt: 0 } });
        console.log(`Found ${users.length} users with referral balance`);

        for (const user of users) {
            const amount = user.referralBalance;
            if (amount <= 0) continue;

            try {
                console.log(`Migrating ${amount} for user ${user.username} (${user._id})...`);

                // Deposit to Green Balance
                await PartnershipClient.deposit(
                    user._id,
                    Currency.GREEN,
                    amount,
                    'Migration: Legacy Referral Balance to Green Balance',
                    TransactionType.DEPOSIT // Or generic deposit, tagging it is good
                );

                // Zero out legacy balance
                user.referralBalance = 0;
                await user.save();

                console.log(`✓ Migrated ${user.username}`);
            } catch (e: any) {
                console.error(`✗ Failed to migrate ${user.username}:`, e.message);
            }
        }

        console.log('Migration complete');
        process.exit(0);

    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
