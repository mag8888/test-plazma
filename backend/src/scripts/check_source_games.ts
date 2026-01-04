
import mongoose from 'mongoose';

const SOURCE_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

const run = async () => {
    try {
        console.log('Checking SOURCE (Nozomi) test DB...');
        const conn = await mongoose.createConnection(SOURCE_URL, { dbName: 'test' }).asPromise();
        const games = await conn.collection('scheduled_games').countDocuments({});
        console.log(`[SOURCE test] Scheduled Games: ${games}`);

        await conn.close();
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

run();
