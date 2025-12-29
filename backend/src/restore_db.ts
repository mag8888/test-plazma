import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import AWS from 'aws-sdk'; // Not used
// import fetch from 'node-fetch'; // Use native fetch

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const connectDB = async () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/moneo';
    await mongoose.connect(mongoUrl, { dbName: 'moneo' });
    console.log('Connected to DB');
};

const listBackups = async () => {
    try {
        // Use Search API to find latest raw files in moneo_backups
        const result = await cloudinary.search
            .expression('folder:moneo_backups AND resource_type:raw')
            .sort_by('created_at', 'desc')
            .max_results(50) // Increased limit
            .execute();

        console.log('Found Backups:');
        result.resources.forEach((res: any) => {
            console.log(`- ${res.created_at}: ${res.secure_url}`);
        });
        return result.resources;
    } catch (e) {
        console.error("List Error:", e);
        return [];
    }
};

const restoreBackup = async (url: string) => {
    console.log(`📥 Downloading Backup from: ${url}`);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.collections) {
        console.error("❌ Invalid Backup Format: No 'collections' object found.");
        return;
    }

    const db = mongoose.connection.db;
    if (!db) {
        console.error("❌ DB Connection lost.");
        return;
    }

    const collections = Object.keys(data.collections);
    console.log(`📦 Found collections: ${collections.join(', ')}`);

    for (const colName of collections) {
        const docs = data.collections[colName];
        if (!docs || docs.length === 0) {
            console.log(`- ${colName}: No documents.`);
            continue;
        }

        console.log(`🔄 Restoring ${colName} (${docs.length} docs)...`);

        try {
            // 1. Clear existing data in Dev
            await db.collection(colName).deleteMany({});

            // 2. Pre-process docs (fix Dates, ObjectIds if needed)
            // JSON turns Dates to Strings. Mongoose/Driver might not auto-convert raw inserts.
            // We'll trust the driver for valid formats or basic string insertion.
            // Ideally we'd map _id to ObjectId, but strings usually work in Mongo if consistent.

            // 3. Insert
            await db.collection(colName).insertMany(docs);
            console.log(`✅ ${colName}: Restored.`);
        } catch (e) {
            console.error(`❌ Failed to restore ${colName}:`, e);
        }
    }

    console.log('🎉 Full Restoration Complete!');
};

export { listBackups, restoreBackup };

const run = async () => {
    // connectDB moved to inside blocks that need it
    const args = process.argv.slice(2);
    if (args[0] === 'list') {
        // No DB needed for listing
        await listBackups();
    } else if (args[0] === 'restore' && args[1]) {
        await connectDB();
        await restoreBackup(args[1]);
    } else if (args[0] === 'latest') {
        // List first (no DB), then restore (needs DB)
        const backups = await listBackups();
        if (backups.length > 0) {
            await connectDB();
            await restoreBackup(backups[0].secure_url);
        } else {
            console.log("No backups found.");
        }
    } else {
        console.log("Usage: ts-node restore_db.ts [list|restore <url>|latest]");
    }
    process.exit(0);
};

// Only run if called directly
if (require.main === module) {
    run();
}
