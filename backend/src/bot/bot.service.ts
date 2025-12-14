import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not provided, bot will not start.");
}

export class BotService {
    bot: TelegramBot | null = null;

    constructor() {
        if (token) {
            this.bot = new TelegramBot(token, { polling: true });

            // Handle Polling Errors to prevent crash/spam
            this.bot.on('polling_error', (error) => {
                // Mute 409 Conflict locally if desired, or just log cleanly
                if (error.message.includes('ETELEGRAM: 409 Conflict')) {
                    console.log("⚠️ Telegram Bot Conflict: Another instance is running!");
                } else {
                    console.error("Telegram Polling Error:", error.message);
                }
            });

            this.initHandlers();
            console.log("Telegram Bot started.");
        }
    }

    initHandlers() {
        if (!this.bot) return;

        // /start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const firstName = msg.from?.first_name || 'Friend';

            const text = `👋 Привет, ${firstName}! 👑\n\n` +
                `Добро пожаловать в Энергию Денег ✨\n` +
                `— пространство, где игра соединяется с реальными возможностями в квантовом поле.\n\n` +
                `Здесь ты сможешь:\n` +
                `🫂 Найти друзей\n` +
                `💰 Увеличить доход\n` +
                `🤝 Получить клиентов\n` +
                `🎲 Играть и развиваться\n\n` +
                `🎯 Выбирай, что интересно прямо сейчас 👇`;

            if (this.bot) {
                this.bot.sendMessage(chatId, text, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'ℹ️ О проекте', callback_data: 'about' }],
                            [{ text: '🤝 Получить клиентов', callback_data: 'clients' }],
                            [{ text: '💸 Заработать', callback_data: 'earn' }],
                            [{ text: '🎲 Играть', callback_data: 'play' }], // Will link to Web App
                            [{ text: '🌐 Сообщество', callback_data: 'community' }],
                            [{ text: '💰 Доход (Реф)', callback_data: 'income' }]
                        ]
                    }
                });
            }
        });

        // Callback Queries
        this.bot.on('callback_query', (query) => {
            const chatId = query.message?.chat.id;
            if (!chatId) return;

            const data = query.data;

            if (data === 'about') {
                // TODO: Send video if available
                this.bot?.sendMessage(chatId,
                    `«Энергия Денег» — это новая образовательная игра, созданная на основе принципов CashFlow.\n` +
                    `Она помогает менять мышление, прокачивать навыки и открывать новые финансовые возможности.`
                );
            } else if (data === 'clients') {
                this.bot?.sendMessage(chatId,
                    `Через игру ты можешь находить новых клиентов и партнёров.\n` +
                    `Это современный инструмент продвижения твоего бизнеса и укрепления связей.`,
                    {
                        reply_markup: {
                            inline_keyboard: [[{ text: 'Стать мастером', callback_data: 'become_master' }]]
                        }
                    }
                );
            } else if (data === 'become_master') {
                this.bot?.sendMessage(chatId, `С вами свяжется менеджер.`);
            } else if (data === 'earn') {
                this.bot?.sendMessage(chatId,
                    `Хочешь зарабатывать вместе с «Энергией Денег»?\n` +
                    `Стань партнёром проекта и получай доход, играя и помогая другим людям развиваться.`,
                    {
                        reply_markup: {
                            inline_keyboard: [[{ text: 'Оставить заявку', callback_data: 'apply_earn' }]]
                        }
                    }
                );
            } else if (data === 'play') {
                this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\nЗапускай игру прямо сейчас!`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: '🚀 ЗАПУСТИТЬ', url: process.env.WEB_APP_URL || 'https://google.com' }]]
                    }
                });
            } else if (data === 'community') {
                this.bot?.sendMessage(chatId,
                    `Добро пожаловать в наше сообщество 🌐\n` +
                    `Здесь мы объединяем людей, которые хотят расти, делиться опытом и находить новых друзей...`
                );
            }
        });
    }
}
