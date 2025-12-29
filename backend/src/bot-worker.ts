import dotenv from 'dotenv';
import { connectDatabase } from './database';
import { BotService } from './bot/bot.service';
import { eventBus, EventType } from './services/event.bus';
import mongoose from 'mongoose';

dotenv.config();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down Bot Worker...');
    await mongoose.disconnect();
    process.exit(0);
});

async function bootstrap() {
    try {
        console.log('🤖 Starting Bot Worker...');

        // 1. Connect to Database
        await connectDatabase();

        // 2. Initialize Bot Service
        const botService = new BotService();

        // 3. Subscribe to Redis Events (Commands from Game Service)

        // Handle Send Message
        await eventBus.on(EventType.SEND_MESSAGE, async (payload: { chatId: number | string, text: string, options?: any }) => {
            if (botService.bot) {
                try {
                    await botService.bot.sendMessage(payload.chatId, payload.text, payload.options);
                } catch (e) {
                    console.error(`[BotWorker] Failed to send message to ${payload.chatId}:`, e);
                }
            }
        });

        // Handle Broadcast
        await eventBus.on(EventType.BROADCAST, async (payload: { message: string, recipients: string[] }) => {
            if (botService.bot) {
                console.log(`[BotWorker] Broadcasting to ${payload.recipients?.length} users...`);
                for (const id of payload.recipients) {
                    try {
                        await botService.bot.sendMessage(id, payload.message, { parse_mode: 'Markdown' });
                    } catch (e) {
                        // ignore blocked users
                    }
                }
            }
        });

        console.log('✅ Bot Worker is Running and listening to Redis events.');

    } catch (error) {
        console.error('❌ Failed to start Bot Worker:', error);
        process.exit(1);
    }
}

bootstrap();
