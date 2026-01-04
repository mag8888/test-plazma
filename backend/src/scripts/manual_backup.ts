
import mongoose from 'mongoose';
import { BackupService } from '../services/backup.service';
import dotenv from 'dotenv';
dotenv.config();

// Ensure Cloudinary Env Vars are present
if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("Missing Cloudinary Config");
    process.exit(1);
}

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const run = async () => {
    try {
        console.log("Connecting to TEST DB for Backup...");
        await mongoose.connect(MONGO_URL, { dbName: 'test' });
        console.log("Connected.");

        const backupService = new BackupService();
        await backupService.performBackup();

        console.log("Manual Backup Complete.");
    } catch (error) {
        console.error("Backup Failed:", error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
