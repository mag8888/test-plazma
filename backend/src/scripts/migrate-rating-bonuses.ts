/**
 * Migration Script: Update Rating and Award Referral Bonuses
 * 
 * 1. Changes all ratings from 1000 -> 100
 * 2. Awards 10 RED balance for each referral
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../database';

async function migrateRatingAndBonuses() {
    console.log('🔄 Starting migration...');

    try {
        await connectDatabase();

        const { UserModel } = await import('../models/user.model');
        const { TransactionModel } = await import('../models/transaction.model');

        // 1. Update all ratings: 1000 -> 100
        console.log('\n📊 Updating ratings...');
        const ratingResult = await UserModel.updateMany(
            { rating: 1000 },
            { $set: { rating: 100 } }
        );
        console.log(`✅ Updated ${ratingResult.modifiedCount} users' ratings`);

        // 2. Award 10 RED per referral
        console.log('\n💰 Calculating referral bonuses...');
        const allUsers = await UserModel.find({});

        let bonusesAwarded = 0;
        let totalBonus = 0;

        for (const user of allUsers) {
            // Count how many users have this user as referrer
            const referralCount = await UserModel.countDocuments({
                referredBy: user.username
            });

            if (referralCount > 0) {
                const bonus = referralCount * 10;

                // Award bonus
                user.balanceRed = (user.balanceRed || 0) + bonus;
                await user.save();

                // Log transaction
                await TransactionModel.create({
                    userId: user._id,
                    amount: bonus,
                    currency: 'RED',
                    type: 'REFERRAL',
                    description: `Бонус за ${referralCount} приглашенных (10 RED каждый)`
                });

                bonusesAwarded++;
                totalBonus += bonus;

                console.log(`✅ ${user.username}: +${bonus} RED (${referralCount} referrals)`);
            }
        }

        console.log('\n📈 Migration Complete!');
        console.log(`✅ Ratings updated: ${ratingResult.modifiedCount}`);
        console.log(`✅ Bonuses awarded: ${bonusesAwarded} users`);
        console.log(`✅ Total RED awarded: ${totalBonus}`);

    } catch (error) {
        console.error('💥 Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

// Run if called directly
if (require.main === module) {
    migrateRatingAndBonuses()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

export { migrateRatingAndBonuses };
