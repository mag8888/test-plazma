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
    console.log(`Restoring REFERRALS ONLY from: ${url}`);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.users) {
        console.error("Invalid Backup Format");
        return;
    }

    // Restore Users
    const { UserModel } = await import('./models/user.model');
    console.log(`Found ${data.users.length} users in backup.`);
    console.log('Backup Users:', data.users.map((u: any) => u.username).join(', '));

    let restoredCount = 0;
    for (const u of data.users) {
        // Skip if user doesn't have a referrer in the backup
        // Or should we restore nulls too? 
        // User asked to "restore referrals".
        // Let's assume we want to restore the state of 'referrer' and 'referredBy'.

        // Upsert based on telegram_id or username
        const filter = u.telegram_id ? { telegram_id: u.telegram_id } : { username: u.username };

        // SAFE UPDATE: Only touch referral fields
        const updateData: any = {};
        if (u.referrer) updateData.referrer = u.referrer;
        if (u.referredBy) updateData.referredBy = u.referredBy;

        // Only update if we have something to update
        if (Object.keys(updateData).length > 0) {
            await UserModel.findOneAndUpdate(filter, { $set: updateData }, { upsert: false }); // Do not create new users, only patch existing
            restoredCount++;
        }
    }
    console.log(`Referrals restored for ${restoredCount} users.`);
};

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

run();
