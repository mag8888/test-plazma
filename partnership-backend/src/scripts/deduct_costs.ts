
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';
import { Transaction, TransactionType } from '../models/Transaction';
import { WalletService, Currency } from '../services/WalletService';
import dotenv from 'dotenv';
import path from 'path';

// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

const COSTS = {
    BASIC: 20,
    ADVANCED: 100,
    PREMIUM: 1000
};

async function run() {
    console.log(`🔌 Connecting to DB: ${LOCAL_MONGO_URL} (dbName: test)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'test' });

    // 1. Get All Active Avatars
    const avatars = await Avatar.find({ isActive: true });
    console.log(`📦 Found ${avatars.length} active avatars.`);

    let processed = 0;
    let charged = 0;
    let skipped = 0;

    for (const avatar of avatars) {
        // Find existing purchase tx
        // Rough check: look for negative transaction for this user with matching amount?
        // Or strictly 'AVATAR_PURCHASE'.
        // Since we know they are missing, we can be aggressive.
        // But let's check if we recently added one to avoid double charge if re-run.
        // Description check: "Purchase [TYPE]"

        const cost = COSTS[avatar.type as keyof typeof COSTS] || 0;
        if (cost === 0) continue;

        const exists = await Transaction.findOne({
            user: avatar.owner,
            type: 'PURCHASE' as any, // WalletService.charge might use PURCHASE or AVATAR_PURCHASE depending on implementation
            amount: -cost,
            description: { $regex: new RegExp(`Purchase ${avatar.type}`, 'i') }
        });

        // Also check AVATAR_PURCHASE if we used that manually
        const exists2 = await Transaction.findOne({
            user: avatar.owner,
            type: 'AVATAR_PURCHASE',
            amount: -cost
        });

        if (exists || exists2) {
            console.log(`Skipping ${avatar._id} (Already charged)`);
            skipped++;
            continue;
        }

        // CHARGE
        console.log(`Charging User ${avatar.owner} for ${avatar.type} (-${cost})`);

        // Manual Charge logic to ensure correct Type
        const user = await User.findById(avatar.owner);
        if (user) {
            user.greenBalance = (user.greenBalance || 0) - cost;
            await user.save();

            await Transaction.create({
                user: user._id,
                amount: -cost,
                currency: 'GREEN',
                type: 'PURCHASE_TARIFF' as any, // Explicit type from Enum
                description: `Retroactive Charge: Purchase ${avatar.type}`
            });
            charged++;
        }
        processed++;
        if (processed % 10 === 0) process.stdout.write('.');
    }

    console.log(`\n✅ Costs Deducted. Charged: ${charged}, Skipped: ${skipped}`);
    process.exit(0);
}

run().catch(console.error);
