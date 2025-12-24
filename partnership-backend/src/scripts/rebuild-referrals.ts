import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../db';

/**
 * Rebuild Referral Links
 * 
 * This script scans all users and rebuilds the `referrer` ObjectId links
 * based on the `referredBy` string field (username).
 */
async function rebuildReferrals() {
    console.log('🔄 Starting Referral Rebuild...');

    try {
        await connectDB();

        const allUsers = await User.find({});
        console.log(`📊 Found ${allUsers.length} total users`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of allUsers) {
            // Skip if already has referrer ObjectId
            if (user.referrer) {
                skipped++;
                continue;
            }

            // Skip if no referredBy string
            if (!user.referredBy) {
                continue;
            }

            try {
                // Find the referrer by username
                const referrer = await User.findOne({
                    $or: [
                        { username: user.referredBy },
                        { telegram_id: !isNaN(Number(user.referredBy)) ? Number(user.referredBy) : null }
                    ]
                });

                if (referrer && referrer._id.toString() !== user._id.toString()) {
                    user.referrer = referrer._id;
                    await user.save();
                    updated++;
                    console.log(`✅ ${user.username || user.telegram_id}: linked to ${referrer.username}`);
                } else {
                    console.log(`⚠️  ${user.username || user.telegram_id}: referrer '${user.referredBy}' not found`);
                }
            } catch (err) {
                errors++;
                console.error(`❌ Error processing ${user.username}:`, err);
            }
        }

        console.log('\n📈 Rebuild Complete!');
        console.log(`✅ Updated: ${updated}`);
        console.log(`⏭️  Skipped (already linked): ${skipped}`);
        console.log(`❌ Errors: ${errors}`);

        // Count referrals for verification
        const usersWithReferrer = await User.countDocuments({ referrer: { $exists: true, $ne: null } });
        console.log(`\n🔗 Total users with referrer: ${usersWithReferrer}`);

    } catch (error) {
        console.error('💥 Fatal error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from database');
    }
}

// Run if called directly
if (require.main === module) {
    rebuildReferrals()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

export { rebuildReferrals };
