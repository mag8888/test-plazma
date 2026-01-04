
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const run = async () => {
    try {
        console.log('Connecting to TEST DB...');
        await mongoose.connect(MONGO_URL, { dbName: 'test' });

        const cardCount = await mongoose.connection.collection('cards').countDocuments({});
        const gameCount = await mongoose.connection.collection('scheduled_games').countDocuments({});

        console.log(`[TEST DB] Cards: ${cardCount}`);
        console.log(`[TEST DB] Scheduled Games: ${gameCount}`);

        if (cardCount === 0 || gameCount === 0) {
            console.log('\nChecking MONEO DB (Source Candidate)...');
            const moneoConn = await mongoose.createConnection(MONGO_URL, { dbName: 'moneo' }).asPromise();
            const mCard = await moneoConn.collection('cards').countDocuments({});
            const mGame = await moneoConn.collection('scheduled_games').countDocuments({});
            console.log(`[MONEO DB] Cards: ${mCard}`);
            console.log(`[MONEO DB] Scheduled Games: ${mGame}`);
            await moneoConn.close();
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
