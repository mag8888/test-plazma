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
    masterStates: Map<number, { state: 'WAITING_DATE' | 'WAITING_MAX' | 'WAITING_PROMO', gameData?: any }> = new Map();
    transferStates: Map<number, { state: 'WAITING_USER' | 'WAITING_AMOUNT', targetUser?: any }> = new Map();

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

    async sendAdminMessage(text: string) {
        if (!this.bot) return;
        const adminIdsStr = process.env.ADMIN_IDS || process.env.ADMIN_ID || '';
        const adminIds = adminIdsStr.split(',').map(id => id.trim()).filter(id => id);

        if (adminIds.length === 0) {
            console.warn("No ADMIN_IDS provided for notifications.");
            return;
        }

        for (const id of adminIds) {
            try {
                await this.bot.sendMessage(id, text);
            } catch (e) {
                console.error(`Failed to send admin message to ${id}:`, e);
            }
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

            await this.sendMainMenu(chatId, welcomeText);
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
                } else if (adminState.state === 'WAITING_FOR_MASTER_USER') {
                    // Try to find user
                    const { UserModel } = await import('../models/user.model');
                    let targetUser = await UserModel.findOne({ username: text.replace('@', '') });
                    if (!targetUser && !isNaN(Number(text))) {
                        targetUser = await UserModel.findOne({ telegram_id: Number(text) });
                    }

                    if (targetUser) {
                        targetUser.isMaster = true;
                        const nextYear = new Date();
                        nextYear.setFullYear(nextYear.getFullYear() + 1);
                        targetUser.masterExpiresAt = nextYear;
                        await targetUser.save();

                        this.bot?.sendMessage(chatId, `✅ User ${targetUser.username} is now a MASTER until ${nextYear.toLocaleDateString()}!`);
                        this.bot?.sendMessage(targetUser.telegram_id, `🎉 Администратор назначил вас Мастером до ${nextYear.toLocaleDateString()}!`);
                        this.adminStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "User not found. Try again or /cancel.");
                    }
                    return;
                }
            }

            // Transfer State Handling
            const transferState = this.transferStates.get(chatId);
            if (transferState) {
                if (text === '/cancel') {
                    this.transferStates.delete(chatId);
                    this.bot?.sendMessage(chatId, "Отменено.");
                    return;
                }

                if (transferState.state === 'WAITING_USER') {
                    const { UserModel } = await import('../models/user.model');
                    let targetUser = await UserModel.findOne({ username: text.replace('@', '') });
                    if (!targetUser && !isNaN(Number(text))) {
                        targetUser = await UserModel.findOne({ telegram_id: Number(text) });
                    }

                    if (targetUser) {
                        // Check self
                        if (targetUser.telegram_id === msg.from?.id) {
                            this.bot?.sendMessage(chatId, "Нельзя переводить самому себе.");
                            return;
                        }

                        transferState.targetUser = targetUser;
                        transferState.state = 'WAITING_AMOUNT';
                        this.bot?.sendMessage(chatId, `✅ Получатель: ${targetUser.username}\nВведите сумму, которую он должен получить (Комиссия 2% спишется сверх суммы):`);
                    } else {
                        this.bot?.sendMessage(chatId, "Пользователь не найден. Введите username или ID:");
                    }
                    return;

                } else if (transferState.state === 'WAITING_AMOUNT') {
                    const amount = Number(text);
                    if (isNaN(amount) || amount <= 0) {
                        this.bot?.sendMessage(chatId, "Неверная сумма.");
                        return;
                    }

                    const commission = amount * 0.02;
                    const total = amount + commission;

                    const { UserModel } = await import('../models/user.model');
                    const sender = await UserModel.findOne({ telegram_id: msg.from?.id });

                    if (sender.referralBalance < total) {
                        this.bot?.sendMessage(chatId, `❌ Недостаточно средств на Зеленом балансе.\nНужно: $${total} (с учетом комиссии).\nДоступно: $${sender.referralBalance}`);
                        return;
                    }

                    // Execute
                    sender.referralBalance -= total;
                    await sender.save();

                    const receiver = await UserModel.findById(transferState.targetUser._id); // Reload to be safe
                    receiver.referralBalance += amount;
                    await receiver.save();

                    this.bot?.sendMessage(chatId, `✅ Перевод успешен!\n📤 Вы отправили: $${amount}\n💸 Комиссия: $${commission}\n💳 Списано: $${total}\n\nБаланс: $${sender.referralBalance}`);
                    this.bot?.sendMessage(receiver.telegram_id, `📥 Вам поступил перевод: $${amount} от ${sender.username}`);

                    this.transferStates.delete(chatId);
                    return;
                }
            }

            // Master State Handling
            const masterState = this.masterStates.get(chatId);
            if (masterState) {
                if (masterState.state === 'WAITING_DATE') {
                    // Start parsing date
                    // Support quick formats? "DD.MM HH:mm" or "YYYY-MM-DD HH:mm"
                    // Assume DD.MM HH:mm for simplicity or try Parse
                    const dateStr = text.trim();
                    // Simple Regex for DD.MM HH:mm
                    const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
                    let targetDate: Date;

                    if (match) {
                        const day = Number(match[1]);
                        const month = Number(match[2]) - 1;
                        const hour = Number(match[3]);
                        const minute = Number(match[4]);
                        const now = new Date();
                        targetDate = new Date(now.getFullYear(), month, day, hour, minute);
                        if (targetDate < now) {
                            // Assuming next year if passed? Or just error. 
                            // Let's assume if month is < current month, it's next year.
                            if (month < now.getMonth()) {
                                targetDate.setFullYear(now.getFullYear() + 1);
                            }
                        }
                    } else {
                        // Try new Date?
                        targetDate = new Date(dateStr);
                    }

                    if (isNaN(targetDate.getTime())) {
                        this.bot?.sendMessage(chatId, "⚠️ Неверный формат даты. Используйте: ДД.ММ ЧЧ:ММ (например: 25.12 18:00)");
                        return;
                    }

                    masterState.gameData = { startTime: targetDate };
                    masterState.state = 'WAITING_MAX';
                    this.bot?.sendMessage(chatId, `📅 Дата: ${targetDate.toLocaleString('ru-RU')}\n\n👥 Введите макс. кол-во игроков (по умолчанию 8):`);
                    return;

                } else if (masterState.state === 'WAITING_MAX') {
                    const max = Number(text);
                    if (isNaN(max) || max < 2) {
                        this.bot?.sendMessage(chatId, "⚠️ Введите число больше 1.");
                        return;
                    }
                    masterState.gameData.maxPlayers = max;
                    masterState.state = 'WAITING_PROMO';
                    this.bot?.sendMessage(chatId, `👥 Всего мест: ${max}\n\n🎟 Сколько из них ПРОМО (бесплатно)?\n(По умолчанию 6, остальные платные):`);
                    return;

                } else if (masterState.state === 'WAITING_PROMO') {
                    const promo = Number(text);
                    if (isNaN(promo) || promo < 0) {
                        this.bot?.sendMessage(chatId, "⚠️ Введите корректное число.");
                        return;
                    }

                    // FINALIZE
                    const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                    const { UserModel } = await import('../models/user.model');
                    const user = await UserModel.findOne({ telegram_id: msg.from?.id });

                    const newGame = new ScheduledGameModel({
                        hostId: user._id,
                        startTime: masterState.gameData.startTime,
                        maxPlayers: masterState.gameData.maxPlayers,
                        promoSpots: promo,
                        price: 20, // Default price $20
                        participants: []
                    });

                    await newGame.save();

                    this.masterStates.delete(chatId);
                    this.bot?.sendMessage(chatId, `✅ Игра успешно создана!\n\n📅 ${newGame.startTime.toLocaleString('ru-RU')}\n👥 Мест: ${newGame.maxPlayers} (Промо: ${newGame.promoSpots})`);
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
                                [{ text: '👑 Set Master', callback_data: 'admin_set_master' }],
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
            } else if (text === '💸 Перевод') {
                this.handleTransferStart(chatId);
            } else if (text === '🌐 Сообщество') {
                this.handleCommunity(chatId);
            } else if (text === 'ℹ️ О проекте') {
                this.handleAbout(chatId);
            } else if (text === '📅 Ближайшие игры') {
                this.handleSchedule(chatId);
            } else if (text === '➕ Добавить игру') {
                this.handleAddGameStart(chatId, msg.from?.id);
            }
        });

        // Keep callback query handler for inline buttons (like in 'Earn' or deep links)
        this.bot.on('callback_query', async (query) => {
            const chatId = query.message?.chat.id;
            const data = query.data;
            const userId = query.from.id;
            if (!chatId || !data) return;

            if (data === 'apply_earn') {
                this.bot?.sendMessage(chatId, 'Отлично! Напишите менеджеру: @Arctur_888');
            } else if (data === 'become_master') {
                await this.handleBecomeMaster(chatId, userId);
            } else if (data.startsWith('join_game_')) {
                const gameId = data.replace('join_game_', '');
                await this.handleJoinGame(chatId, userId, gameId);
            } else if (data.startsWith('join_paid_')) {
                const gameId = data.replace('join_paid_', '');
                await this.handleJoinGame(chatId, userId, gameId, true);
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
            } else if (data === 'admin_set_master') {
                const adminId = process.env.TELEGRAM_ADMIN_ID;
                if (chatId.toString() === adminId) {
                    this.adminStates.set(chatId, { state: 'WAITING_FOR_MASTER_USER' });
                    this.bot?.sendMessage(chatId, "Enter **Username** or **Telegram ID** to set as Master:", { parse_mode: 'Markdown' });
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

    async sendMainMenu(chatId: number, text: string) {
        try {
            const { UserModel } = await import('../models/user.model');
            const user = await UserModel.findOne({ telegram_id: chatId });
            const isMaster = user && user.isMaster && user.masterExpiresAt && user.masterExpiresAt > new Date();

            const keyboard = [
                [{ text: '📅 Ближайшие игры' }, { text: '🎲 Играть' }],
                [{ text: '💸 Заработать' }, { text: '💸 Перевод' }],
                [{ text: '🤝 Получить клиентов' }, { text: '🌐 Сообщество' }],
                [{ text: 'ℹ️ О проекте' }]
            ];

            if (isMaster) {
                // Add "Add Game" button at the top or appropriate place
                keyboard.unshift([{ text: '➕ Добавить игру' }]);
            }

            this.bot?.sendMessage(chatId, text, {
                reply_markup: {
                    keyboard: keyboard,
                    resize_keyboard: true
                }
            });
        } catch (e) {
            console.error("Error sending main menu:", e);
            // Fallback (Regular menu)
            this.bot?.sendMessage(chatId, text, {
                reply_markup: {
                    keyboard: [
                        [{ text: '📅 Ближайшие игры' }, { text: '🎲 Играть' }],
                        [{ text: '💸 Заработать' }, { text: '💸 Перевод' }],
                        [{ text: '🤝 Получить клиентов' }, { text: '🌐 Сообщество' }],
                        [{ text: 'ℹ️ О проекте' }]
                    ],
                    resize_keyboard: true
                }
            });
        }
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
                `🟢 **Зеленый баланс (Вывод/Перевод):** $${user.referralBalance}\n` +
                `🔴 **Красный баланс (Игровой):** $${user.balanceRed || 0}\n` +
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

            // Hardcoded fit to ensure working domain on Railway (Env var might be stale)
            const webAppUrl = 'https://moneo-production-22c8.up.railway.app';
            const link = `${webAppUrl}/?auth=${code}`;

            this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\nЗапускай игру прямо сейчас!\n\n🔗 Твоя ссылка для входа:\n${link}`, {
                reply_markup: {
                    inline_keyboard: [[{ text: '🚀 ЗАПУСТИТЬ', url: link }]]
                }
            });

        } catch (e) {
            console.error("Error generating play link:", e);
            // Fallback
            this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\nЗапускай игру прямо сейчас!\n\n🔗 Ссылка:\nhttps://moneo-production-22c8.up.railway.app`, {
                reply_markup: {
                    inline_keyboard: [[{ text: '🚀 ЗАПУСТИТЬ', url: 'https://moneo-production-22c8.up.railway.app' }]]
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
                    inline_keyboard: [[{ text: 'Стать мастером ($100)', callback_data: 'become_master' }]]
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

    async handleBecomeMaster(chatId: number, telegramId: number) {
        try {
            const { UserModel } = await import('../models/user.model');
            const user = await UserModel.findOne({ telegram_id: telegramId });

            if (!user) {
                this.bot?.sendMessage(chatId, "Ошибка профиля.");
                return;
            }

            if (user.isMaster && user.masterExpiresAt && user.masterExpiresAt > new Date()) {
                this.bot?.sendMessage(chatId, `✅ Вы уже Мастер! Статус активен до ${user.masterExpiresAt.toLocaleDateString()}`);
                this.sendMasterMenu(chatId);
                return;
            }

            // Check Balance (GREEN only for Status)
            if (user.referralBalance >= 100) {
                user.referralBalance -= 100;
                user.isMaster = true;
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                user.masterExpiresAt = nextYear;
                await user.save();

                this.bot?.sendMessage(chatId, `🎉 Поздравляем! Вы стали Мастером!\nСтатус активен до ${user.masterExpiresAt.toLocaleDateString()}\n\nТеперь вам доступна кнопка "Добавить игру".`);
                this.sendMasterMenu(chatId);
            } else {
                this.bot?.sendMessage(chatId, `❌ Недостаточно средств на Зеленом балансе.\nВаш баланс: $${user.referralBalance}.\nСтоимость статуса: $100.`);
            }

        } catch (e) {
            console.error("Error in become master:", e);
        }
    }

    sendMasterMenu(chatId: number) {
        this.bot?.sendMessage(chatId, "Меню Мастера активировано.", {
            reply_markup: {
                keyboard: [
                    [{ text: '➕ Добавить игру' }, { text: '📅 Ближайшие игры' }],
                    [{ text: '🎲 Играть' }, { text: '💸 Заработать' }, { text: '💸 Перевод' }],
                    [{ text: '🤝 Получить клиентов' }, { text: '🌐 Сообщество' }],
                    [{ text: 'ℹ️ О проекте' }]
                ],
                resize_keyboard: true
            }
        });
    }

    handleTransferStart(chatId: number) {
        this.transferStates.set(chatId, { state: 'WAITING_USER' });
        this.bot?.sendMessage(chatId, "💸 **Перевод средств (Зеленый баланс)**\n\nВведите Username или ID получателя:");
    }

    async handleAddGameStart(chatId: number, telegramId?: number) {
        if (!telegramId) return;
        const { UserModel } = await import('../models/user.model');
        const user = await UserModel.findOne({ telegram_id: telegramId });

        if (!user || !user.isMaster) {
            this.bot?.sendMessage(chatId, "⛔️ Доступно только для Мастеров.");
            return;
        }

        // Init State
        this.masterStates.set(chatId, { state: 'WAITING_DATE' });
        this.bot?.sendMessage(chatId, "📅 Введите дату и время игры (формат: ДД.ММ ЧЧ:ММ)\nПример: 25.12 18:00");
    }

    async handleSchedule(chatId: number) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const now = new Date();
            const games = await ScheduledGameModel.find({
                startTime: { $gt: now },
                status: 'SCHEDULED'
            }).sort({ startTime: 1 }).limit(10); // Show next 10 games

            if (games.length === 0) {
                this.bot?.sendMessage(chatId, "😔 Пока нет запланированных игр.\nЗагляните позже!");
                return;
            }

            for (const game of games) {
                const totalParticipants = game.participants.length;
                const freeSpots = game.promoSpots - game.participants.filter((p: any) => p.type === 'PROMO').length;
                const paidSpots = (game.maxPlayers - game.promoSpots) - game.participants.filter((p: any) => p.type === 'PAID').length;

                // Format Text
                const dateStr = new Date(game.startTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

                let text = `🎲 **Игра: ${dateStr}**\n`;
                text += `👥 Игроков: ${totalParticipants}/${game.maxPlayers}\n`;
                text += `🎟 Промо (Free): ${freeSpots > 0 ? freeSpots : '❌ Нет мест'}\n`;
                text += `💰 Платные ($20): ${paidSpots > 0 ? paidSpots : '❌ Нет мест'}\n`;

                // Participants List (Simplified)
                if (totalParticipants > 0) {
                    text += `\nУчастники:\n`;
                    game.participants.forEach((p: any, i: number) => {
                        text += `${i + 1}. ${p.username || 'Игрок'}\n`;
                    });
                }

                const keyboard: any[] = [];
                if (freeSpots > 0) keyboard.push({ text: 'Записаться (Free)', callback_data: `join_game_${game._id}` });
                if (paidSpots > 0) keyboard.push({ text: 'Записаться ($20)', callback_data: `join_paid_${game._id}` });

                this.bot?.sendMessage(chatId, text, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [keyboard] }
                });
            }

        } catch (e) {
            console.error(e);
            this.bot?.sendMessage(chatId, "Ошибка загрузки расписания.");
        }
    }

    async handleJoinGame(chatId: number, telegramId: number, gameId: string, isPaid: boolean = false) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { UserModel } = await import('../models/user.model');

            const game = await ScheduledGameModel.findById(gameId);
            const user = await UserModel.findOne({ telegram_id: telegramId });

            if (!game || !user) {
                this.bot?.sendMessage(chatId, "Игра или пользователь не найдены.");
                return;
            }

            // Check if already registered
            if (game.participants.some((p: any) => p.userId.toString() === user._id.toString())) {
                this.bot?.sendMessage(chatId, "⚠️ Вы уже записаны на эту игру!");
                return;
            }

            // Check Limits
            const promoCount = game.participants.filter((p: any) => p.type === 'PROMO').length;
            const paidCount = game.participants.filter((p: any) => p.type === 'PAID').length;

            if (!isPaid) {
                // Trying to join PROMO
                if (promoCount >= game.promoSpots) {
                    this.bot?.sendMessage(chatId, "😔 Промо-места закончились. Вы можете записаться платно ($20).", {
                        reply_markup: {
                            inline_keyboard: [[{ text: 'Записаться платно ($20)', callback_data: `join_paid_${game._id}` }]]
                        }
                    });
                    return;
                }
                // Check eligibility? User said "Invite friends".
                // Allow simplistic check: Just > 0 referrals? Or just allow everyone as MVP. 
                // "get (promo) for inviting friends"
                // Let's enforce: Must have invited at least 1 friend to use Promo?
                // Or just warning?
                // Let's proceed with OPEN promo for now, as user didn't specify strict rule like "1 invite = 1 game".
                // Just register.

                game.participants.push({
                    userId: user._id,
                    username: user.first_name || user.username,
                    type: 'PROMO'
                });

            } else {
                // Joining PAID
                if (paidCount >= (game.maxPlayers - game.promoSpots)) {
                    // Check total cap strictly?
                    // (Max - Promo) = Paid Spots.
                    // Actually: Total < Max.
                    // If Promo used 6/6. Paid used 2/2. Total 8. Full.
                    // If Promo used 2/6. Paid used 2/2 ??
                    // Usually Promo spots are RESERVED. So Paid spots are (Max - Promo).
                    this.bot?.sendMessage(chatId, "😔 Платные места тоже закончились!");
                    return;
                }

                // Deduct Balance (Priority: Red, then Green)
                let remainingCost = 20;

                if (user.balanceRed >= remainingCost) {
                    user.balanceRed -= remainingCost;
                    remainingCost = 0;
                } else {
                    remainingCost -= (user.balanceRed || 0);
                    user.balanceRed = 0;
                    // Deduct rest from Green
                    if (user.referralBalance >= remainingCost) {
                        user.referralBalance -= remainingCost;
                        remainingCost = 0;
                    }
                }

                if (remainingCost > 0) {
                    this.bot?.sendMessage(chatId, `❌ Недостаточно средств ($20). \n🔴 Red: $${user.balanceRed || 0}\n🟢 Green: $${user.referralBalance}`);
                    return;
                }

                await user.save();

                game.participants.push({
                    userId: user._id,
                    username: user.first_name || user.username,
                    type: 'PAID'
                });
            }

            await game.save();
            this.bot?.sendMessage(chatId, `✅ Вы успешно записаны на игру!\n📅 ${new Date(game.startTime).toLocaleString('ru-RU')}`);

            // Notify Master?
            // this.bot.sendMessage(game.hostId... -> need to fetch host telegramId)

        } catch (e) {
            console.error("Join error:", e);
            this.bot?.sendMessage(chatId, "Ошибка записи на игру.");
        }
    }
}
