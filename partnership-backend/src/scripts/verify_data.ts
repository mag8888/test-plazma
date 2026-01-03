
import mongoose from 'mongoose';

const DEV_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910/moneo?authSource=admin';

const check = async () => {
    try {
        await mongoose.connect(DEV_URL);
        console.log('✅ Connected to DEV DB');

        const collections = await mongoose.connection.db?.listCollections().toArray();
        console.log('Collections:', collections?.map(c => c.name));

        const ScheduledGameModel = mongoose.connection.collection('scheduledgames');
        const count = await ScheduledGameModel.countDocuments();
        console.log('Scheduled Games Count:', count);

        if (count > 0) {
            const game = await ScheduledGameModel.findOne();
            console.log('Sample Game:', JSON.stringify(game, null, 2));
        } else {
            console.warn('⚠️ No games found in scheduledgames!');
        }

        const UserModel = mongoose.connection.collection('users');
        const userCount = await UserModel.countDocuments();
        console.log('Users Count:', userCount);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
