import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export class NotificationService {
    /**
     * Send a markdown/html message to a Telegram user.
     */
    static async sendTelegramMessage(chatId: number | string, text: string) {
        if (!TOKEN) {
            console.warn('[NotificationService] ⚠️ No TELEGRAM_BOT_TOKEN found. Skipping message.');
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
            console.log(`[NotificationService] Sending message to ${chatId}...`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[NotificationService] ❌ Error sending message to ${chatId}: ${errText}`);
            } else {
                console.log(`[NotificationService] ✅ Sent message to ${chatId}`);
            }
        } catch (e) {
            console.error('[NotificationService] Network error sending message:', e);
        }
    }

    /**
     * Send specific Income Notification
     */
    static async sendIncomeNotification(chatId: number, amount: number, sourceUsername: string) {
        const message = `Ваш счет пополнен на сумму <b>$${amount}</b>\nПартнер <b>${sourceUsername}</b> принес доход 💰`;
        await this.sendTelegramMessage(chatId, message);
    }
}
