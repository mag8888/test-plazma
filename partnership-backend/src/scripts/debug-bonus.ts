
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';
import { Avatar, AvatarType } from '../models/Avatar';
import { AvatarPurchase } from '../models/AvatarPurchase';
import { Transaction } from '../models/Transaction';

// Load environment variables - attempt to find them
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/plazma';

async function debugBonus() {
    try {
        console.log(`Connecting to: ${MONGO_URL}`);
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        const referrerUsername = 'izobilioner';
        const referralUsername = 'altynbaevv';

        console.log(`\n--- Debugging: ${referralUsername} -> ${referrerUsername} ---`);

        const referrer = await User.findOne({ username: referrerUsername });
        const referral = await User.findOne({ username: referralUsername });

        if (!referrer || !referral) {
            console.error('One or both users not found');
            console.log(`Referrer (${referrerUsername}): ${referrer ? 'Found' : 'Missing'}`);
            console.log(`Referral (${referralUsername}): ${referral ? 'Found' : 'Missing'}`);

            // Debug dump all users
            if (!referrer) {
                const similar = await User.find({ username: { $regex: referrerUsername, $options: 'i' } });
                console.log('Similar referrers:', similar.map(u => u.username));
            }
            return;
        }

        console.log(`Referrer: ${referrer.username} (${referrer._id})`);
        console.log(`Referral: ${referral.username} (${referral._id})`);

        // Link Check
        let isLinked = false;
        if (referral.referrer) {
            console.log(`Referral's referrer field: ${referral.referrer}`);
            isLinked = referral.referrer.toString() === referrer._id.toString();
        } else {
            console.log(`Referral has NO referrer set.`);
        }
        console.log(`Link Status: ${isLinked ? '✅ CORRECTLY LINKED' : '❌ NOT LINKED or MISMATCH'}`);

        // Check Referrer Subscription
        const now = new Date();
        const activeAvatars = await Avatar.find({
            owner: referrer._id,
            isActive: true,
            $or: [
                { subscriptionExpires: { $gt: now } },
                { subscriptionExpires: null }
            ] // Note: subscriptionExpires null = Lifetime? check schema logic
        });

        console.log(`\nReferrer Active Avatars (Count: ${activeAvatars.length})`);
        activeAvatars.forEach(a => {
            console.log(`- Type: ${a.type}, Expires: ${a.subscriptionExpires}`);
        });

        const hasSubscription = activeAvatars.length > 0;
        console.log(`Has Active Subscription: ${hasSubscription ? '✅ YES' : '❌ NO'}`);

        // Check Purchases
        console.log(`\n--- Avatar Purchases by ${referralUsername} ---`);
        const purchases = await AvatarPurchase.find({ buyer: referral._id });

        if (purchases.length === 0) {
            console.log('No AvatarPurchase records found for referral.');
        } else {
            console.log(`Found ${purchases.length} purchases.`);
            for (const p of purchases) {
                console.log(`[${p.createdAt.toISOString()}] Type: ${p.type} Cost: ${p.cost}`);
                console.log(`   - Referrer Bonus Sent: ${p.referrerBonus}`);
                console.log(`   - Recorded Referrer ID: ${p.referrerId}`);

                if (p.referrerId && p.referrerId.toString() !== referrer._id.toString()) {
                    console.log(`   ⚠️ BOMBSHELL: Bonus went to DIFFERENT referrer: ${p.referrerId}`);
                }
            }
        }

        // Check Transactions
        console.log(`\n--- Transactions for ${referrerUsername} (Last 10) ---`);
        const transactions = await Transaction.find({
            user: referrer._id
        }).sort({ createdAt: -1 }).limit(10);

        if (transactions.length === 0) {
            console.log(`No transactions found for referrer.`);
        } else {
            transactions.forEach(t => {
                const isRelevant = t.description && t.description.toLowerCase().includes(referralUsername.toLowerCase());
                console.log(`${isRelevant ? '👉' : '-'} [${t.createdAt.toISOString()}] ${t.type}: ${t.amount} ${t.currency} (${t.description})`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugBonus();
