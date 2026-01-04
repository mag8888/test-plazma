
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const SOURCE_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';
const TARGET_URL = 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const COLLECTIONS = [
    'users',
    'transactions',
    'scheduled_games',
    'reviews',
    'avatars',
    'avatarpurchases',
    'leveltransitions',
    'rooms',
    'cards',
    'adminlogs',
    'depositrequests'
];

const migrate = async () => {
    console.log('🚀 Starting Direct Migration...');

    // Connect Source (Raw Driver)
    console.log('🔌 Connecting to SOURCE...');
    const sourceClient = new MongoClient(SOURCE_URL);
    await sourceClient.connect();
    const sourceDb = sourceClient.db(); // Default DB usually 'test' or 'railway' or whatever is in connection string. 
    // Credentials usually don't imply db, but let's list collections to be sure.

    // Connect Target (Raw Driver)
    console.log('🔌 Connecting to TARGET...');
    const targetClient = new MongoClient(TARGET_URL);
    await targetClient.connect();
    const targetDb = targetClient.db();

    // Verify DB Names
    console.log(`ℹ️  Source DB: ${sourceDb.databaseName}`);
    console.log(`ℹ️  Target DB: ${targetDb.databaseName}`);

    /*
      Note: If source DB name is 'railway' and target is 'railway', it works. 
      If user didn't specify DB in string, it defaults to 'test'.
      User string '...:55910' usually doesn't have path.
      We might need to check specific DB. 'moneo' is used in app.
    */

    // Override to 'moneo' if we want to force it?
    // Let's copy from Source CURRENT to Target 'moneo' if possible or just 1:1.
    // Assuming keys are root, we can access any DB.
    // Let's try to find 'users' in the default DB.

    for (const colName of COLLECTIONS) {
        console.log(`\n📥 Migrating ${colName}...`);
        try {
            const srcCol = sourceDb.collection(colName);
            const count = await srcCol.countDocuments();
            if (count === 0) {
                console.log(`   Internal DB (${sourceDb.databaseName}) - empty.`);
                // Try 'moneo' DB explicitly
                const moneoDb = sourceClient.db('moneo');
                const countMoneo = await moneoDb.collection(colName).countDocuments();
                if (countMoneo > 0) {
                    console.log(`   Found in 'moneo' DB! Switching source context to 'moneo'.`);
                    // We should switch logic to use 'moneo' for all if this happens.
                    // For simplicity, let's just use specific DBs.
                }
            }

            // Let's use 'moneo' DB for both to be safe, as that's what app uses.
            const sDb = sourceClient.db('moneo');
            const tDb = targetClient.db('moneo');

            const docs = await sDb.collection(colName).find({}).toArray();
            console.log(`   Read ${docs.length} docs from Source (moneo).`);

            if (docs.length > 0) {
                const tCol = tDb.collection(colName);
                await tCol.deleteMany({}); // Wipe target first? Yes, "fill this base".
                await tCol.insertMany(docs);
                console.log(`✅ Wrote ${docs.length} docs to Target (moneo).`);
            }

        } catch (e) {
            console.error(`❌ Error migrating ${colName}:`, e);
        }
    }

    console.log('\n✨ Migration Complete.');
    await sourceClient.close();
    await targetClient.close();
};

migrate().catch(console.error);
