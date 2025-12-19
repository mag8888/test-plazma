import fs from 'fs';
import path from 'path';
import { CloudinaryService } from './cloudinary.service';

export class BackupService {
    private cloudinaryService: CloudinaryService;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 Hours

    constructor() {
        this.cloudinaryService = new CloudinaryService();
    }

    start() {
        console.log("Starting Backup Service (Every 12h)...");
        // Run immediately on start (optional, maybe delay a bit)
        setTimeout(() => this.performBackup(), 60 * 1000);

        this.intervalId = setInterval(() => {
            this.performBackup();
        }, this.BACKUP_INTERVAL_MS);
    }

    async performBackup() {
        console.log("⏳ Starting Database Backup...");
        try {
            // Import Models Dynamically to avoid circular deps or init issues
            const { UserModel } = await import('../models/user.model');
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { TransactionModel } = await import('../models/transaction.model');

            // Define collections to backup
            const backupData = {
                timestamp: new Date().toISOString(),
                users: await UserModel.find({}),
                scheduled_games: await ScheduledGameModel.find({}),
                transactions: await TransactionModel.find({})
            };

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
