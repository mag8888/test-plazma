import TelegramBot from 'node-telegram-bot-api';

// Transfer State
type TransferState = {
    state: 'WAITING_USER' | 'WAITING_AMOUNT';
    recipientId?: string;
    targetUser?: any;
};

// Broadcast State
type BroadcastState = {
    state: 'WAITING_TEXT' | 'WAITING_PHOTO' | 'SELECTING_CATEGORY' | 'SELECTING_USERS';
    text?: string;
    photoId?: string;
    category?: 'all' | 'avatars' | 'balance' | 'custom';
    selectedUsers?: string[]; // User IDs for custom selection
};
import dotenv from 'dotenv';
import { CloudinaryService } from '../services/cloudinary.service';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not provided, bot will not start.");
}

export class BotService {
    bot: TelegramBot | null = null;
    adminStates: Map<number, { state: string, targetUser?: any }> = new Map();
    masterStates: Map<number, { state: 'WAITING_DATE' | 'WAITING_TIME' | 'WAITING_MAX' | 'WAITING_PROMO' | 'WAITING_ANNOUNCEMENT_TEXT' | 'WAITING_EDIT_TIME' | 'WAITING_EDIT_MAX' | 'WAITING_EDIT_PROMO' | 'WAITING_ADD_PLAYER', gameData?: any, gameId?: string }> = new Map();
    transferStates: Map<number, TransferState> = new Map();
    broadcastStates: Map<number, BroadcastState> = new Map();
    participantStates: Map<number, { state: 'WAITING_POST_LINK', gameId: string }> = new Map();
    photoUploadStates: Map<number, { state: 'WAITING_PHOTO' }> = new Map();
    cloudinaryService: CloudinaryService;

    constructor() {
        this.cloudinaryService = new CloudinaryService();
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



        // Admin: Fix Schedule Times (-3 hours shift)
        this.bot.onText(/\/admin_fix_schedule/, async (msg) => {
            const chatId = msg.chat.id;
            const adminId = process.env.TELEGRAM_ADMIN_ID;
            if (String(chatId) !== String(adminId)) return;

            this.bot?.sendMessage(chatId, "⏳ Shifting scheduled games -3 hours...");
            try {
                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const games = await ScheduledGameModel.find({ status: 'SCHEDULED' });

                let count = 0;
                for (const game of games) {
                    // Subtract 3 hours from startTime
                    const original = new Date(game.startTime);
                    game.startTime = new Date(original.getTime() - 3 * 60 * 60 * 1000);
                    await game.save();
                    count++;
                }

                this.bot?.sendMessage(chatId, `✅ Schedule Fixed!\nUpdated ${count} games.`);
            } catch (e) {
                this.bot?.sendMessage(chatId, `❌ Error: ${e}`);
            }
        });

        // /admin_sync command
        this.bot.onText(/\/admin_sync/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id;
            const isAdmin = process.env.ADMIN_IDS?.split(',').includes(String(telegramId));
            if (!isAdmin) return;
            this.adminStates.set(chatId, { state: 'WAITING_FOR_SYNC_USER' });
            this.bot?.sendMessage(chatId, "Enter username or ID to force sync:");
        });

