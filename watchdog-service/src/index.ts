
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import path from 'path';

// Load ENV from parent or local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Fallback to local .env

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_CHAT_ID || '8185347414'; // Fallback to your ID

if (!TELEGRAM_TOKEN) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN is missing! Alerts will be printed to console only.");
}

const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null;

// Services config
const SERVICES = [
    { name: 'Main Backend', url: process.env.BACKEND_URL || 'http://localhost:3001/api/health' },
    { name: 'Game Service', url: process.env.GAME_SERVICE_URL || 'http://localhost:5001/health' },
    { name: 'Partnership Service', url: process.env.PARTNERSHIP_URL || 'http://localhost:4000/health' }
];

const POLL_INTERVAL = 30000; // 30 sec
let serviceStatus: { [key: string]: { failures: number, lastAlert: number } } = {};

SERVICES.forEach(s => {
    serviceStatus[s.name] = { failures: 0, lastAlert: 0 };
});

const sendAlert = async (serviceName: string, error: string) => {
    const message = `🚨 **CRITICAL ALERT** 🚨\n\nService: **${serviceName}** is DOWN!\nError: ${error}\nTime: ${new Date().toLocaleString()}`;
    console.error(message);

    if (bot && ADMIN_ID) {
        try {
            await bot.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Failed to send Telegram alert:', e);
        }
    }
};

const sendRecovery = async (serviceName: string) => {
    const message = `✅ **RECOVERY**\n\nService: **${serviceName}** is back ONLINE.\nTime: ${new Date().toLocaleString()}`;
    console.log(message);

    if (bot && ADMIN_ID) {
        try {
            await bot.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Failed to send Telegram recovery msg:', e);
        }
    }
};

const checkHealth = async () => {
    for (const service of SERVICES) {
        const state = serviceStatus[service.name];

        try {
            await axios.get(service.url, { timeout: 5000 });

            if (state.failures > 0) {
                // Recovered
                await sendRecovery(service.name);
                state.failures = 0;
            }
        } catch (error: any) {
            state.failures++;
            console.log(`❌ ${service.name} failed check (${state.failures}/3): ${error.message}`);

            // Alert logic: Alert immediate on 3rd failure, then every 30 mins
            if (state.failures >= 3) {
                const now = Date.now();
                if (now - state.lastAlert > 30 * 60 * 1000) { // 30 mins cooldown
                    await sendAlert(service.name, error.message);
                    state.lastAlert = now;
                }
            }
        }
    }
};

console.log('🐶 Watchdog Service Started...');
console.log(`Monitoring: ${SERVICES.map(s => s.name).join(', ')}`);
console.log(`Admin ID: ${ADMIN_ID}`);

setInterval(checkHealth, POLL_INTERVAL);
checkHealth(); // Initial check
