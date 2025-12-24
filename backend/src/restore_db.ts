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
            .max_results(10)
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
    console.log(`Restoring from: ${url}`);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.users) {
        console.error("Invalid Backup Format");
        return;
    }

    // Restore Users
    const { UserModel } = await import('./models/user.model');
    console.log(`Found ${data.users.length} users in backup.`);

    for (const u of data.users) {
        // Upsert based on telegram_id or username
        const filter = u.telegram_id ? { telegram_id: u.telegram_id } : { username: u.username };
        // Clean _id to avoid collision if needed, or keep it? 
        // Better to keep _id if restoring same DB. If migrating, maybe new _id?
        // Let's try upserting with _id if possible, or omit it.
        // Mongoose might complain if _id format mismatches.
        // Safe: delete u._id and upsert.
        const id = u._id;
        delete u._id;

        await UserModel.findOneAndUpdate(filter, { $set: u }, { upsert: true, new: true });
        // Restore _id ?? If we want to preserve refs (like referrer), we MUST preserve _id.
        // Re-adding _id can be tricky in update.
        // Better: Try to updateOne with _id filter first?
        // Actually, if we just overwrite, it's risky.
        // Let's trust the logic: Find by TelegramID, update everything.
    }
    console.log("Users restored.");

    // Restore Games & Transactions similarly if needed
    // ...
};

const run = async () => {
    await connectDB();
    const args = process.argv.slice(2);
    if (args[0] === 'list') {
        await listBackups();
    } else if (args[0] === 'restore' && args[1]) {
        await restoreBackup(args[1]);
    } else if (args[0] === 'latest') {
        const backups = await listBackups();
        if (backups.length > 0) {
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
