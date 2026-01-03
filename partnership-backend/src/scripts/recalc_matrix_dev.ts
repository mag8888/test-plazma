
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User'; // Ensure these are exported from models
import { Avatar, IAvatar } from '../models/Avatar';
import { Transaction, TransactionType } from '../models/Transaction';
import { MatrixService } from '../services/MatrixService';
import { WalletService, Currency } from '../services/WalletService';
import { NotificationService } from '../services/NotificationService';

// Mock Notification to silence spam
NotificationService.sendTelegramMessage = async () => { return; };

// CONFIG
// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function run() {
    console.log("🚀 Starting Matrix Recalculation on DEV...");

    console.log(`🔌 Connecting to DB: ${LOCAL_MONGO_URL} (dbName: test)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'test' });
    console.log("🔌 Connected to DB");

    // 1. Fetch ALL Active Avatars (Sorted by Creation)
    const avatars = await Avatar.find({ isActive: true }).sort({ createdAt: 1 });
    console.log(`📦 Found ${avatars.length} avatars to replay.`);

    // 2. RESET STATE
    console.log("🧹 Resetting Avatar States...");
    await Avatar.updateMany(
        { isActive: true },
        {
            $set: {
                parent: null,
                partners: [],
                level: 0,
                yellowBalance: 0,
                isClosed: false,
                lastLevelUpAt: null
            }
        }
    );
    // Wipe LevelTransitions? Yes.
    const { LevelTransition } = require('../models/LevelTransition'); // Dynamic if needed
    if (LevelTransition) await LevelTransition.deleteMany({});
    console.log("🧹 Level Transitions Wiped.");

    let processed = 0;

    // 3. REPLAY
    for (const avatar of avatars) {
        // Reload fresh to be sure
        const freshAvatar = await Avatar.findById(avatar._id);
        if (!freshAvatar) continue;

        // Get Owner to find Referrer
        const owner = await User.findById(freshAvatar.owner);
        if (!owner) {
            console.error(`❌ Owner missing for avatar ${freshAvatar._id}`);
            continue;
        }

        const referrerId = owner.referrer;

        // A. PLACE AVATAR
        const { parent } = await MatrixService.placeAvatar(freshAvatar, referrerId);

        // B. DISTRIBUTE BONUSES (Simulate Purchase Flow)
        // logic from MatrixService.purchaseAvatar (lines 327+)
        const config = {
            BASIC: 20,
            ADVANCED: 100,
            PREMIUM: 1000
        }[freshAvatar.type];

        if (!config) continue; // Should not happen

        const halfCost = config / 2;

        // 1. Direct Bonus (Green)
        if (referrerId) {
            const referrer = await User.findById(referrerId);
            // Verify active sub check?
            if (referrer && await MatrixService.hasActiveSubscription(referrer._id)) {
                await WalletService.deposit(
                    referrer._id,
                    Currency.GREEN,
                    halfCost,
                    `Direct Bonus: ${owner.username} bought ${freshAvatar.type} (Replay)`,
                    TransactionType.AVATAR_BONUS
                );
            }
        }

        // 2. Matrix Parent Feed (Yellow) + Progression
        if (parent) {
            const parentDoc = await Avatar.findById(parent._id);
            if (parentDoc) {
                parentDoc.yellowBalance = (parentDoc.yellowBalance || 0) + halfCost;
                await parentDoc.save();

                // Trigger Recursion
                await MatrixService.checkLevelProgression(parentDoc);
            }
        }

        processed++;
        if (processed % 10 === 0) process.stdout.write('.');
    }

    console.log(`\n✅ Replay Complete. Processed ${processed} avatars.`);
    process.exit(0);
}

run().catch(console.error);
