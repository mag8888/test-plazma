import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { CloudinaryService } from './cloudinary.service';

export class BackupService {
    private cloudinaryService: CloudinaryService;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly BACKUP_INTERVAL_MS = 60 * 60 * 1000; // 1 Hour

    constructor() {
        this.cloudinaryService = new CloudinaryService();
    }

    start() {
        console.log("Starting Backup Service (Every 1h)...");
        // Run immediately on start (optional, maybe delay a bit)
        setTimeout(() => this.performBackup(), 60 * 1000);

        this.intervalId = setInterval(() => {
            this.performBackup();
        }, this.BACKUP_INTERVAL_MS);
    }

    async performBackup() {
        console.log("⏳ Starting Database Backup...");
        try {
            // Use mongoose connection to get raw collections (avoids model import issues)
            const db = mongoose.connection.db;
            if (!db) {
                console.error("❌ DB not connected. Skipping backup.");
                return;
            }

            // Define collections to backup
            const collections = [
                'users',
                'transactions',
                'scheduled_games',
                'reviews',
                'avatars',
                'avatarpurchases',
                'leveltransitions'
            ];

            const backupData: any = {
                timestamp: new Date().toISOString(),
                collections: {}
            };

            for (const colName of collections) {
                try {
                    const data = await db.collection(colName).find({}).toArray();
                    backupData.collections[colName] = data;
                    console.log(`📦 Backed up ${colName}: ${data.length} docs`);
                } catch (e) {
                    console.warn(`⚠️ Failed to backup collection ${colName}:`, e);
                    backupData.collections[colName] = [];
                }
            }

            // Save to temp file
            const tempDir = path.join(__dirname, '../../temp_backups');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const filePath = path.join(tempDir, fileName);

            fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
            console.log(`✅ Backup created locally: ${filePath}`);

            // Upload to Cloudinary
            const url = await this.cloudinaryService.uploadFile(filePath, 'moneo_backups');
            console.log(`☁️ Backup uploaded to Cloudinary: ${url}`);

            // Cleanup
            fs.unlinkSync(filePath);

        } catch (error) {
            console.error("❌ Backup Failed:", error);
        }
    }
}
