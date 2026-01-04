import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load Env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SOURCE_URL = process.env.SOURCE_MONGO_URL;
const DEST_URL = process.env.DEST_MONGO_URL;

if (!SOURCE_URL || !DEST_URL) {
    console.error("❌ Usage: SOURCE_MONGO_URL=... DEST_MONGO_URL=... npx ts-node backend/src/scripts/copy-db-live.ts");
    process.exit(1);
}

const copyDb = async () => {
    console.log(`🚀 Starting DB Migration...`);
    console.log(`FROM: ${SOURCE_URL.split('@')[1] || SOURCE_URL}`); // Mask auth
    console.log(`TO:   ${DEST_URL.split('@')[1] || DEST_URL}`);

    const clientSource = new MongoClient(SOURCE_URL);
    const clientDest = new MongoClient(DEST_URL);

    try {
        await clientSource.connect();
        await clientDest.connect();

        const dbSource = clientSource.db(); // Uses DB name from URI
        const dbDest = clientDest.db();     // Uses DB name from URI

        // Get Collections
        const collections = await dbSource.listCollections().toArray();
        console.log(`found ${collections.length} collections.`);

        for (const colInfo of collections) {
            const colName = colInfo.name;
            if (colName.startsWith('system.')) continue;

            console.log(`\n📦 Processing '${colName}'...`);

            const srcCol = dbSource.collection(colName);
            const destCol = dbDest.collection(colName);

            // Fetch Data
            const data = await srcCol.find({}).toArray();
            console.log(`   Fetched ${data.length} docs.`);

            if (data.length > 0) {
                // Wipe Destination
                try {
                    await destCol.drop();
                    console.log(`   Dropped existing collection in dest.`);
                } catch (e) {
                    // Ignore if ns not found
                }

                // Insert
                await destCol.insertMany(data);
                console.log(`   ✅ Inserted ${data.length} docs to dest.`);
            } else {
                console.log(`   Skipping empty collection.`);
            }
        }

        console.log(`\n✅ MIGRATION COMPLETE!`);

    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await clientSource.close();
        await clientDest.close();
    }
};

copyDb();
