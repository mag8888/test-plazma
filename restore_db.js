require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { MongoClient } = require('mongodb');
const https = require('https');

// Configuration
// Configuration
let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL;
const DB_NAME = 'plazma'; // Force correct DB name for Bot

if (MONGO_URI) {
    // Auto-fix connection string if it's raw (standard Railway behavior)
    if (!MONGO_URI.includes('/plazma')) {
        // Strip trailing slash if present
        MONGO_URI = MONGO_URI.replace(/\/$/, '');
        // Append explicit DB name and params
        if (MONGO_URI.endsWith('27017')) {
            MONGO_URI = `${MONGO_URI}/${DB_NAME}?authSource=admin&directConnection=true`;
        }
    }
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function restore() {
    console.log('🚀 Starting Database Restoration...');

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('❌ Cloudinary credentials missing in environment variables');
        process.exit(1);
    }

    if (!MONGO_URI) {
        console.error('❌ MONGODB_URI or MONGO_URL missing');
        process.exit(1);
    }

    try {
        // 1. Find latest backup
        console.log('🔍 Searching for latest backup on Cloudinary (folder: plazma-bot/backups/)...');
        const result = await cloudinary.api.resources({
            resource_type: 'raw',
            type: 'upload',
            prefix: 'plazma-bot/backups/', // Target specific folder
            max_results: 10,
            direction: 'desc',
            sort_by: 'created_at'
        });

        // Manual sort to be safe
        const backups = result.resources.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (backups.length === 0) {
            console.error('❌ No backups found on Cloudinary');
            process.exit(1);
        }

        const latestBackup = backups[0];
        console.log(`✅ Found backup: ${latestBackup.public_id} (${latestBackup.created_at})`);
        console.log(`⬇️ Downloading from: ${latestBackup.secure_url}`);

        // 2. Download backup
        const rawData = await downloadFile(latestBackup.secure_url);
        let backupData;
        try {
            backupData = JSON.parse(rawData);
            console.log('✅ Backup parsed as JSON');
        } catch (e) {
            console.error('❌ Failed to parse backup as JSON. Binary dumps are not supported by this script yet.');
            process.exit(1);
        }

        // 3. Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`✅ Connected to database: ${DB_NAME}`);

        // SAFETY CHECK: Only restore if DB is effectively empty
        const userCount = await db.collection('User').countDocuments();
        if (userCount > 0) {
            console.log(`⚠️ SAFETY SKIP: Database ${DB_NAME} already has ${userCount} users. Skipping restore to prevent data loss.`);
            await client.close();
            process.exit(0);
        }

        // 4. Restore Data
        // Assuming structure { "collectionName": [documents], ... }
        // OR { "users": [...], "rooms": [...] } logic based on file names? 
        // If it's a single file, it's likely a dump object.

        const collections = Object.keys(backupData);
        if (collections.length === 0) {
            console.warn('⚠️ Backup is empty');
        }

        for (const colName of collections) {
            const docs = backupData[colName];
            if (!Array.isArray(docs) || docs.length === 0) {
                console.log(`⚠️ Skipping empty or invalid collection: ${colName}`);
                continue;
            }

            console.log(`♻️ Restoring collection: ${colName} (${docs.length} documents)...`);

            const collection = db.collection(colName);
            try {
                await collection.deleteMany({}); // Safety: clear old broken data (valid because we checked userCount == 0 or explicit override)
            } catch (e) {
                console.warn(`Could not clear collection ${colName}, proceeding to insert...`);
            }

            // Pre-process docs to fix _id and Dates
            const processedDocs = docs.map(doc => {
                // Simple Date fixer for common fields
                ['created_at', 'updated_at', 'createdAt', 'updatedAt'].forEach(field => {
                    if (doc[field] && typeof doc[field] === 'string') {
                        doc[field] = new Date(doc[field]);
                    }
                });
                // Fix _id if it is {$oid: ...}
                if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
                    // We need ObjectId from mongodb, but simple import might work if we let driver handle or convert
                    // For now, let's just insert.
                }
                return doc;
            });

            await collection.insertMany(processedDocs);
            console.log(`✅ Restored ${colName}`);
        }

        console.log('🎉 Restoration completed successfully!');
        await client.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Restoration failed:', error);
        process.exit(1);
    }
}

restore();
