const { MongoClient } = require('mongodb');

const SOURCE_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';
const DEST_URL = 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const copyDb = async () => {
    console.log(`🚀 Starting DB Migration...`);
    console.log(`FROM: ${SOURCE_URL.split('@')[1]}`);
    console.log(`TO:   ${DEST_URL.split('@')[1]}`);

    const clientSource = new MongoClient(SOURCE_URL);
    const clientDest = new MongoClient(DEST_URL);

    try {
        await clientSource.connect();
        await clientDest.connect();

        const dbSource = clientSource.db('test'); // Enforce 'test' db
        const dbDest = clientDest.db('test');     // Enforce 'test' db

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
