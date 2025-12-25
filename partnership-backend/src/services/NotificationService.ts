import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export class NotificationService {
    /**
     * Send a markdown/html message to a Telegram user.
     */
    static async sendTelegramMessage(chatId: number | string, text: string) {
        if (!TOKEN) {
            console.error('[NotificationService] ⛔️ FATAL: TELEGRAM_BOT_TOKEN is missing in process.env!');
            return;
        }

        try {
            const maskedToken = TOKEN.substring(0, 5) + '...';
            console.log(`[NotificationService] 🚀 Sending to ${chatId} using token ${maskedToken}`);

            const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            });

            const respText = await response.text();

            if (!response.ok) {
                console.error(`[NotificationService] ❌ Telegram API Error (${response.status}): ${respText}`);
            } else {
                console.log(`[NotificationService] ✅ Success: ${respText}`);
            }
        } catch (e) {
            console.error('[NotificationService] 💥 Network Exception:', e);
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
