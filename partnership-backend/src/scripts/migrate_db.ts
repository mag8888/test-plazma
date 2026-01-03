
import mongoose from 'mongoose';

const SOURCE_URL = 'mongodb://mongo:JCjSZpMRVCUSfWRJutrJwfHaXtnTkEMd@caboose.proxy.rlwy.net:33070/moneo?authSource=admin';
const TARGET_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910/moneo?authSource=admin';

const migrate = async () => {
    console.log('🚀 Starting Migration: PROD -> DEV');
    console.log('Source (PROD):', SOURCE_URL.split('@')[1]);
    console.log('Target (DEV) :', TARGET_URL.split('@')[1]);

    try {
        // 1. Connect to Source (Read-Only effectively)
        const sourceConn = await mongoose.createConnection(SOURCE_URL).asPromise();
        console.log('✅ Connected to Source');

        // 2. Connect to Target (Write)
        const targetConn = await mongoose.createConnection(TARGET_URL).asPromise();
        console.log('✅ Connected to Target');

        // 3. Get Collections from Source
        // Note: mongoose connection.db gives native driver access
        const collections = await sourceConn.db?.listCollections().toArray();
        if (!collections) throw new Error("Failed to list collections");
        console.log(`📦 Found ${collections.length} collections in Source`);

        for (const col of collections) {
            const colName = col.name;
            if (colName.startsWith('system.')) continue; // Skip system collections

            console.log(`\n🔄 Processing collection: ${colName}`);

            // Fetch Data
            const sourceModel = sourceConn.model(colName, new mongoose.Schema({}, { strict: false }), colName);
            const docs = await sourceModel.find({}).lean();
            console.log(`   - Fetched ${docs.length} documents from Source`);

            if (docs.length === 0) continue;

            // Clear Target (Drop to remove incompatible indexes)
            try {
                await targetConn.dropCollection(colName);
                console.log(`   - Dropped Target collection`);
            } catch (e: any) {
                if (e.code !== 26) { // 26 = NamespaceNotFound
                    console.warn(`   - Warning: Drop failed`, e.message);
                }
            }

            // Bulk Insert
            if (docs.length > 0) {
                const targetModel = targetConn.model(colName, new mongoose.Schema({}, { strict: false }), colName);
                await targetModel.insertMany(docs);
                console.log(`   - Inserted ${docs.length} documents into Target`);
            }
        }

        console.log('\n🎉 Migration Complete!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    }
};

migrate();
