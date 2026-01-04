
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL || '');
        console.log('Connected to DB');

        const count = await mongoose.connection.collection('scheduledgames').countDocuments();
        console.log(`Scheduled Games Count: ${count}`);

        const games = await mongoose.connection.collection('scheduledgames').find({}).toArray();
        console.log('Sample Games:', games.slice(0, 3));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
