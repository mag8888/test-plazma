const mongoose = require('mongoose');
require('dotenv').config();

// Connect to Game Backend DB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/moneo';

async function checkUsers() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({
            username: String,
            telegram_id: Number,
            first_name: String,
            last_name: String,
            referredBy: String,
            referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            greenBalance: Number,
            yellowBalance: Number,
            balanceRed: Number,
            rating: Number,
            createdAt: Date
        }, { timestamps: true }));

        // 1. Check if izobilioner exists
        console.log('\n🔍 Searching for "izobilioner"...');
        const izobilioner = await User.findOne({
            $or: [
                { username: /izobilioner/i },
                { telegram_id: 'izobilioner' }
            ]
        });

        if (izobilioner) {
            console.log('✅ Found:', izobilioner.username, izobilioner.telegram_id);
        } else {
            console.log('❌ User "izobilioner" NOT FOUND in database');
        }

        // 2. Count users with izobilioner as referredBy
        const count = await User.countDocuments({ referredBy: /izobilioner/i });
        console.log(`\n📊 Users with "izobilioner" as referredBy: ${count}`);

        // 3. List all users with izobilioner as referredBy
        const referrals = await User.find({ referredBy: /izobilioner/i }).limit(10);
        console.log('\n👥 Sample of users referred by izobilioner:');
        referrals.forEach(u => {
            console.log(`   - ${u.username || u.telegram_id} (referredBy: "${u.referredBy}", referrer: ${u.referrer || 'null'})`);
        });

        // 4. Check total user count
        const total = await User.countDocuments();
        console.log(`\n📈 Total users in database: ${total}`);

        // 5. Users with referredBy but no referrer ObjectId
        const broken = await User.countDocuments({
            referredBy: { $exists: true, $ne: null },
            referrer: { $exists: false }
        });
        console.log(`⚠️  Users with referredBy string but no referrer ObjectId: ${broken}`);

        await mongoose.disconnect();
        console.log('\n✅ Done');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
