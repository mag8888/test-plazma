import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
    username: String,
    first_name: String,
    telegram_id: Number,
    referredBy: String,
    referralsCount: Number,
    createdAt: Date
});

const User = mongoose.model('User', UserSchema);

async function checkReferrals(username: string) {
    try {
        await mongoose.connect(process.env.MONGO_URL || '');
        console.log('Connected to MongoDB');

        // Find all users referred by this username
        const referrals = await User.find({ referredBy: username })
            .select('username first_name telegram_id createdAt')
            .sort({ createdAt: -1 });

        console.log(`\n=== Referrals for ${username} ===`);
        console.log(`Total: ${referrals.length}\n`);

        referrals.forEach((ref, index) => {
            console.log(`${index + 1}. ${ref.username} (${ref.first_name || 'No name'})`);
            console.log(`   Telegram ID: ${ref.telegram_id}`);
            console.log(`   Joined: ${ref.createdAt}\n`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

const username = process.argv[2] || 'roman_arctur';
checkReferrals(username);
