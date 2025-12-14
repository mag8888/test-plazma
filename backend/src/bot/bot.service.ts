import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not provided, bot will not start.");
}

export class BotService {
    bot: TelegramBot | null = null;
    adminStates: Map<number, { state: string, targetUser?: any }> = new Map();

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

        // /start command (supports ?start=referrerId)
        this.bot.onText(/\/start(.*)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id;
            const firstName = msg.from?.first_name || 'Friend';
            const username = msg.from?.username || `user_${telegramId}`;

            // Check for referral code
            const referralCode = match && match[1] ? match[1].trim() : null;

            if (telegramId) {
                await this.handleUserRegistration(telegramId, username, firstName, referralCode);
            }

            const welcomeText = `👋 Привет, ${firstName}! 👑\n\n` +
                `Добро пожаловать в Энергию Денег ✨\n` +
                `— пространство, где игра соединяется с реальными возможностями в квантовом поле.\n\n` +
                `Здесь ты сможешь:\n` +
                `🫂 Найти друзей\n` +
                `💰 Увеличить доход\n` +
                `🤝 Получить клиентов\n` +
                `🎲 Играть и развиваться\n\n` +
                `🎯 Выбирай, что интересно прямо сейчас 👇`;

            this.sendMainMenu(chatId, welcomeText);
        });

        // Handle text messages (Menu Buttons)
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;

            if (!text) return;

            // Admin State Handling
            const adminState = this.adminStates.get(chatId);
            if (adminState) {
                if (adminState.state === 'WAITING_FOR_BALANCE_USER') {
                    // Try to find user
                    const { UserModel } = await import('../models/user.model');
                    let targetUser = await UserModel.findOne({ username: text.replace('@', '') });
                    if (!targetUser && !isNaN(Number(text))) {
                        targetUser = await UserModel.findOne({ telegram_id: Number(text) });
                    }

                    if (targetUser) {
                        this.adminStates.set(chatId, { state: 'WAITING_FOR_BALANCE_AMOUNT', targetUser: targetUser });
                        this.bot?.sendMessage(chatId, `Selected: ${targetUser.username} (Bal: $${targetUser.referralBalance}).\nEnter amount to add (e.g. 10):`);
                    } else {
                        this.bot?.sendMessage(chatId, "User not found. Try again or /cancel.");
                    }
                    return;
                } else if (adminState.state === 'WAITING_FOR_BALANCE_AMOUNT') {
                    const amount = Number(text);
                    if (!isNaN(amount)) {
                        const targetUser = adminState.targetUser;
                        targetUser.referralBalance += amount;
                        await targetUser.save();
                        this.bot?.sendMessage(chatId, `✅ Added $${amount} to ${targetUser.username}. New Balance: $${targetUser.referralBalance}`);
                        this.bot?.sendMessage(targetUser.telegram_id, `💰 Ваш баланс пополнен на $${amount}!`);
                        this.adminStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "Invalid amount. Enter a number.");
                    }
                    return;
                }
            }

            if (text === '/cancel') {
                this.adminStates.delete(chatId);
                this.bot?.sendMessage(chatId, "Action canceled.");
                return;
            }

            if (text === '/admin') {
                const adminId = process.env.TELEGRAM_ADMIN_ID;
                if (adminId && chatId.toString() === adminId) {
                    this.bot?.sendMessage(chatId, "👑 **Admin Panel**\nSelect an action:", {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '🤝 Partners', callback_data: 'admin_partners' }],
                                [{ text: '💰 Add Balance', callback_data: 'admin_balance' }],
                                [{ text: '📤 Upload Photo', callback_data: 'admin_upload' }]
                            ]
                        }
                    });
                }
                return;
            }

            if (text === '💸 Заработать') {
                await this.handleEarn(chatId, msg.from?.id);
            } else if (text === '🎲 Играть') {
                this.handlePlay(chatId);
            } else if (text === '🤝 Получить клиентов') {
                this.handleClients(chatId);
            } else if (text === '🌐 Сообщество') {
                this.handleCommunity(chatId);
            } else if (text === 'ℹ️ О проекте') {
                this.handleAbout(chatId);
            }
        });

        // Keep callback query handler for inline buttons (like in 'Earn' or deep links)
        this.bot.on('callback_query', (query) => {
            const chatId = query.message?.chat.id;
            const data = query.data;
            if (!chatId || !data) return;

            if (data === 'apply_earn') {
                this.bot?.sendMessage(chatId, 'Отлично! Напишите менеджеру: @Arctur_888');
            } else if (data === 'become_master') {
                this.bot?.sendMessage(chatId, 'Чтобы стать мастером, напишите: @Aurelia_8888');
            } else if (data === 'admin_users') {
                // Fetch last 10 users
                import('../models/user.model').then(async ({ UserModel }) => {
                    const users = await UserModel.find().sort({ createdAt: -1 }).limit(10);
                    const list = users.map(u => `👤 ${u.username} (Bal: $${u.referralBalance})`).join('\n');
                    this.bot?.sendMessage(chatId, `**Last 10 Users:**\n${list}`, { parse_mode: 'Markdown' });
                });
            } else if (data === 'admin_partners') {
                // Fetch top referrers
                import('../models/user.model').then(async ({ UserModel }) => {
                    const users = await UserModel.find({ referralsCount: { $gt: 0 } }).sort({ referralsCount: -1 }).limit(10);
                    const list = users.map(u => `🤝 ${u.username}: ${u.referralsCount} refs`).join('\n');
                    this.bot?.sendMessage(chatId, `**Top Partners:**\n${list}`, { parse_mode: 'Markdown' });
                });
            } else if (data === 'admin_balance') {
                const adminId = process.env.TELEGRAM_ADMIN_ID;
                if (chatId.toString() === adminId) {
                    this.adminStates.set(chatId, { state: 'WAITING_FOR_BALANCE_USER' });
                    this.bot?.sendMessage(chatId, "Enter **Username** or **Telegram ID** to credit:", { parse_mode: 'Markdown' });
                }
            } else if (data === 'admin_upload') {
                this.bot?.sendMessage(chatId, "Send me a photo to upload it to Cloudinary.");
            }
        });
        // Handle Photos for Cloudinary Upload
        this.bot.on('photo', async (msg) => {
            const chatId = msg.chat.id;

            // Allow anyone or restrict? "User said bot could upload".
            // Let's just allow it for simplicity.

            if (!msg.photo || msg.photo.length === 0) return;

            // Get the largest photo
            const photo = msg.photo[msg.photo.length - 1];
            const fileId = photo.file_id;

            this.bot?.sendMessage(chatId, "⏳ Uploading to Cloudinary...");

            try {
                // Get file link
                const fileLink = await this.bot?.getFileLink(fileId);
                if (!fileLink) throw new Error("Could not get file link");

                // Dynamic Import Service
                const { CloudinaryService } = await import('../services/cloudinary.service');
                const cloudinaryService = new CloudinaryService();

                const url = await cloudinaryService.uploadImage(fileLink);

                this.bot?.sendMessage(chatId, `✅ **Image Uploaded!**\n\n\`${url}\``, { parse_mode: 'Markdown' });

            } catch (error: any) {
                console.error("Upload failed", error);
                this.bot?.sendMessage(chatId, `❌ Upload failed: ${error.message}`);
            }
        });
    }

    sendMainMenu(chatId: number, text: string) {
        this.bot?.sendMessage(chatId, text, {
            reply_markup: {
                keyboard: [
                    [{ text: '🎲 Играть' }, { text: '💸 Заработать' }],
                    [{ text: '🤝 Получить клиентов' }],
                    [{ text: '🌐 Сообщество' }, { text: 'ℹ️ О проекте' }]
                ],
                resize_keyboard: true
            }
        });
    }

    async handleUserRegistration(telegramId: number, username: string, firstName: string, referralCode: string | null) {
        try {
            const { UserModel } = await import('../models/user.model');

            let user = await UserModel.findOne({ telegram_id: telegramId });

            if (!user) {
                // Check if username exists (rare collision case for telegram users)
                const existingUsername = await UserModel.findOne({ username });
                if (existingUsername) {
                    // Append random to username to make unique
                    username = `${username}_${Math.floor(Math.random() * 1000)}`;
                }

                user = new UserModel({
                    username,
                    first_name: firstName,
                    telegram_id: telegramId,
                    referralBalance: 0,
                    referralsCount: 0
                });

                // Process Referral
                if (referralCode) {
                    // Start payload often comes as '12345' (referrer's telegramId or database Id?)
                    // Let's assume it's username or ID.
                    // If param is simple string, it's likely username or id.

                    // Try to find referrer
                    // We support referral by: @MONEO_game_bot?start=referrer_username
                    // OR ?start=referrer_id

                    let referrer = await UserModel.findOne({ username: referralCode });
                    if (!referrer) {
                        // Try finding by telegram_id? (If referral code is number)
                        if (!isNaN(Number(referralCode))) {
                            referrer = await UserModel.findOne({ telegram_id: Number(referralCode) });
                        }
                    }

                    if (referrer && referrer._id.toString() !== user._id.toString()) {
                        user.referredBy = referrer.username;

                        // Award Referrer
                        referrer.referralBalance += 10;
                        referrer.referralsCount += 1;
                        await referrer.save();

                        this.bot?.sendMessage(referrer.telegram_id!, `🎉 У вас новый реферал: ${firstName}! Баланс +$10.`);
                    }
                }

                await user.save();
                console.log(`New user registered via bot: ${username}`);
            }
        } catch (e) {
            console.error("Error registering user:", e);
        }
    }

    async handleEarn(chatId: number, telegramId?: number) {
        if (!telegramId) return;

        try {
            const { UserModel } = await import('../models/user.model');
            const user = await UserModel.findOne({ telegram_id: telegramId });

            if (!user) {
                this.bot?.sendMessage(chatId, "Ошибка: Пользватель не найден. Введите /start");
                return;
            }

            const refLink = `https://t.me/MONEO_game_bot?start=${user.username}`;
            // Fallback if no username? Use ID? But user request said "username if available, else ID".
            // User schema requires unique username. Bot users usually have one, or we generated one.

            const text = `💰 **Партнёрская программа**\n\n` +
                `Приглашай друзей и получай $10 на игровой баланс за каждого!\n\n` +
                `🔗 **Твоя ссылка:**\n${refLink}\n\n` +
                `💳 **Твой баланс:** $${user.referralBalance}\n` +
                `👥 **Приглашено:** ${user.referralsCount}\n\n` +
                `Хочешь зарабатывать больше как партнёр проекта?`;

            this.bot?.sendMessage(chatId, text, {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Оставить заявку', callback_data: 'apply_earn' }]]
                }
            });

        } catch (e) {
            console.error("Error in handleEarn:", e);
        }
    }

    async handlePlay(chatId: number) {
        // Find user by chatId (assuming chatId = telegramId for private chats, which is true usually)
        // Or pass telegramId
        // Ideally we should pass telegramId to handlePlay

        // Quick fetch to get code
        try {
            // We need to initialize AuthService here or dependency inject it.
            // Or simpler: Just import it dynamically like we did for UserModel
            const { AuthService } = await import('../auth/auth.service');
            const authService = new AuthService();

            // ChatId might be same as User ID
            const code = await authService.createAuthCode(chatId);

            const link = `${process.env.WEB_APP_URL || 'https://moneo.app'}/?auth=${code}`;

            this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\nЗапускай игру прямо сейчас!`, {
                reply_markup: {
                    inline_keyboard: [[{ text: '🚀 ЗАПУСТИТЬ', url: link }]]
                }
            });

        } catch (e) {
            console.error("Error generating play link:", e);
            // Fallback
            this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\nЗапускай игру прямо сейчас!`, {
                reply_markup: {
                    inline_keyboard: [[{ text: '🚀 ЗАПУСТИТЬ', url: process.env.WEB_APP_URL || 'https://google.com' }]]
                }
            });
        }
    }

    handleClients(chatId: number) {
        this.bot?.sendMessage(chatId,
            `Через игру ты можешь находить новых клиентов и партнёров.\n` +
            `Это современный инструмент продвижения твоего бизнеса и укрепления связей.`,
            {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Стать мастером', callback_data: 'become_master' }]]
                }
            }
        );
    }

    handleCommunity(chatId: number) {
        this.bot?.sendMessage(chatId, `Добро пожаловать в наше сообщество! 🌐\nПодключайся к чату: @Arctur_888`);
    }

    handleAbout(chatId: number) {
        this.bot?.sendMessage(chatId,
            `«Энергия Денег» — это новая образовательная игра, созданная на основе принципов CashFlow.\n` +
            `Она помогает менять мышление, прокачивать навыки и открывать новые финансовые возможности.`
        );
    }
}
