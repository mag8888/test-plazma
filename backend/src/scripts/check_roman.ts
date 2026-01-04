
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Connect to LIVE DB
const LIVE_MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const run = async () => {
    try {
        await mongoose.connect(LIVE_MONGO_URL, { dbName: 'moneo' });
        console.log('Connected to Moneo DB');

        const users = await mongoose.connection.collection('users').find({
            $or: [
                { username: /roman/i },
                { first_name: /roman/i }
            ]
        }).toArray();

        console.log(`Found ${users.length} users matching 'roman':`);
        users.forEach(u => {
            console.log(`- ${u.username} (ID: ${u._id}): Green=${u.greenBalance}, Yellow=${u.yellowBalance}, Red=${u.balanceRed}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