        // /broadcast command - Admin mass messaging
        this.bot.onText(/\/broadcast/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id;
            const isAdmin = process.env.ADMIN_IDS?.split(',').includes(String(telegramId));
            if (!isAdmin) {
                this.bot?.sendMessage(chatId, "⛔ Доступно только для админа.");
                return;
            }

            this.broadcastStates.set(chatId, { state: 'WAITING_TEXT' });
            this.bot?.sendMessage(chatId, "📢 **Рассылка**\\n\\nВведите текст сообщения:", { parse_mode: 'Markdown' });
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
                `Добро пожаловать в MONEO ✨\n` +
                `— пространство, где игра соединяется с реальными возможностями в квантовом поле.\n\n` +
                `Здесь ты сможешь:\n` +
                `🫂 Найти друзей\n` +
                `💰 Увеличить доход\n` +
                `🤝 Получить клиентов\n` +
                `🎲 Играть и развиваться\n\n` +
                `🎯 Выбирай, что интересно прямо сейчас 👇`;

            await this.sendMainMenu(chatId, welcomeText);
        });

        // /upload_photo command
        this.bot.onText(/\/upload_photo/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id;

            if (!telegramId) return;

            this.photoUploadStates.set(chatId, { state: 'WAITING_PHOTO' });
            this.bot?.sendMessage(chatId, "📸 **Загрузка фото**\n\nОтправьте ваше фото, которое будет использоваться в игре как ваш аватар.\n\nДля отмены используйте /cancel", {
                parse_mode: 'Markdown'
            });
        });

        // /restore command - Admin only
        this.bot.onText(/\/restore/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id;

            const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
            if (process.env.TELEGRAM_ADMIN_ID) {
                adminIds.push(process.env.TELEGRAM_ADMIN_ID.trim());
            }

            const isAdmin = adminIds.includes(String(telegramId));

            if (!isAdmin) {
                this.bot?.sendMessage(chatId, `⛔ Access Denied. (Your ID: ${telegramId})`);
                return;
            }

            this.bot?.sendMessage(chatId, "⏳ Starting Database Restoration...\nThis may take a minute.");

            try {
                // Dynamically import restore logic
                const { listBackups, restoreBackup } = await import('../restore_db');

                const backups = await listBackups();
                if (backups.length === 0) {
                    this.bot?.sendMessage(chatId, "❌ No backups found in Cloudinary.");
                    return;
                }

                const latest = backups[0];
                this.bot?.sendMessage(chatId, `📥 Found backup: ${latest.created_at}\nRestoring from: ${latest.secure_url}`);

                await restoreBackup(latest.secure_url);

                this.bot?.sendMessage(chatId, "✅ Full Database Restored Successfully!");
            } catch (e: any) {
                console.error("Restore Error:", e);
                this.bot?.sendMessage(chatId, `❌ Restore Failed:\n${e.message}`);
            }
        });

        // Handle Photos
        this.bot.on('photo', async (msg) => {
            const chatId = msg.chat.id;
            const photoState = this.photoUploadStates.get(chatId);

            if (photoState && photoState.state === 'WAITING_PHOTO') {
                const photo = msg.photo![msg.photo!.length - 1]; // Get highest resolution
                try {
                    const fileLink = await this.bot?.getFileLink(photo.file_id);
                    if (fileLink) {
                        await this.bot?.sendMessage(chatId, "⏳ Обработка фото...", { disable_notification: true });
                        const imageUrl = await this.cloudinaryService.uploadImage(fileLink);

                        const { UserModel } = await import('../models/user.model');
                        const user = await UserModel.findOne({ telegram_id: chatId });

                        if (user) {
                            user.photo_url = imageUrl;
                            await user.save();
                            await this.bot?.sendMessage(chatId, "✅ Фото профиля обновлено!");
                        } else {
                            await this.bot?.sendMessage(chatId, "❌ Пользователь не найден.");
                        }
                    }
                } catch (e) {
                    console.error("Photo upload error:", e);
                    await this.bot?.sendMessage(chatId, "❌ Ошибка загрузки. Попробуйте еще раз.");
                }
                this.photoUploadStates.delete(chatId);
            }
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
                this.photoUploadStates.delete(chatId);
                this.bot?.sendMessage(chatId, "❌ Действие отменено. Главное меню.", {
                    reply_markup: { remove_keyboard: true }
                });
                // Resend Main Menu
                this.sendMainMenu(chatId, "🏠 Главное меню");
                return;
            }

            // 0. GLOBAL COMMAND OVERRIDE
            // If user clicks a Menu Button while in a "Waiting" state, we must prioritize the Menu Button
            const GLOBAL_COMMANDS = ['💸 Заработать', '🎲 Играть', '🤝 Получить клиентов', '🌐 Сообщество', 'ℹ️ О проекте', '📋 Мои игры', '/app', '🔑 Получить пароль'];
            if (GLOBAL_COMMANDS.includes(text)) {
                this.adminStates.delete(chatId);
                this.transferStates.delete(chatId);
                this.masterStates.delete(chatId);
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
                        let targetUser = adminState.targetUser;
                        targetUser.referralBalance += amount;
                        await targetUser.save();

                        // 1. Log Transaction
                        try {
                            const { TransactionModel } = await import('../models/transaction.model');
                            await TransactionModel.create({
                                userId: targetUser._id,
                                amount: amount,
                                currency: 'GREEN',
                                type: 'DEPOSIT',
                                description: `Admin Top-Up via Bot`
                            });
                        } catch (err) {
                            console.error("Failed to log transaction:", err);
                        }

                        // 2. Sync with Partnership Backend (if configured)
                        const partnershipUrl = process.env.PARTNERSHIP_API_URL;
                        if (!partnershipUrl) throw new Error("PARTNERSHIP_API_URL not set");
                        const adminSecret = process.env.ADMIN_SECRET || 'supersecret';

                        try {
                            // Update Green Balance in Partnership Service
                            await fetch(`${partnershipUrl}/api/admin/balance`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-admin-secret': adminSecret
                                },
                                body: JSON.stringify({
                                    userId: targetUser.telegram_id || targetUser._id.toString(), // Prefer Telegram ID for sync consistency
                                    amount: amount,
                                    type: 'GREEN'
                                })
                            });
                        } catch (err) {
                            console.error("Failed to sync partnership balance:", err);
                            // Verify if it failed because user doesn't exist in partnership DB yet.
                            // Login endpoint creates user. We might need to call login first?
                            // Or trust that user logged in app once? 
                            // If silent fail, it's okay-ish for now.
                        }

                        const { UserModel } = await import('../models/user.model');
                        // Refresh user
                        targetUser = await UserModel.findById(targetUser._id);
                        this.bot?.sendMessage(chatId, `✅ Added $${amount} to ${targetUser.username}.\n💰 Legacy Bal: $${targetUser.referralBalance}\n(Attempted Sync to Green Balance).`);
                        this.adminStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "Invalid amount.");
                    }
                    return;
                } else if (adminState.state === 'WAITING_FOR_SYNC_USER') {
                    const { UserModel } = await import('../models/user.model');
                    let targetUser = await UserModel.findOne({ username: text.replace('@', '') });
                    if (!targetUser && !isNaN(Number(text))) {
                        targetUser = await UserModel.findOne({ telegram_id: Number(text) });
                    }
                    if (targetUser) {
                        // Force Sync Logic
                        const partnershipUrl = process.env.PARTNERSHIP_API_URL;
                        if (!partnershipUrl) throw new Error("PARTNERSHIP_API_URL not set");
                        const adminSecret = process.env.ADMIN_SECRET || 'supersecret';
                        try {
                            if (targetUser.referralBalance > 0) {
                                await fetch(`${partnershipUrl}/api/admin/balance`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
                                    body: JSON.stringify({
                                        userId: targetUser.telegram_id || targetUser._id.toString(),
                                        amount: targetUser.referralBalance,
                                        type: 'GREEN'
                                    })
                                });
                                this.bot?.sendMessage(chatId, `✅ Synced $${targetUser.referralBalance} for ${targetUser.username}.`);
                                targetUser.referralBalance = 0;
                                await targetUser.save();
                            } else {
                                this.bot?.sendMessage(chatId, `⚠️ No pending balance to sync for ${targetUser.username}.`);
                            }
                        } catch (e) {
                            this.bot?.sendMessage(chatId, `❌ Sync failed: ${e}`);
                        }
                        this.adminStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "User not found.");
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

            // Broadcast State Handling
            const broadcastState = this.broadcastStates.get(chatId);
            if (broadcastState) {
                if (broadcastState.state === 'WAITING_TEXT') {
                    broadcastState.text = text;
                    broadcastState.state = 'WAITING_PHOTO';
                    this.bot?.sendMessage(chatId, "✅ Текст сохранен.\\n\\n📸 Отправьте фото (или /skip чтобы пропустить):");
                    return;
                } else if (broadcastState.state === 'WAITING_PHOTO' && text === '/skip') {
                    broadcastState.state = 'SELECTING_CATEGORY';
                    this.showCategorySelection(chatId);
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
                    this.bot?.sendMessage(chatId, `✅ Игра создана! ${newGame.startTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
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

                    // Build recipient list with usernames
                    const recipients: string[] = [];
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) {
                            const displayName = user.username ? `@${user.username}` : user.first_name;
                            recipients.push(`• ${displayName}`);
                        }
                    }

                    // Show preview with recipient list
                    const recipientList = recipients.length > 0 ? recipients.join('\n') : 'Нет участников';
                    const previewMessage = `📋 **Сообщение будет отправлено:**\n\n${recipientList}\n\n**Текст:**\n${text}\n\n✅ Отправить?`;

                    this.bot?.sendMessage(chatId, previewMessage, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Отправить всем', callback_data: `confirm_announce_${gameId}` },
                                { text: '❌ Отменить', callback_data: 'cancel_announce' }
                            ]]
                        }
                    });

                    // Save message text in state for confirmation
                    this.masterStates.set(chatId, { state: 'WAITING_ANNOUNCEMENT_TEXT', gameId, gameData: { text } });
                    return;
                } else if (masterState.state === 'WAITING_EDIT_TIME') {
                    const gameId = masterState.gameId;
                    const timeStr = text.trim();
                    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
                    if (match && gameId) {
                        const h = Number(match[1]);
                        const m = Number(match[2]);
                        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
                            // Update Game Time
                            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                            const game = await ScheduledGameModel.findById(gameId);
                            if (game) {
                                const original = new Date(game.startTime);
                                // Keep date, change time. Input is MSK. 
                                // Need to construct UTC.
                                // 1. Get Date parts from original (already UTC).
                                const dateStr = original.toISOString().split('T')[0]; // YYYY-MM-DD
                                const [year, month, day] = dateStr.split('-').map(Number);

                                const newDate = new Date(Date.UTC(year, month - 1, day, h, m));
                                newDate.setHours(newDate.getHours() - 3);

                                game.startTime = newDate;
                                await game.save();
                                this.bot?.sendMessage(chatId, `✅ Время изменено на ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} (МСК)`);
                            }
                            this.masterStates.delete(chatId);
                        } else {
                            this.bot?.sendMessage(chatId, "Неверное время.");
                        }
                    } else {
                        this.bot?.sendMessage(chatId, "Ошибка формата ЧЧ:ММ");
                    }
                    return;
                } else if (masterState.state === 'WAITING_EDIT_MAX') {
                    const gameId = masterState.gameId;
                    const max = Number(text);
                    if (!isNaN(max) && max > 1 && gameId) {
                        const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                        const game = await ScheduledGameModel.findById(gameId);
                        if (game) {
                            game.maxPlayers = max;
                            await game.save();
                            this.bot?.sendMessage(chatId, `✅ Количество мест изменено на ${max}.`);
                        }
                        this.masterStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "Введите число > 1.");
                    }
                    return;
                } else if (masterState.state === 'WAITING_EDIT_PROMO') {
                    const gameId = masterState.gameId;
                    const promo = Number(text);
                    if (!isNaN(promo) && promo >= 0 && gameId) {
                        const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                        const game = await ScheduledGameModel.findById(gameId);
                        if (game) {
                            game.promoSpots = promo;
                            await game.save();
                            this.bot?.sendMessage(chatId, `✅ Количество промо-мест изменено на ${promo}.`);
                        }
                        this.masterStates.delete(chatId);
                    } else {
                        this.bot?.sendMessage(chatId, "Введите число >= 0.");
                    }
                    return;
                } else if (masterState.state === 'WAITING_ADD_PLAYER') {
                    const gameId = masterState.gameId;
                    const input = text.trim().replace('@', '');

                    if (gameId) {
                        const { UserModel } = await import('../models/user.model');
                        const { ScheduledGameModel } = await import('../models/scheduled-game.model');

                        let targetUser = await UserModel.findOne({ username: input });
                        if (!targetUser && !isNaN(Number(input))) {
                            targetUser = await UserModel.findOne({ telegram_id: Number(input) });
                        }

                        if (!targetUser) {
                            this.bot?.sendMessage(chatId, "❌ Пользователь не найден. Проверьте Username/ID.");
                            return;
                        }

                        const game = await ScheduledGameModel.findById(gameId);
                        if (!game) {
                            this.bot?.sendMessage(chatId, "Игра не найдена.");
                            return;
                        }

                        // Check if already in
                        if (game.participants.some((p: any) => p.userId.toString() === targetUser._id.toString())) {
                            this.bot?.sendMessage(chatId, "⚠️ Этот пользователь уже в игре.");
                            return;
                        }

                        // Add
                        game.participants.push({
                            userId: targetUser._id,
                            firstName: targetUser.first_name,
                            username: targetUser.username,
                            type: 'PAID', // Manual add = VIP/Paid usually
                            joinedAt: new Date(),
                            isVerified: true // Master added manually
                        });
                        await game.save();

                        this.bot?.sendMessage(chatId, `✅ Игрок ${targetUser.first_name} (@${targetUser.username}) добавлен!`);
                        this.bot?.sendMessage(targetUser.telegram_id, `🎉 Вы были добавлены в игру ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} организатором!`);

                        this.masterStates.delete(chatId);
                    }
                    return;
                }
            }

            // Participant State


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
                            { text: "📱 Открыть Mini App", web_app: { url: process.env.FRONTEND_URL || 'https://moneo.up.railway.app' } }
                        ]]
                    }
                });
            } else if (text === '🤝 Партнерская программа') {
                await this.handlePartnership(chatId);
            } else if (text === '📋 Мои игры') {
                const userId = msg.from?.id;
                if (userId) await this.handleMyGames(chatId, userId);
            } else if (text === '🔑 Получить пароль') {
                await this.handleGetPassword(chatId, msg.from?.id);
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
            } else if (data === 'partnership_info') {
                await this.handlePartnership(chatId);
            } else if (data === 'get_password') {
                await this.handleGetPassword(chatId, userId);
            } else if (data === 'become_master') {
                await this.handleBecomeMaster(chatId, userId);
            } else if (data.startsWith('join_game_')) {
                const gameId = data.replace('join_game_', '');
                await this.handleJoinGame(chatId, userId, gameId);
            } else if (data.startsWith('join_paid_')) {
                const gameId = data.replace('join_paid_', '');
                await this.handleJoinGame(chatId, userId, gameId, true);
            } else if (data.startsWith('join_onsite_')) {
                const gameId = data.replace('join_onsite_', '');
                await this.handleJoinGame(chatId, userId, gameId, false, true);
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
            } else if (data.startsWith('skip_post_link_')) {
                this.participantStates.delete(chatId);
                this.bot?.sendMessage(chatId, "⚠️ Ок. Напоминаем: без подтверждения репоста Мастер может исключить вас из списка. Вы можете отправить ссылку позже, просто написав ее сюда.");
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
            } else if (data.startsWith('manage_game_')) {
                const gameId = data.replace('manage_game_', '');
                await this.handleManageGame(chatId, gameId);
            } else if (data.startsWith('edit_time_')) {
                const gameId = data.replace('edit_time_', '');
                this.masterStates.set(chatId, { state: 'WAITING_EDIT_TIME', gameId });
                this.bot?.sendMessage(chatId, "⏰ Введите новое время (МСК) в формате ЧЧ:ММ (например 19:00):");

            } else if (data.startsWith('edit_max_')) {
                const gameId = data.replace('edit_max_', '');
                this.masterStates.set(chatId, { state: 'WAITING_EDIT_MAX', gameId });
                this.bot?.sendMessage(chatId, "👥 Введите новое кол-во мест (число):");
            } else if (data.startsWith('edit_promo_')) {
                const gameId = data.replace('edit_promo_', '');
                this.masterStates.set(chatId, { state: 'WAITING_EDIT_PROMO', gameId });
                this.bot?.sendMessage(chatId, "🎟 Введите новое кол-во промо-мест (число):");
            } else if (data.startsWith('add_player_')) {
                const gameId = data.replace('add_player_', '');
                this.masterStates.set(chatId, { state: 'WAITING_ADD_PLAYER', gameId });
                this.bot?.sendMessage(chatId, "➕ Введите **Username** (например @durov) или **Telegram ID** игрока:", { parse_mode: 'Markdown' });
            } else if (data.startsWith('view_participants_')) {
                const gameId = data.replace('view_participants_', '');
                await this.handleViewParticipants(chatId, gameId);
            } else if (data.startsWith('broadcast_game_')) {
                const gameId = data.replace('broadcast_game_', '');
                this.masterStates.set(chatId, { state: 'WAITING_ANNOUNCEMENT_TEXT', gameId });
                this.bot?.sendMessage(chatId, "📢 Введите текст сообщения для рассылки всем участникам:");
            } else if (data.startsWith('cancel_game_')) {
                const gameId = data.replace('cancel_game_', '');
                await this.handleCancelGame(chatId, gameId);
            } else if (data.startsWith('manage_player_')) {
                // Format: manage_player_GAMEID_USERID
                const parts = data.split('_');
                const gameId = parts[2];
                const targetUserId = parts[3];
                await this.handleManagePlayer(chatId, gameId, targetUserId);
            } else if (data.startsWith('kick_player_')) {
                // Format: kick_player_GAMEID_USERID
                const parts = data.split('_');
                const gameId = parts[2];
                const targetUserId = parts[3];
                await this.handleKickPlayer(chatId, gameId, targetUserId);
            } else if (data === 'start_transfer') {
                this.handleTransferStart(chatId);
            } else if (data.startsWith('broadcast_category_')) {
                // Category selection
                const category = data.replace('broadcast_category_', '');
                await this.executeBroadcast(chatId, category);
            } else if (data.startsWith('broadcast_confirm_')) {
                // Confirm and send
                const category = data.replace('broadcast_confirm_', '');
                this.bot?.editMessageText("📤 Отправка...", {
                    chat_id: chatId,
                    message_id: query.message?.message_id
                });
                await this.sendBroadcast(chatId);
            } else if (data === 'broadcast_cancel') {
                // Cancel broadcast
                this.broadcastStates.delete(chatId);
                this.bot?.editMessageText("❌ Рассылка отменена.", {
                    chat_id: chatId,
                    message_id: query.message?.message_id
                });
            } else if (data.startsWith('announce_game_')) {
                const gameId = data.replace('announce_game_', '');
                this.masterStates.set(chatId, { state: 'WAITING_ANNOUNCEMENT_TEXT', gameId: gameId });
                this.bot?.sendMessage(chatId, "📢 Введите текст сообщения, которое будет отправлено всем участникам этой игры (или /cancel):");
            } else if (data.startsWith('confirm_announce_')) {
                // Send announcement after confirmation
                const gameId = data.replace('confirm_announce_', '');
                const masterState = this.masterStates.get(chatId);

                if (!masterState || !masterState.gameData?.text) {
                    this.bot?.answerCallbackQuery(query.id, { text: 'Ошибка: текст сообщения не найден' });
                    return;
                }

                const text = masterState.gameData.text;
                const { ScheduledGameModel } = await import('../models/scheduled-game.model');
                const { UserModel } = await import('../models/user.model');

                const game = await ScheduledGameModel.findById(gameId);
                if (!game) {
                    this.bot?.answerCallbackQuery(query.id, { text: 'Игра не найдена' });
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

                // Send copy to Master
                const host = await UserModel.findById(game.hostId);
                if (host) {
                    this.bot?.sendMessage(host.telegram_id, `📢 **(Копия) Сообщение от организатора:**\n\n${text}`, { parse_mode: 'Markdown' });
                }

                this.bot?.editMessageText(`✅ Сообщение отправлено ${count} участникам.`, {
                    chat_id: chatId,
                    message_id: query.message?.message_id
                });

                this.masterStates.delete(chatId);
            } else if (data === 'cancel_announce') {
                this.masterStates.delete(chatId);
                this.bot?.editMessageText("❌ Отправка отменена.", {
                    chat_id: chatId,
                    message_id: query.message?.message_id
                });
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
                            this.bot?.sendMessage(host.telegram_id, `ℹ️ Игрок ${user.first_name} (@${user.username}) отменил запись на игру ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}.`);
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
        // Helper for Uploads
        const handleUpload = async (msg: any, type: 'image' | 'video' | 'raw' | 'auto' = 'auto') => {
            const chatId = msg.chat.id;

            // Broadcast Photo Handling (Priority 1)
            const broadcastState = this.broadcastStates.get(chatId);
            if (broadcastState && broadcastState.state === 'WAITING_PHOTO' && msg.photo) {
                const photo = msg.photo[msg.photo.length - 1];
                broadcastState.photoId = photo.file_id;
                broadcastState.state = 'SELECTING_CATEGORY';
                this.bot?.sendMessage(chatId, "✅ Фото сохранено.");
                this.showCategorySelection(chatId);
                return;
            }

            // Only process if user explicitly sent media to the bot directly (not in group unless mentioned?)
            // Assuming private chat mainly.

            let fileId = '';
            let caption = '';

            if (msg.photo) {
                fileId = msg.photo[msg.photo.length - 1].file_id;
                type = 'image';
            } else if (msg.video) {
                fileId = msg.video.file_id;
                type = 'video';
            } else if (msg.document) {
                fileId = msg.document.file_id;
                type = 'auto'; // Could be anything
            } else if (msg.animation) {
                fileId = msg.animation.file_id;
                type = 'video'; // GIFs are usually videos (mp4)
            } else {
                return;
            }

            this.bot?.sendMessage(chatId, "⏳ Uploading to Cloudinary...");

            try {
                const fileLink = await this.bot?.getFileLink(fileId);
                if (!fileLink) throw new Error("Could not get file link");

                const { CloudinaryService } = await import('../services/cloudinary.service');
                const cloudinaryService = new CloudinaryService();

                const url = await cloudinaryService.uploadMedia(fileLink, type);

                this.bot?.sendMessage(chatId, `✅ **Uploaded!**\n\n\`${url}\``, { parse_mode: 'Markdown' });

            } catch (error: any) {
                console.error("Upload failed", error);
                this.bot?.sendMessage(chatId, `❌ Upload failed: ${error.message}`);
            }
        };

        // Media Handlers
        this.bot.on('photo', (msg) => handleUpload(msg));
        this.bot.on('video', (msg) => handleUpload(msg));
        this.bot.on('document', (msg) => handleUpload(msg));
        this.bot.on('animation', (msg) => handleUpload(msg));
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

                // Fetch Photo
                let photoUrl = '';
                try {
                    const photos = await this.bot?.getUserProfilePhotos(telegramId, { limit: 1 });
                    if (photos && photos.total_count > 0 && photos.photos[0].length > 0) {
                        const largest = photos.photos[0][photos.photos[0].length - 1];
                        const tempUrl = await this.bot?.getFileLink(largest.file_id);
                        if (tempUrl) {
                            // Upload to Cloudinary for persistence
                            photoUrl = await this.cloudinaryService.uploadImage(tempUrl, 'avatars');
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch/upload user photo:", e);
                }

                user = new UserModel({
                    username,
                    first_name: firstName,
                    telegram_id: telegramId,
                    referralBalance: 0,
                    referralsCount: 0,
                    photo_url: photoUrl
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
                        await referrer.save();

                        // Log Transaction
                        const { TransactionModel } = await import('../models/transaction.model');
                        await TransactionModel.create({
                            userId: referrer._id,
                            amount: 10,
                            currency: 'RED',
                            type: 'REFERRAL',
                            description: 'Реферальный бонус',
                            relatedUserId: user._id
                        });

                        referrer.referralsCount += 1;
                        await referrer.save();

                        this.bot?.sendMessage(referrer.telegram_id!, `🎉 У вас новый реферал: ${firstName} (@${username})! Баланс +$10 (🔴 Red Balance).`);
                    }
                }

                await user.save();
                console.log(`New user registered via bot: ${username}`);
            } else {
                // Update existing user photo if missing or changed (On every /start? Maybe expensive? Let's just do it.)
                try {
                    const photos = await this.bot?.getUserProfilePhotos(telegramId, { limit: 1 });
                    if (photos && photos.total_count > 0) {
                        const largest = photos.photos[0][photos.photos[0].length - 1];
                        const tempUrl = await this.bot?.getFileLink(largest.file_id);

                        // Check if we need update (Generic check: if current URL is NOT cloudinary or if empty)
                        // Or just update always?
                        // Better: If current URL is empty OR contains 'api.telegram.org' (expired) OR just do it periodically.
                        // Let's check if it exists.

                        if (tempUrl) {
                            // Optimization: Don't re-upload if we already have a Cloudinary URL and user didn't change photo?
                            // Hard to know if user changed photo without comparing content.
                            // Simple heuristic: If it's a new session, update it. Cloudinary isn't that expensive for small usage.
                            // But to save bandwidth, maybe store file_id in DB?
                            // For now, let's just upload if not present or if it looks like a temp URL.

                            const isCloudinary = user.photo_url?.includes('cloudinary.com');
                            if (!user.photo_url || !isCloudinary) {
                                const secureUrl = await this.cloudinaryService.uploadImage(tempUrl, 'avatars');
                                user.photo_url = secureUrl;
                                await user.save();
                            }
                        }
                    }
                } catch (e) { }
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

            const botName = process.env.BOT_USERNAME || 'MONEO_game_bot';
            const refLink = `https://t.me/${botName}?start=${user.username}`;
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
                        [{ text: '🤝 Партнерская программа', callback_data: 'partnership_info' }]
                    ]
                }
            });

        } catch (e) {
            console.error("Error in handleEarn:", e);
        }
    }

    async handleGetPassword(chatId: number, telegramId?: number) {
        try {
            if (!telegramId) {
                this.bot?.sendMessage(chatId, '❌ Не удалось определить ваш Telegram ID.');
                return;
            }

            const { UserModel } = await import('../models/user.model');
            const { AuthService } = await import('../auth/auth.service');
            const authService = new AuthService();

            let user = await UserModel.findOne({ telegram_id: telegramId });

            if (!user) {
                this.bot?.sendMessage(chatId, '❌ Пользователь не найден. Используйте /start для регистрации.');
                return;
            }

            // Generate magic link code
            const code = await authService.createAuthCode(telegramId);
            const webAppUrl = process.env.FRONTEND_URL || 'https://moneo.up.railway.app';
            const magicLink = `${webAppUrl}/?auth=${code}`;

            // Generate password if not exists
            if (!user.password) {
                const generatePassword = () => {
                    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let password = '';
                    for (let i = 0; i < 8; i++) {
                        password += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return password;
                };
                user.password = generatePassword();
                await user.save();
            }

            const message = `🔑 <b>Данные для входа в браузере</b>\n\n` +
                `🌐 <b>Сайт:</b> ${webAppUrl}\n\n` +
                `👤 <b>Логин:</b> ${user.username}\n` +
                `🔐 <b>Пароль:</b> ${user.password}\n\n` +
                `📋 <b>Или используйте постоянную ссылку:</b>\n${magicLink}\n\n` +
                `💡 Просто откройте эту ссылку в любом браузере - вы будете автоматически авторизованы!\n` +
                `Ссылка действительна 365 дней.`;

            this.bot?.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🌐 Открыть сайт', url: webAppUrl }],
                        [{ text: '🔗 Открыть Magic Link', url: magicLink }]
                    ]
                }
            });

        } catch (e) {
            console.error("Error in handleGetPassword:", e);
            this.bot?.sendMessage(chatId, '❌ Ошибка генерации данных.');
        }
    }

    async handlePlay(chatId: number) {
        try {
            const { UserModel } = await import('../models/user.model');
            const { AuthService } = await import('../auth/auth.service');
            const authService = new AuthService();
            const user = await UserModel.findOne({ telegram_id: chatId });

            const code = await authService.createAuthCode(chatId);
            const webAppUrl = process.env.FRONTEND_URL || 'https://moneo.up.railway.app';
            // WebApp Button (Internal)
            // Link (External Browser with Auth)
            const link = `${webAppUrl}/?auth=${code}`;

            const isMaster = user && user.isMaster && user.masterExpiresAt && user.masterExpiresAt > new Date();

            const keyboard = [
                [{ text: '🚀 ЗАПУСТИТЬ В APP', web_app: { url: webAppUrl } }],
                [{ text: '🌐 В браузере (Ссылка)', url: link }],
                [{ text: '📅 Расписание игр', callback_data: 'view_schedule' }],
                [{ text: '🔑 Получить пароль', callback_data: 'get_password' }]
            ];

            if (isMaster) {
                keyboard.push([{ text: '➕ Добавить игру', callback_data: 'start_add_game' }]);
            }

            this.bot?.sendMessage(chatId, `Готов попробовать? 🎲\n\n📱 Жми **ЗАПУСТИТЬ** для игры в Telegram.\n🌐 Или по ссылке в браузере:\n${link}\n\nПосмотри расписание!`, {
                parse_mode: 'Markdown',
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

    async handlePartnership(chatId: number) {
        const text = `🔺 **Маркетинг «Тринар» — как работает система**\n\n` +
            `**1️⃣ Распределение оплат**\n` +
            `С каждой оплаты приглашённого пользователя 100% суммы распределяется внутри системы:\n` +
            `• 50% → на зелёный баланс пригласившего (доступно к выводу)\n` +
            `• 50% → в жёлтый бонус (накапливается в структуре)\n\n` +
            `**2️⃣ Аватар при подписке**\n` +
            `При покупке любой подписки ($20, $100, $1000) вы получаете **Аватара**, который встает в структуру и начинает приносить доход.\n\n` +
            `**3️⃣ Тарифы**\n` +
            `🔵 **Игрок ($20)**: Доход $480 при закрытии 5 уровня.\n` +
            `🟣 **Мастер ($100)**: Доход $2400.\n` +
            `🔶 **Партнер ($1000)**: Доход $24,000.\n\n` +
            `Денежная энергия работает на вас! 🚀`;

        this.bot?.sendMessage(chatId, text, { parse_mode: 'Markdown' });
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
                    [{ text: '📋 Мои игры' }],
                    [{ text: '🎲 Играть' }, { text: '💸 Заработать' }],
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
        const times = ['09:00', '10:00', '12:00', '13:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00'];
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

        // Create Date object assuming input is MSK (UTC+3)
        // We want to store 13:00 MSK as 10:00 UTC.
        // If we use new Date(...hours...), server (UTC) creates 13:00 UTC.
        // So we need to subtract 3 hours from the input hours.

        // Easier: Create as UTC then subtract 3 hours
        const finalDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes));
        finalDate.setHours(finalDate.getHours() - 3);

        state.gameData.startTime = finalDate;
        state.state = 'WAITING_MAX';

        this.bot?.sendMessage(chatId, `✅ Дата и время: ${finalDate.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)\n\n👥 Введите макс. кол-во игроков (по умолчанию 8):`);
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

    async handleMyGames(chatId: number, telegramId: number) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { UserModel } = await import('../models/user.model');
            const user = await UserModel.findOne({ telegram_id: telegramId });
            if (!user) return;

            const games = await ScheduledGameModel.find({
                hostId: user._id,
                status: 'SCHEDULED',
                startTime: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).sort({ startTime: 1 });

            if (games.length === 0) {
                this.bot?.sendMessage(chatId, "У вас пока нет запланированных игр.");
                return;
            }

            this.bot?.sendMessage(chatId, "📋 **Ваши игры:**", { parse_mode: 'Markdown' });

            for (const game of games) {
                const dateStr = new Date(game.startTime).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Moscow'
                });
                const participantsCount = game.participants.length;

                this.bot?.sendMessage(chatId, `🗓 ${dateStr} (МСК)\n👥 ${participantsCount}/${game.maxPlayers}`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: '⚙️ Управление', callback_data: `manage_game_${game._id}` }]]
                    }
                });
            }

        } catch (e) {
            console.error(e);
            this.bot?.sendMessage(chatId, "Ошибка загрузки списка игр.");
        }
    }

    async handleManageGame(chatId: number, gameId: string) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const game = await ScheduledGameModel.findById(gameId);
            if (!game) {
                this.bot?.sendMessage(chatId, "Игра не найдена.");
                return;
            }

            const dateStr = new Date(game.startTime).toLocaleString('ru-RU', {
                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
            });

            const text = `⚙️ **Управление игрой**\n\n🗓 ${dateStr} (МСК)\n👥 Мест: ${game.participants.length}/${game.maxPlayers}\n🎟 Промо: ${game.participants.filter((p: any) => p.type === 'PROMO').length}/${game.promoSpots}`;

            this.bot?.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✏️ Время', callback_data: `edit_time_${game._id}` },
                            { text: '👥 Места', callback_data: `edit_max_${game._id}` },
                            { text: '🎟 Промо', callback_data: `edit_promo_${game._id}` }
                        ],
                        [
                            { text: '👥 Участники', callback_data: `view_participants_${game._id}` },
                            { text: '➕ Игрок', callback_data: `add_player_${game._id}` }
                        ],
                        [{ text: '📢 Рассылка', callback_data: `broadcast_game_${game._id}` }],
                        [{ text: '❌ Отменить игру', callback_data: `cancel_game_${game._id}` }]
                    ]
                }
            });

        } catch (e) {
            console.error(e);
            this.bot?.sendMessage(chatId, "Ошибка.");
        }
    }

    async handleViewParticipants(chatId: number, gameId: string) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { UserModel } = await import('../models/user.model');
            const game = await ScheduledGameModel.findById(gameId);
            if (!game) return;

            if (game.participants.length === 0) {
                this.bot?.sendMessage(chatId, "Нет участников.");
                return;
            }

            for (const p of game.participants) {
                // For privacy, maybe just show name and verify status
                const user = await UserModel.findById(p.userId);
                const name = user ? (user.username ? `@${user.username}` : user.first_name) : 'Unknown';
                const status = p.isVerified ? '✅' : '⏳';
                const type = p.type === 'PAID' ? '💰' : '🎟';

                this.bot?.sendMessage(chatId, `${status} ${type} ${name}`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '⚙️ Управление', callback_data: `manage_player_${game._id}_${p.userId}` }
                        ]]
                    }
                });
            }

        } catch (e) {
            console.error(e);
            this.bot?.sendMessage(chatId, "Ошибка.");
        }
    }

    async handleManagePlayer(chatId: number, gameId: string, userId: string) {
        // Show actions for specific player
        try {
            const { UserModel } = await import('../models/user.model');
            const user = await UserModel.findById(userId);
            if (!user) return;

            this.bot?.sendMessage(chatId, `👤 Игрок: ${user.first_name}(@${user.username})`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✍️ Написать', url: `tg://user?id=${user.telegram_id}` }],
                        [{ text: '❌ Исключить', callback_data: `kick_player_${gameId}_${userId}` }]
                    ]
                }
            });
        } catch (e) { console.error(e); }
    }

    async handleKickPlayer(chatId: number, gameId: string, userId: string) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { UserModel } = await import('../models/user.model');
            const game = await ScheduledGameModel.findById(gameId);

            if (game) {
                const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === userId);
                if (pIndex > -1) {
                    game.participants.splice(pIndex, 1);
                    await game.save();
                    this.bot?.sendMessage(chatId, "✅ Игрок исключен.");

                    // Notify user
                    const user = await UserModel.findById(userId);
                    if (user) {
                        this.bot?.sendMessage(user.telegram_id, `❌ Вы были исключены из игры ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}.`);
                    }
                } else {
                    this.bot?.sendMessage(chatId, "Игрок не найден в списке.");
                }
            }
        } catch (e) { console.error(e); }
    }

    async handleCancelGame(chatId: number, gameId: string) {
        try {
            const { ScheduledGameModel } = await import('../models/scheduled-game.model');
            const { UserModel } = await import('../models/user.model');
            const game = await ScheduledGameModel.findById(gameId);
            if (!game) {
                this.bot?.sendMessage(chatId, "Игра не найдена.");
                return;
            }

            // Notify all
            for (const p of game.participants) {
                const user = await UserModel.findById(p.userId);
                if (user) {
                    this.bot?.sendMessage(user.telegram_id, `⚠️ Игра ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} была отменена организатором.`);
                }
            }

            // Delete
            await ScheduledGameModel.findByIdAndDelete(gameId);

            this.bot?.sendMessage(chatId, "✅ Игра отменена и удалена из расписания.");
        } catch (e) { console.error(e); }
    }

    async handleJoinGame(chatId: number, telegramId: number, gameId: string, isPaid?: boolean, isOnSite?: boolean) {
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
            const paidCount = game.participants.filter((p: any) => p.type === 'PAID' || p.type === 'ONSITE').length;

            if (isOnSite) {
                // On-site payment - no balance check, just register
                if (paidCount >= (game.maxPlayers - game.promoSpots)) {
                    this.bot?.sendMessage(chatId, "😔 Платные места закончились!");
                    return;
                }

                game.participants.push({
                    userId: user._id,
                    username: user.username,
                    firstName: user.first_name || 'Игрок',
                    type: 'ONSITE',
                    joinedAt: new Date(),
                    isVerified: false // Requires master confirmation
                });

                await game.save();

                this.bot?.sendMessage(chatId, `✅ Вы записаны с оплатой на месте!\\n📅 ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\\n\\n💰 Оплата $20 мастеру на игре.`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: '❌ Отменить запись', callback_data: `leave_game_${game._id}` }]]
                    }
                });

                // Notify Master
                const host = await UserModel.findById(game.hostId);
                if (host) {
                    this.bot?.sendMessage(host.telegram_id,
                        `💵 ${user.first_name} (@${user.username}) записался с оплатой на месте\\n📅 ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
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

                return;
            }

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

                // Auto-verify PROMO users now (Link requirement removed)
                game.participants.push({
                    userId: user._id,
                    username: user.username,
                    firstName: user.first_name || 'Игрок',
                    type: 'PROMO',
                    joinedAt: new Date(),
                    isVerified: true
                });

                // Notify Success (No Link Request)
                this.bot?.sendMessage(chatId, `✅ Вы успешно записаны на игру (PROMO)!\\n\\n📅 ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Отменить запись', callback_data: `leave_game_${game._id}` }]
                        ]
                    }
                });


            } else {
                // Joining PAID
                if (paidCount >= (game.maxPlayers - game.promoSpots)) {
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
                    this.bot?.sendMessage(chatId, `❌ Недостаточно средств ($20). \\n🔴 Red: $${user.balanceRed || 0}\\n🟢 Green: $${user.referralBalance}`);
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
                this.bot?.sendMessage(chatId, `✅ Вы успешно записаны на игру (PAID)!\\n📅 ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`, {
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
                    `🆕 Игрок ${user.first_name} (@${user.username}) записался на игру (тип: ${isPaid ? 'PAID' : 'PROMO'}).\\n📅 ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
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

        // Build rows
        const rows: any[] = [];
        // Safety check for p.userId
        const isParticipant = requester && game.participants.some((p: any) => p.userId && requester._id && p.userId.toString() === requester._id.toString());

        if (isParticipant) {
            rows.push([{ text: '❌ Отменить запись', callback_data: `leave_game_${game._id}` }]);
        } else {
            const joinRow = [];
            if (freeSpots > 0) joinRow.push({ text: 'Записаться (Free)', callback_data: `join_game_${game._id}` });
            if (paidSpots > 0) joinRow.push({ text: 'Записаться ($20)', callback_data: `join_paid_${game._id}` });
            if (joinRow.length > 0) rows.push(joinRow);

            // On-site payment button on separate row
            if (paidSpots > 0) {
                rows.push([{ text: 'Записаться с оплатой мастеру', callback_data: `join_onsite_${game._id}` }]);
            }
            // If both are present, they might still be too wide. Let's put them on separate rows if both strictly needed, 
            // but user image shows they fit 2 per row roughly, or maybe not.
            // "Записаться (Free)" is ~16 chars. "Записаться ($20)" is ~16 chars. Total 32. 
            // Mobile width is tricky. Let's separate them to be safe.
            // Actually, let's keep logic: if both, try 2 per row? No, user complained. Vertical is safest.
            // Wait, user image shows 4 buttons: Free, Paid, Time, Announce? No. 
            // Image shows: "Za...ee)", "Za...0)", "Clock", "Mega...".
            // So they were all in one row.
        }

        // Time button
        rows.push([{ text: '🕒 Когда начало?', callback_data: `check_time_${game._id}` }]);

        // Host Actions
        if (isRequesterMaster && game.hostId && requester._id.toString() === game.hostId.toString()) {
            rows.push([{ text: '📢 Отправить сообщение', callback_data: `announce_game_${game._id}` }]);
            rows.push([{ text: '⚙️ Управление', callback_data: `manage_game_${game._id}` }]);
        }

        return { text, reply_markup: { inline_keyboard: rows } };
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
                        if (user) this.bot?.sendMessage(user.telegram_id, `⏰ Напоминание: Игра через 24 часа! (${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })})`);
                    }
                    // Validate Host
                    const host = await UserModel.findById(game.hostId);
                    if (host) this.bot?.sendMessage(host.telegram_id, `⏰ Напоминание Мастеру: Игра через 24 часа! (${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })})`);

                    game.reminder24hSent = true;
                    gameModified = true;
                }

                // 2. 30 Minute Reminder (25-35m window)
                if (!game.reminder30mSent && diffMinutes <= 30 && diffMinutes > 0) {
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) this.bot?.sendMessage(user.telegram_id, `⏰ Напоминание: Игра начинается через 30 минут!`);
                    }
                    // Validate Host
                    const host = await UserModel.findById(game.hostId);
                    if (host) this.bot?.sendMessage(host.telegram_id, `⏰ Напоминание Мастеру: Игра начинается через 30 минут!`);

                    game.reminder30mSent = true;
                    gameModified = true;
                }

                // 3. Start Reminder (0-5m window or slightly past?)
                if (!game.reminderStartSent && diffMinutes <= 0 && diffMinutes > -10) {
                    for (const p of game.participants) {
                        const user = await UserModel.findById(p.userId);
                        if (user) this.bot?.sendMessage(user.telegram_id, `🚀 Игра начинается! Ссылка на подключение: [Здесь будет ссылка] (Свяжитесь с мастером)`);
                    }
                    // Validate Host
                    const host = await UserModel.findById(game.hostId);
                    if (host) this.bot?.sendMessage(host.telegram_id, `🚀 Напоминание Мастеру: Игра начинается! Пора запускать комнату!`);

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

    // Broadcast Helper Methods
    showCategorySelection(chatId: number) {
        this.bot?.sendMessage(chatId, "📢 **Выберите категорию получателей:**", {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📢 Всем пользователям', callback_data: 'broadcast_category_all' }],
                    [{ text: '🎭 С аватарами', callback_data: 'broadcast_category_avatars' }],
                    [{ text: '💰 С балансом', callback_data: 'broadcast_category_balance' }],
                    [{ text: '✅ Выбрать вручную', callback_data: 'broadcast_category_custom' }]
                ]
            }
        });
    }

    async executeBroadcast(chatId: number, category: string) {
        const state = this.broadcastStates.get(chatId);
        if (!state || !state.text) {
            this.bot?.sendMessage(chatId, "❌ Ошибка: текст не найден.");
            return;
        }

        try {
            const { UserModel } = await import('../models/user.model');
            let users: any[] = [];

            // Filter users by category
            switch (category) {
                case 'all':
                    users = await UserModel.find({});
                    break;
                case 'avatars':
                    // Users with avatars (has partnership balance or avatar data)
                    users = await UserModel.find({
                        $or: [
                            { hasAvatar: true },
                            { partnershipBalance: { $gt: 0 } }
                        ]
                    });
                    break;
                case 'balance':
                    // Users with any balance
                    users = await UserModel.find({
                        $or: [
                            { referralBalance: { $gt: 0 } },
                            { balanceRed: { $gt: 0 } }
                        ]
                    });
                    break;
                case 'custom':
                    // TODO: Implement custom selection UI
                    this.bot?.sendMessage(chatId, "⚠️ Ручной выбор пока не реализован. Используйте другие категории.");
                    return;
                default:
                    this.bot?.sendMessage(chatId, "❌ Неизвестная категория.");
                    return;
            }

            // Confirm before sending
            this.bot?.sendMessage(chatId, `📊 Найдено получателей: ${users.length}\\n\\nОтправить рассылку?`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Отправить', callback_data: `broadcast_confirm_${category}` },
                            { text: '❌ Отменить', callback_data: 'broadcast_cancel' }
                        ]
                    ]
                }
            });

            // Store users temporarily
            state.category = category as any;
            state.selectedUsers = users.map(u => u._id.toString());

        } catch (e) {
            console.error("Broadcast error:", e);
            this.bot?.sendMessage(chatId, "❌ Ошибка при подготовке рассылки.");
        }
    }

    async sendBroadcast(chatId: number) {
        const state = this.broadcastStates.get(chatId);
        if (!state || !state.text || !state.selectedUsers) {
            this.bot?.sendMessage(chatId, "❌ Ошибка: данные рассылки не найдены.");
            return;
        }

        try {
            const { UserModel } = await import('../models/user.model');
            let sent = 0;
            let failed = 0;

            this.bot?.sendMessage(chatId, "📤 Отправка началась...");

            for (const userId of state.selectedUsers) {
                try {
                    const user = await UserModel.findById(userId);
                    if (!user || !user.telegram_id) {
                        failed++;
                        continue;
                    }

                    // Send with photo if present
                    if (state.photoId) {
                        await this.bot?.sendPhoto(user.telegram_id, state.photoId, {
                            caption: state.text,
                            parse_mode: 'Markdown'
                        });
                    } else {
                        await this.bot?.sendMessage(user.telegram_id, state.text, {
                            parse_mode: 'Markdown'
                        });
                    }

                    sent++;
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (e) {
                    failed++;
                    console.error(`Failed to send to ${userId}:`, e);
                }
            }

            this.bot?.sendMessage(chatId, `✅ **Рассылка завершена!**\\n\\n📤 Отправлено: ${sent}\\n❌ Ошибок: ${failed}`);
            this.broadcastStates.delete(chatId);

        } catch (e) {
            console.error("Send broadcast error:", e);
            this.bot?.sendMessage(chatId, "❌ Ошибка при отправке рассылки.");
        }
    }
}
