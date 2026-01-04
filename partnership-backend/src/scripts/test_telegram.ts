
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'partnership-backend/.env') });

async function run() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminIdsStr = process.env.ADMIN_IDS || process.env.ADMIN_ID || '';
    let adminIds = adminIdsStr.split(',').map(id => id.trim()).filter(id => id);

    console.log('--- Telegram Config Check ---');
    console.log(`Token Present: ${!!token} (${token ? token.slice(0, 5) + '...' : 'MISSING'})`);
    console.log(`Admin IDs from Env: ${adminIds.join(', ')}`);

    if (adminIds.length === 0) {
        console.log('Using Fallback Admin ID: 6840451873');
        adminIds.push('6840451873');
    }

    if (!token) {
        console.error('CRITICAL: No Token!');
        process.exit(1);
    }

    for (const adminId of adminIds) {
        console.log(`\nAttempting to send message to ${adminId}...`);
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: adminId,
                    text: '🔔 TEST: Admin Notification Check from Backend Script.'
                })
            });
            const data = await res.json();
            console.log(`Response for ${adminId}:`, JSON.stringify(data, null, 2));
        } catch (e: any) {
            console.error(`Error sending to ${adminId}:`, e.message);
        }
    }
}

run();
