import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration Script: Merge Partnership Users into Game Database
 * 
 * This script:
 * 1. Connects to BOTH databases (Game and Partnership)
 * 2. Fetches all users from Partnership DB
 * 3. For each user, checks if exists in Game DB (by telegram_id)
 * 4. If exists: merges partnership data (keeps game data priority)
 * 5. If not exists: creates user in Game DB
 * 6. Updates referrer relationships
 */

// User Schema (simplified for migration)
const userSchema = new mongoose.Schema({
    telegram_id: Number,
    username: String,
    first_name: String,
    last_name: String,
    photo_url: String,
    greenBalance: { type: Number, default: 0 },
    yellowBalance: { type: Number, default: 0 },
    balanceRed: { type: Number, default: 0 },
    referralBalance: { type: Number, default: 0 },
    rating: { type: Number, default: 100 },
    wins: { type: Number, default: 0 },
    referredBy: String,
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralsCount: { type: Number, default: 0 },
    isMaster: Boolean,
    masterExpiresAt: Date,
    authCode: String,
    authCodeExpires: Date,
    password: String,
    preferences: {
        dream: String,
        token: String,
        displayName: String
    }
}, { timestamps: true });

async function migrate() {
    console.log('🔄 Starting database migration...\n');

    // Connection URIs from environment
    const gameDbUri = process.env.MONGO_URL;
    const partnershipDbUri = process.env.MONGO_URL_PARTNERSHIP; // Or same

    if (!gameDbUri || !partnershipDbUri) {
        throw new Error("Missing ENV vars");
    }

    console.log(`Game DB: ${gameDbUri.replace(/:([^:@]+)@/, ':****@')}`);
    console.log(`Partnership DB: ${partnershipDbUri.replace(/:([^:@]+)@/, ':****@')}\n`);

    // Create separate connections
    const gameConn = await mongoose.createConnection(gameDbUri).asPromise();
    const partnershipConn = await mongoose.createConnection(partnershipDbUri).asPromise();

    console.log('✅ Connected to both databases\n');

    // Get models from both connections
    const GameUser = gameConn.model('User', userSchema);
    const PartnershipUser = partnershipConn.model('User', userSchema);

    // Fetch all users from partnership DB
    const partnershipUsers = await PartnershipUser.find({});
    console.log(`📊 Found ${partnershipUsers.length} users in Partnership DB\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const pUser of partnershipUsers) {
        try {
            // Find by telegram_id in game DB
            const existingUser = await GameUser.findOne({ telegram_id: pUser.telegram_id });

            if (existingUser) {
                // User exists - merge partnership data
                console.log(`🔄 Updating: ${pUser.username || pUser.telegram_id}`);

                // Merge balances (add partnership balances if higher)
                existingUser.greenBalance = Math.max(existingUser.greenBalance || 0, pUser.greenBalance || 0);
                existingUser.yellowBalance = Math.max(existingUser.yellowBalance || 0, pUser.yellowBalance || 0);

                // Update referrer if partnership has better data
                if (pUser.referrer && !existingUser.referrer) {
                    existingUser.referrer = pUser.referrer;
                }
                if (pUser.referredBy && !existingUser.referredBy) {
                    existingUser.referredBy = pUser.referredBy;
                }

                await existingUser.save();
                updated++;
            } else {
                // User doesn't exist - create in game DB
                console.log(`➕ Creating: ${pUser.username || pUser.telegram_id}`);

                await GameUser.create({
                    telegram_id: pUser.telegram_id,
                    username: pUser.username,
                    first_name: pUser.first_name,
                    last_name: pUser.last_name,
                    photo_url: pUser.photo_url,
                    greenBalance: pUser.greenBalance || 0,
                    yellowBalance: pUser.yellowBalance || 0,
                    balanceRed: pUser.balanceRed || 0,
                    rating: pUser.rating || 100,
                    referredBy: pUser.referredBy,
                    referrer: pUser.referrer,
                    referralsCount: pUser.referralsCount || 0,
                    createdAt: pUser.createdAt,
                    updatedAt: pUser.updatedAt
                });
                created++;
            }
        } catch (e: any) {
            console.error(`❌ Error processing ${pUser.username || pUser.telegram_id}:`, e.message);
            errors++;
        }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

    // Final counts
    const finalCount = await GameUser.countDocuments();
    console.log(`\n✅ Final user count in Game DB: ${finalCount}`);

    await gameConn.close();
    await partnershipConn.close();
    console.log('\n✅ Migration complete!');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
