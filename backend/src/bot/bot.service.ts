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
    masterStates: Map<number, { state: 'WAITING_DATE' | 'WAITING_TIME' | 'WAITING_MAX' | 'WAITING_PROMO' | 'WAITING_ANNOUNCEMENT_TEXT', gameData?: any, gameId?: string }> = new Map();
    transferStates: Map<number, { state: 'WAITING_USER' | 'WAITING_AMOUNT', targetUser?: any }> = new Map();
    participantStates: Map<number, { state: 'WAITING_POST_LINK', gameId: string }> = new Map();

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
            this.setBotCommands();

            // Start Reminder Interval (Every 5 minutes)
            setInterval(() => this.checkReminders(), 5 * 60 * 1000);

            console.log("Telegram Bot started.");
        }
    }

    async setBotCommands() {
        if (!this.bot) return;

        // Global Commands
        await this.bot.setMyCommands([
            { command: 'start', description: '🏠 Главное меню' },
            { command: 'app', description: '📱 Приложение MONEO' },
            { command: 'about', description: 'ℹ️ О проекте' }
        ]);

        // Admin Commands (Scope: specific user)
        const adminId = process.env.TELEGRAM_ADMIN_ID;
        if (adminId) {
            try {
                await this.bot.setMyCommands([
                    { command: 'start', description: '🏠 Главное меню' },
                    { command: 'admin', description: '👑 Админ панель' },
                    { command: 'app', description: '📱 Приложение MONEO' },
                    { command: 'about', description: 'ℹ️ О проекте' }
                ], { scope: { type: 'chat', chat_id: adminId } });
                console.log(`Admin commands set for ${adminId}`);
            } catch (e) {
                console.error("Failed to set admin commands:", e);
            }
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

        // Admin: Recalculate Balances (Migration Green -> Red)
        this.bot.onText(/\/admin_recalc/, async (msg) => {
            const chatId = msg.chat.id;
            const adminId = process.env.TELEGRAM_ADMIN_ID;
            if (String(chatId) !== String(adminId)) return;

            this.bot?.sendMessage(chatId, "⏳ Starting balance recalculation (Green -> Red)...");
            try {
                const { UserModel } = await import('../models/user.model');
                const users = await UserModel.find({ referralBalance: { $gt: 0 } });

                let count = 0;
                let totalAmount = 0;

                for (const user of users) {
                    const amount = user.referralBalance;
                    user.balanceRed = (user.balanceRed || 0) + amount;
                    user.referralBalance = 0; // Reset Green
                    await user.save();

                    count++;
                    totalAmount += amount;
                }

                this.bot?.sendMessage(chatId, `✅ Recalculation Complete!\nProcessed Users: ${count}\nTotal Moved: $${totalAmount}`);
            } catch (e) {
                console.error("Recalc Result:", e);
                this.bot?.sendMessage(chatId, `❌ Error: ${e}`);
            }
        });

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

            if (text === '/cancel') {
                this.adminStates.delete(chatId);
                this.transferStates.delete(chatId);
                this.masterStates.delete(chatId);
                this.bot?.sendMessage(chatId, "❌ Действие отменено. Главное меню.", {
                    reply_markup: { remove_keyboard: true }
                });
                // Resend Main Menu
                this.sendMainMenu(chatId, "🏠 Главное меню");
                return;
            }

            // Admin State Handling
            const adminState = this.adminStates.get(chatId);
            if (adminState) {
                if (adminState.state === 'WAITING_FOR_BALANCE_USER') {
                    const { UserModel } = await import('../models/user.model');
                    let targetUser = await UserModel.findOne({ username: text.replace('@', '') });
                    if (!targetUser && !isNaN(Number(text))) {
                        targetUser = await UserModel.findOne({ telegram_id: Number(text) });
                    }

                    if (targetUser) {
                        this.adminStates.set(chatId, { state: 'WAITING_FOR_BALANCE_AMOUNT', targetUser: targetUser });
                        this.bot?.sendMessage(chatId, `Selected: ${targetUser.username} (Bal: $${targetUser.referralBalance}).\nEnter amount to add:`);
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
                        this.bot?.sendMessage(chatId, `✅ Added $${amount} to ${targetUser.username}.`);
                        this.adminStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "Invalid amount.");
                    }
                    return;
                } else if (adminState.state === 'WAITING_FOR_MASTER_USER') {
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
                        this.bot?.sendMessage(chatId, `✅ User ${targetUser.username} is now MASTER.`);
                        this.adminStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "User not found. Try again or /cancel.");
                    }
                    return;
                }
            }

            // Transfer State
            const transferState = this.transferStates.get(chatId);
            if (transferState) {
                if (transferState.state === 'WAITING_USER') {
                    const { UserModel } = await import('../models/user.model');
                    let targetUser = await UserModel.findOne({ username: text.replace('@', '') });
                    if (!targetUser && !isNaN(Number(text))) targetUser = await UserModel.findOne({ telegram_id: Number(text) });

                    if (targetUser) {
                        if (targetUser.telegram_id === msg.from?.id) {
                            this.bot?.sendMessage(chatId, "Нельзя переводить самому себе.");
                            return;
                        }
                        transferState.targetUser = targetUser;
                        transferState.state = 'WAITING_AMOUNT';
                        this.bot?.sendMessage(chatId, `✅ Получатель: ${targetUser.username}\nВведите сумму:`);
                    } else {
                        this.bot?.sendMessage(chatId, "Пользователь не найден.");
                    }
                    return;
                } else if (transferState.state === 'WAITING_AMOUNT') {
                    const amount = Number(text);
                    if (isNaN(amount) || amount <= 0) {
                        this.bot?.sendMessage(chatId, "Неверная сумма.");
                        return;
                    }
                    const total = amount * 1.02;
                    const { UserModel } = await import('../models/user.model');
                    const sender = await UserModel.findOne({ telegram_id: msg.from?.id });

                    if (sender.referralBalance < total) {
                        this.bot?.sendMessage(chatId, `❌ Недостаточно средств. Нужно: $${total}`);
                        return;
                    }
                    sender.referralBalance -= total;
                    await sender.save();

                    const receiver = await UserModel.findById(transferState.targetUser._id);
                    receiver.referralBalance += amount;
                    await receiver.save();

                    this.bot?.sendMessage(chatId, `✅ Перевод $${amount} успешен!`);
                    this.bot?.sendMessage(receiver.telegram_id, `📥 Вам пришел перевод $${amount} от ${sender.username}`);
                    this.transferStates.delete(chatId);
                    return;
                }
            }

            // Master State
            const masterState = this.masterStates.get(chatId);
            if (masterState) {
                if (masterState.state === 'WAITING_DATE') {
                    this.bot?.sendMessage(chatId, "⚠️ Используйте кнопки для даты.");
                    return;
                } else if (masterState.state === 'WAITING_TIME') {
                    // Manual Time Input
                    const timeStr = text.trim();
                    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
                    if (match) {
                        const h = Number(match[1]);
                        const m = Number(match[2]);
                        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
                            // Zero pad
                            const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            await this.handleTimeSelection(chatId, formattedTime);
                            return;
                        }
                    }
                    this.bot?.sendMessage(chatId, "⚠️ Неверный формат времени. Введите в формате ЧЧ:ММ (например 13:00) или используйте кнопки.");
                    return;
                } else if (masterState.state === 'WAITING_MAX') {
                    const max = Number(text);
                    if (isNaN(max) || max < 2) {
                        this.bot?.sendMessage(chatId, "Введите число > 1");
                        return;
                    }
                    masterState.gameData.maxPlayers = max;
                    masterState.state = 'WAITING_PROMO';
                    this.bot?.sendMessage(chatId, "Сколько промо-мест?");
                    return;
                } else if (masterState.state === 'WAITING_PROMO') {
                    const promo = Number(text);
                    if (isNaN(promo) || promo < 0) {
                        this.bot?.sendMessage(chatId, "Введите число.");
                        return;
                    }

                    const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                    const { UserModel } = await import('../models/user.model');
                    const user = await UserModel.findOne({ telegram_id: msg.from?.id });

                    const newGame = new ScheduledGameModel({
                        hostId: user._id,
                        startTime: masterState.gameData.startTime,
                        maxPlayers: masterState.gameData.maxPlayers,
                        promoSpots: promo,
                        price: 20,
                        participants: []
                    });
                    await newGame.save();
                    this.masterStates.delete(chatId);
                    this.bot?.sendMessage(chatId, `✅ Игра создана! ${newGame.startTime.toLocaleString()}`);
                    return;
                } else if (masterState.state === 'WAITING_ANNOUNCEMENT_TEXT') {
                    const gameId = masterState.gameId;
                    if (!gameId) {
                        this.bot?.sendMessage(chatId, "Ошибка: ID игры не найден. Начните заново.");
                        this.masterStates.delete(chatId);
                        return;
                    }
                    const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                    const { UserModel } = await import('../models/user.model');

                    const game = await ScheduledGameModel.findById(gameId);
                    if (!game) {
                        this.bot?.sendMessage(chatId, "Игра не найдена.");
                        this.masterStates.delete(chatId);
                        return;
                    }

                    let count = 0;
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) {
                            this.bot?.sendMessage(user.telegram_id, `📢 **Сообщение от организатора:**\n\n${text}`, { parse_mode: 'Markdown' });
                            count++;
                        }
                    }

                    this.bot?.sendMessage(chatId, `✅ Сообщение отправлено ${count} участникам.`);
                    this.masterStates.delete(chatId);
                    return;
                }
            }

            // Participant State
            const participantState = this.participantStates.get(chatId);
            if (participantState) {
                if (participantState.state === 'WAITING_POST_LINK') {
                    // Expecting link
                    // Simple URL validation
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    if (!urlRegex.test(text)) {
                        this.bot?.sendMessage(chatId, "⚠️ Пожалуйста, отправьте корректную ссылку на пост.");
                        return;
                    }

                    // Save Link
                    const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                    const game = await ScheduledGameModel.findById(participantState.gameId);
                    if (game) {
                        const userIdx = game.participants.findIndex((p: any) => p.userId.toString() === msg.from?.id.toString());
                        // Wait, we need to find user by telegram ID first to get _id
                        const { UserModel } = await import('../models/user.model');
                        const user = await UserModel.findOne({ telegram_id: msg.from?.id });

                        // Re-find index with user._id
                        const pRealIndex = game.participants.findIndex((p: any) => p.userId.toString() === user._id.toString());

                        if (pRealIndex > -1 && user) {
                            game.participants[pRealIndex].postLink = text;
                            game.participants[pRealIndex].isVerified = false;
                            await game.save();

                            this.bot?.sendMessage(chatId, "✅ Ссылка принята! Ожидайте подтверждения организатора.");
                            this.participantStates.delete(chatId);

                            // Notify Host
                            const host = await UserModel.findById(game.hostId);
                            if (host) {
                                this.bot?.sendMessage(host.telegram_id, `🔔 Игрок ${user.username || user.first_name} прикрепил ссылку на пост:\n${text}`, {
                                    reply_markup: {
                                        inline_keyboard: [[
                                            { text: '✅ Одобрить', callback_data: `approve_link_${game._id}_${user._id}` },
                                            { text: 'Написать', url: `tg://user?id=${user.telegram_id}` }
                                        ]]
                                    }
                                });
                            }
                        }
                    }
                    return;
                }
            }

            if (text === '/admin') {
                const adminId = process.env.TELEGRAM_ADMIN_ID;
                if (adminId && chatId.toString() === adminId) {
                    this.bot?.sendMessage(chatId, "👑 Admin Panel", {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '💰 Balance', callback_data: 'admin_balance' }],
                                [{ text: '👑 Set Master', callback_data: 'admin_set_master' }, { text: '📤 Upload', callback_data: 'admin_upload' }]
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
                await this.handleClients(chatId);
            } else if (text === '🌐 Сообщество') {
                this.handleCommunity(chatId);
            } else if (text === 'ℹ️ О проекте') {
                this.handleAbout(chatId);
            } else if (text === '/app') {
                this.bot?.sendMessage(chatId, "🚀 Открыть приложение MONEO:", {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "📱 Открыть Mini App", web_app: { url: 'https://moneo.up.railway.app' } }
                        ]]
                    }
                });
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
            } else if (data.startsWith('approve_link_')) {
                // Format: approve_link_GAMEID_USERID
                const parts = data.split('_');
                const gameId = parts[2];
                const targetUserId = parts[3];

                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const { UserModel } = await import('../models/user.model');
                const game = await ScheduledGameModel.findById(gameId);

                if (game) {
                    const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === targetUserId);
                    if (pIndex > -1) {
                        game.participants[pIndex].isVerified = true;
                        await game.save();

                        this.bot?.editMessageText(`✅ Ссылка одобрена для игрока.`, {
                            chat_id: chatId,
                            message_id: query.message?.message_id
                        });

                        // Notify Player
                        const targetUser = await UserModel.findById(targetUserId);
                        if (targetUser) {
                            this.bot?.sendMessage(targetUser.telegram_id, "🎉 Ваша ссылка подтверждена! Вы официально в списке участников.");
                        }
                    }
                }
            } else if (data.startsWith('confirm_player_')) {
                // Confirm just acknowledges the notification visually for now (or marks verified)
                const parts = data.split('_');
                const gameId = parts[2];
                const targetUserId = parts[3];
                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const { UserModel } = await import('../models/user.model');

                const game = await ScheduledGameModel.findById(gameId);
                if (game) {
                    const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === targetUserId);
                    if (pIndex > -1) {
                        // Ensure verified
                        game.participants[pIndex].isVerified = true;
                        await game.save();

                        const targetUser = await UserModel.findById(targetUserId);
                        this.bot?.editMessageText(`✅ Игрок ${targetUser?.first_name} (@${targetUser?.username}) подтвержден.`, {
                            chat_id: chatId,
                            message_id: query.message?.message_id
                        });
                        // Optional: Notify player they are confirmed
                        if (targetUser) {
                            this.bot?.sendMessage(targetUser.telegram_id, "✅ Мастер подтвердил ваше участие в игре!");
                        }
                    } else {
                        this.bot?.sendMessage(chatId, "Игрок уже не в списке.");
                    }
                }
            } else if (data.startsWith('reject_player_')) {
                const parts = data.split('_');
                const gameId = parts[2];
                const targetUserId = parts[3];
                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const { UserModel } = await import('../models/user.model');

                const game = await ScheduledGameModel.findById(gameId);
                if (game) {
                    const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === targetUserId);
                    if (pIndex > -1) {
                        // Remove
                        game.participants.splice(pIndex, 1);
                        await game.save();

                        const targetUser = await UserModel.findById(targetUserId);
                        this.bot?.editMessageText(`❌ Игрок ${targetUser?.first_name} (@${targetUser?.username}) отклонен/удален.`, {
                            chat_id: chatId,
                            message_id: query.message?.message_id
                        });

                        if (targetUser) {
                            this.bot?.sendMessage(targetUser.telegram_id, "❌ Мастер отменил вашу запись на игру. Свяжитесь с организатором, если это ошибка.");
                            // Refund logic if needed? Assuming manual for now or simple removal.
                            // Should probably refund if PAID. But implementing full refund logic is complex (Green vs Red balance). 
                            // For now, keep it simple: Removal.
                        }
                    } else {
                        this.bot?.sendMessage(chatId, "Игрок уже удален.");
                    }
                }
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
            } else if (data === 'start_add_game') {
                await this.handleAddGameStart(chatId, userId);
            } else if (data.startsWith('date_select_')) {
                const dateStr = data.replace('date_select_', '');
                await this.handleDateSelection(chatId, dateStr);
            } else if (data.startsWith('time_select_')) {
                const timeStr = data.replace('time_select_', '');
                await this.handleTimeSelection(chatId, timeStr);
            } else if (data === 'view_schedule') {
                await this.handleSchedule(chatId);
            } else if (data === 'start_transfer') {
                this.handleTransferStart(chatId);
            } else if (data.startsWith('announce_game_')) {
                const gameId = data.replace('announce_game_', '');
                this.masterStates.set(chatId, { state: 'WAITING_ANNOUNCEMENT_TEXT', gameId: gameId });
                this.bot?.sendMessage(chatId, "📢 Введите текст сообщения, которое будет отправлено всем участникам этой игры (или /cancel):");
            } else if (data.startsWith('leave_game_')) {
                const gameId = data.replace('leave_game_', '');
                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const { UserModel } = await import('../models/user.model');

                const game = await ScheduledGameModel.findById(gameId);
                const user = await UserModel.findOne({ telegram_id: userId });

                if (game && user) {
                    const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === user._id.toString());
                    if (pIndex > -1) {
                        const participant = game.participants[pIndex];
                        // Remove participant
                        game.participants.splice(pIndex, 1);
                        await game.save();

                        // Re-render card
                        const cardData = await this.renderGameCard(game, userId);
                        this.bot?.editMessageText(cardData.text, {
                            chat_id: chatId,
                            message_id: query.message?.message_id,
                            parse_mode: 'Markdown',
                            reply_markup: cardData.reply_markup
                        });

                        // Optional: Show pop-up notification
                        this.bot?.answerCallbackQuery(query.id, { text: "❌ Вы отменили запись на игру." });

                        // Notify Host
                        const host = await UserModel.findById(game.hostId);
                        if (host) {
                            this.bot?.sendMessage(host.telegram_id, `ℹ️ Игрок ${user.first_name} (@${user.username}) отменил запись на игру ${new Date(game.startTime).toLocaleString('ru-RU')}.`);
                        }
                    } else {
                        this.bot?.sendMessage(chatId, "Вы не записаны на эту игру.");
                    }
                }
            } else if (data.startsWith('check_time_')) {
                const gameId = data.replace('check_time_', '');
                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const game = await ScheduledGameModel.findById(gameId);

                if (game) {
                    const now = new Date();
                    const start = new Date(game.startTime);
                    const diffMs = start.getTime() - now.getTime();

                    if (diffMs > 0) {
                        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                        let timeStr = "";
                        if (days > 0) timeStr += `${days} дн. `;
                        if (hours > 0) timeStr += `${hours} ч. `;
                        timeStr += `${minutes} мин.`;

                        const moscowTime = start.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

                        this.bot?.answerCallbackQuery(query.id, {
                            text: `⏳ До начала игры: ${timeStr}\n✅ По Москве: ${moscowTime} (МСК)\n\n(Ваше устройство само переведет время, если зайти в календарь)`,
                            show_alert: true
                        });
                    } else {
                        this.bot?.answerCallbackQuery(query.id, {
                            text: `⚠️ Игра уже началась (или прошла)!`,
                            show_alert: true
                        });
                    }
                } else {
                    this.bot?.answerCallbackQuery(query.id, {
                        text: `❌ Игра не найдена.`,
                        show_alert: false
                    });
                }
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

                        // Award Referrer (To Red Balance per request)
                        referrer.balanceRed += 10;
                        referrer.referralsCount += 1;
                        await referrer.save();

                        this.bot?.sendMessage(referrer.telegram_id!, `🎉 У вас новый реферал: ${firstName}! Баланс +$10 (🔴 Red Balance).`);
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
                    inline_keyboard: [
                        [{ text: 'Оставить заявку', callback_data: 'apply_earn' }],
                        [{ text: '💸 Перевод', callback_data: 'start_transfer' }]
                    ]
                }
            });

        } catch (e) {
            console.error("Error in handleEarn:", e);
        }
    }

    async handlePlay(chatId: number) {
        try {
            const { UserModel } = await import('../models/user.model');
            const { AuthService } = await import('../auth/auth.service');
            const authService = new AuthService();
            const user = await UserModel.findOne({ telegram_id: chatId });

            const code = await authService.createAuthCode(chatId);
            const webAppUrl = 'https://moneo.up.railway.app';
            const link = `${webAppUrl}/?auth=${code}`;

            const isMaster = user && user.isMaster && user.masterExpiresAt && user.masterExpiresAt > new Date();

            const keyboard = [
                [{ text: '🚀 ЗАПУСТИТЬ', url: link }],
                [{ text: '📅 Расписание игр', callback_data: 'view_schedule' }]
            ];

            if (isMaster) {
                keyboard.push([{ text: '➕ Добавить игру', callback_data: 'start_add_game' }]);
            }

            this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\nЗапускай игру прямо сейчас или посмотри расписание!`, {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });

        } catch (e) {
            console.error("Error generating play link:", e);
            this.bot?.sendMessage(chatId, "Ошибка запуска.");
        }
    }

    async handleClients(chatId: number) {
        const { UserModel } = await import('../models/user.model');
        const user = await UserModel.findOne({ telegram_id: chatId });
        const isMaster = user && user.isMaster && user.masterExpiresAt && user.masterExpiresAt > new Date();

        const keyboard = [];
        if (isMaster) {
            keyboard.push([{ text: '➕ Добавить игру', callback_data: 'start_add_game' }]);
        } else {
            keyboard.push([{ text: 'Стать мастером ($100)', callback_data: 'become_master' }]);
        }

        let text = `Через игру ты можешь находить новых клиентов и партнёров.\n` +
            `Это современный инструмент продвижения твоего бизнеса и укрепления связей.`;

        if (isMaster) {
            text += `\n\n✅ **Ваш статус Мастера активен до:** ${user.masterExpiresAt.toLocaleDateString('ru-RU')}`;
        }

        this.bot?.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
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

        // Generate Dates (Next 14 days)
        const buttons: any[] = [];
        const now = new Date();

        for (let i = 0; i < 14; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);

            const dayStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });
            const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
            const dateIso = d.toISOString().split('T')[0]; // YYYY-MM-DD

            buttons.push({
                text: `${dayStr} (${weekday})`,
                callback_data: `date_select_${dateIso}`
            });
        }

        // Group into rows of 3
        const keyboard: any[] = [];
        for (let i = 0; i < buttons.length; i += 3) {
            keyboard.push(buttons.slice(i, i + 3));
        }

        this.bot?.sendMessage(chatId, "📅 Выберите дату игры:", {
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleDateSelection(chatId: number, dateIso: string) {
        const state = this.masterStates.get(chatId);
        if (!state) return;

        state.gameData = { dateIso: dateIso };
        state.state = 'WAITING_TIME'; // Update state to allow manual input

        // Time Slots
        const times = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00'];
        const buttons = times.map(t => ({ text: t, callback_data: `time_select_${t}` }));

        // Group rows of 4
        const keyboard: any[] = [];
        for (let i = 0; i < buttons.length; i += 4) {
            keyboard.push(buttons.slice(i, i + 4));
        }

        this.bot?.sendMessage(chatId, `🗓 Дата: ${dateIso}\n⏰ Выберите время (МСК):`, {
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleTimeSelection(chatId: number, timeStr: string) {
        const state = this.masterStates.get(chatId);
        if (!state || !state.gameData || !state.gameData.dateIso) {
            this.bot?.sendMessage(chatId, "⚠️ Ошибка состояния. Начните заново.");
            return;
        }

        // Combine
        const [hours, minutes] = timeStr.split(':').map(Number);
        const dateParts = state.gameData.dateIso.split('-').map(Number); // YYYY, MM, DD

        // Create Date object (assuming Server Time is mostly aligned or we treat it as local)
        // Note: new Date(Y, M-1, D, H, m)
        const finalDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes);

        state.gameData.startTime = finalDate;
        state.state = 'WAITING_MAX';

        this.bot?.sendMessage(chatId, `✅ Дата и время: ${finalDate.toLocaleString('ru-RU')}\n\n👥 Введите макс. кол-во игроков (по умолчанию 8):`);
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

            // Determine requester status
            const { UserModel } = await import('../models/user.model');
            const requester = await UserModel.findOne({ telegram_id: chatId });
            const isRequesterMaster = requester?.isMaster || false;

            for (const game of games) {
                const cardData = await this.renderGameCard(game, chatId);
                this.bot?.sendMessage(chatId, cardData.text, {
                    parse_mode: 'Markdown',
                    reply_markup: cardData.reply_markup
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

                game.participants.push({
                    userId: user._id,
                    username: user.username,
                    firstName: user.first_name || 'Игрок',
                    type: 'PROMO',
                    joinedAt: new Date(),
                    isVerified: false
                });

                // Request Link
                this.participantStates.set(chatId, { state: 'WAITING_POST_LINK', gameId: game._id });
                this.bot?.sendMessage(chatId, `✅ Вы успешно записаны на игру (PROMO)!\n\n📝 Для подтверждения участия, пожалуйста, отправьте ссылку на репост о нашей игре в течение 3 часов.`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: '❌ Отменить запись', callback_data: `leave_game_${game._id}` }]]
                    }
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
                    username: user.username,
                    firstName: user.first_name || 'Игрок',
                    type: 'PAID',
                    joinedAt: new Date(),
                    isVerified: true // Paid users auto-verified? Or assume no post needed.
                });
            }

            await game.save();

            if (isPaid) {
                this.bot?.sendMessage(chatId, `✅ Вы успешно записаны на игру (PAID)!\n📅 ${new Date(game.startTime).toLocaleString('ru-RU')}`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: '❌ Отменить запись', callback_data: `leave_game_${game._id}` }]]
                    }
                });
            } else {
                // Already sent message above
            }

            // Notify Master
            const host = await UserModel.findById(game.hostId);
            if (host) {
                this.bot?.sendMessage(host.telegram_id,
                    `🆕 Игрок ${user.first_name} (@${user.username}) записался на игру (тип: ${isPaid ? 'PAID' : 'PROMO'}).`,
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Подтвердить', callback_data: `confirm_player_${game._id}_${user._id}` },
                                { text: '❌ Отменить', callback_data: `reject_player_${game._id}_${user._id}` }
                            ]]
                        }
                    }
                );
            }

        } catch (e) {
            console.error("Join error:", e);
            this.bot?.sendMessage(chatId, "Ошибка записи на игру.");
        }
    }


    async renderGameCard(game: any, requesterId: number) {
        // Dynamic import if needed, or assume models loaded
        const { UserModel } = await import('../models/user.model');
        const requester = await UserModel.findOne({ telegram_id: requesterId });
        const isRequesterMaster = requester?.isMaster || false;

        const totalParticipants = game.participants.length;
        const freeSpots = game.promoSpots - game.participants.filter((p: any) => p.type === 'PROMO').length;
        const paidSpots = (game.maxPlayers - game.promoSpots) - game.participants.filter((p: any) => p.type === 'PAID').length;

        // Create text
        const dateStr = new Date(game.startTime).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Moscow'
        });

        // Helper to escape Markdown
        const escapeMd = (s: string) => s.replace(/[_*[`]/g, '\\$&');

        // Fetch Host
        const host = await UserModel.findById(game.hostId);
        const hostName = host ? (host.username ? `@${escapeMd(host.username)}` : escapeMd(host.first_name || '')) : 'Неизвестно';

        let text = `🎲 **Игра: ${dateStr} (МСК)**\n`;
        text += `👑 Мастер: ${hostName}\n`;
        text += `👥 Игроков: ${totalParticipants}/${game.maxPlayers}\n`;
        text += `🎟 Промо (Free): ${freeSpots > 0 ? freeSpots : '❌ Нет мест'}\n`;
        text += `💰 Платные ($20): ${paidSpots > 0 ? paidSpots : '❌ Нет мест'}\n`;

        // Participants List
        if (totalParticipants > 0) {
            text += `\nУчастники:\n`;
            game.participants.forEach((p: any, i: number) => {
                const verifiedMark = p.isVerified ? '✅' : '';
                // Privacy Logic
                let name = escapeMd(p.firstName || 'Игрок');
                let line = `${i + 1}. ${name} ${verifiedMark}`;
                if (isRequesterMaster) {
                    const uname = p.username ? `@${escapeMd(p.username)}` : 'no\\_user';
                    line += ` (${uname})`;
                }
                text += `${line}\n`;
            });
        }

        const keyboard: any[] = [];
        // Safety check for p.userId
        const isParticipant = requester && game.participants.some((p: any) => p.userId && requester._id && p.userId.toString() === requester._id.toString());

        if (isParticipant) {
            keyboard.push({ text: '❌ Отменить запись', callback_data: `leave_game_${game._id}` });
        } else {
            if (freeSpots > 0) keyboard.push({ text: 'Записаться (Free)', callback_data: `join_game_${game._id}` });
            if (paidSpots > 0) keyboard.push({ text: 'Записаться ($20)', callback_data: `join_paid_${game._id}` });
        }

        // Smart Time Button (Visible to everyone)
        keyboard.push({ text: '🕒 Когда начало?', callback_data: `check_time_${game._id}` });

        // Host Actions
        if (isRequesterMaster && game.hostId && requester._id.toString() === game.hostId.toString()) {
            keyboard.push({ text: '📢 Отправить сообщение игрокам', callback_data: `announce_game_${game._id}` });
        }

        return { text, reply_markup: { inline_keyboard: [keyboard] } };
    }

    async checkReminders() {
        const now = new Date();
        const hour = now.getHours(); // Local server time. 
        // 9:00 - 21:00 Check (Only for PROMO link reminders, global reminders should run always?)
        // User request: "send notification every 3 hours in working time 9.00 -21.00" -> this was for POST LINK.
        // For game reminders (24h, 30m), maybe acceptable anytime? Assuming yes.

        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { UserModel } = await import('../models/user.model');

            // Find upcoming games
            const games = await ScheduledGameModel.find({
                status: 'SCHEDULED'
            });

            for (const game of games) {
                const diffMs = new Date(game.startTime).getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                const diffMinutes = diffMs / (1000 * 60);
                let gameModified = false;

                // 1. 24 Hour Reminder (23-25h window to be safe)
                if (!game.reminder24hSent && diffHours <= 24 && diffHours > 23) {
                    // Send to all
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) this.bot?.sendMessage(user.telegram_id, `⏰ Напоминание: Игра через 24 часа! (${new Date(game.startTime).toLocaleString('ru-RU')})`);
                    }
                    game.reminder24hSent = true;
                    gameModified = true;
                }

                // 2. 30 Minute Reminder (25-35m window)
                if (!game.reminder30mSent && diffMinutes <= 30 && diffMinutes > 0) {
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) this.bot?.sendMessage(user.telegram_id, `⏰ Напоминание: Игра начинается через 30 минут!`);
                    }
                    game.reminder30mSent = true;
                    gameModified = true;
                }

                // 3. Start Reminder (0-5m window or slightly past?)
                if (!game.reminderStartSent && diffMinutes <= 0 && diffMinutes > -10) {
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) this.bot?.sendMessage(user.telegram_id, `🚀 Игра начинается! Ссылка на подключение: [Здесь будет ссылка] (Свяжитесь с мастером)`);
                    }
                    game.reminderStartSent = true;
                    gameModified = true;
                }

                // 4. Promo Link Verification Reminder (Only 9-21)
                if (hour >= 9 && hour < 21) {
                    for (const p of game.participants) {
                        if (p.type === 'PROMO' && !p.isVerified) {
                            const lastTime = p.lastReminderSentAt || p.joinedAt;
                            const verifyDiffMs = now.getTime() - new Date(lastTime).getTime();
                            const verifyDiffHours = verifyDiffMs / (1000 * 60 * 60);

                            if (verifyDiffHours >= 3) {
                                const user = await UserModel.findById(p.userId);
                                if (user) {
                                    this.bot?.sendMessage(user.telegram_id, "⏰ Напоминание! \nВы записались на игру (PROMO), но не прикрепили ссылку на пост.\nПожалуйста, отправьте ссылку на репост, чтобы подтвердить участие.");
                                    p.lastReminderSentAt = now;
                                    gameModified = true;
                                }
                            }
                        }
                    }
                }

                if (gameModified) await game.save();
            }
        } catch (e) {
            console.error("Reminder Error:", e);
        }
    }
}
