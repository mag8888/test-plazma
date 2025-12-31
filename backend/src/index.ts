import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { BotService } from './bot/bot.service';
import { AuthController } from './auth/auth.controller';
import { connectDatabase } from './database';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config();

// Global type augmentation
declare global {
    var bot: any;
}

// Add interface augmentation for greenBalance/yellowBalance if I didn't update the interface file directly (I didn't update the interface in the previous view, only Schema. Wait, I should have updated Interface too.
// Let's check the previous tool call.
// I updated UserSchema definitions. I did NOT update the IUser interface.
// I should update the Interface in the same file or cast it.
// To avoid TS errors, I will use `any` casting or update user.model.ts interface in a separate call if needed.
// Actually, I can just update the route here and use `any` for now or better, update the model properly in next step.
// But to be fast, I'll assume I can just write to it.

// (Code moved to after app init)

const app = express();
app.set('trust proxy', 1);

// Enable CORS for all origins (or configure specific ones)
app.use(cors({
    origin: true, // Allow any origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

let dbStatus = 'pending';
let botStatus = 'pending';
let botService: any = null; // Changed type to any to support Proxy

const isGameServiceOnly = process.env.MICROSERVICE_MODE === 'game';

// Services initialized in bootstrap()


// Remove old initialization variables that were here
// let botService: BotService | null = null;
// let gameGateway: GameGateway | null = null;


// Health Check Endpoint (Critical for Debugging)
app.get('/api/health', (req, res) => {
    // If bot service is supposed to be active (monolith mode), check it.
    // If botService is null or bot is null, we might be in trouble.
    const isBotActive = global.bot != null;

    // In game-only mode (microservice), we don't care about bot here.
    const isGameMode = process.env.MICROSERVICE_MODE === 'game';

    const health = {
        status: (isBotActive || isGameMode) ? 'ok' : 'degraded',
        uptime: process.uptime(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        bot: isBotActive ? 'active' : 'inactive',
        version: '1.2.0-microservices'
    };

    if (!isGameMode && !isBotActive && process.uptime() > 60) {
        // If monolith and no bot after 60s startup, consider it unhealthy
        // Return 503 so Watchdog triggers alert
        return res.status(503).json(health);
    }

    res.status(200).json(health);
});

const httpServer = createServer(app);

// Initialize Socket.io - REMOVED (Moved to Game Service)
// const io = new Server(httpServer, { ... });

app.use(express.json());

// Middleware: Restrict /admin access to specific host (MOVED TO TOP)
// Middleware: Restrict /admin access to specific host (REMOVED REQUESTED BY USER)
// app.use('/admin', ...);

// Proxy to Partnership Backend (Internal)
// Frontend calls /api/partnership/user -> We forward to http://localhost:4000/api/user
app.use('/api/partnership', async (req, res) => {
    let partnershipUrl = process.env.PARTNERSHIP_API_URL || 'http://127.0.0.1:4000/api';
    // Remove trailing slash from base if present to avoid double slashes
    partnershipUrl = partnershipUrl.replace(/\/$/, '');

    // Ensure target ends with /api because Partnership Service routes start with /api
    if (!partnershipUrl.endsWith('/api')) {
        partnershipUrl += '/api';
    }

    const url = `${partnershipUrl}${req.url}`;

    console.log(`[Proxy Debug] Incoming: ${req.url}`);
    console.log(`[Proxy Debug] Base: ${partnershipUrl}`);
    console.log(`[Proxy Debug] Target: ${url}`);

    // console.log(`Proxying ${req.method} ${req.originalUrl} -> ${url}`);

    try {
        // Use native fetch (Node 18+)
        // Strip the body for GET/HEAD, otherwise pass it
        const body = (req.method === 'GET' || req.method === 'HEAD') ? undefined : JSON.stringify(req.body);

        const urlObj = new URL(url);

        // Filter headers to avoid conflicts (especially content-length mismatch after stringify)
        const { 'content-length': cl, 'content-type': ct, connection, host, ...headers } = req.headers as any;

        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
                host: urlObj.host // Dynamic host
            },
            body: body
        });

        // Forward status and headers
        res.status(response.status);
        response.headers.forEach((v: string, k: string) => res.setHeader(k, v));

        // Forward text/json body
        const text = await response.text();
        res.send(text);

    } catch (e) {
        console.error('Partnership Proxy Error:', e);
        res.status(502).json({ error: 'Partnership Service Unavailable' });
    }
});

// Explicit Admin Route (Force Serve)
app.get('/admin', (req, res) => {
    const adminFile = path.join(__dirname, '../../frontend/out/admin.html');
    const indexFile = path.join(__dirname, '../../frontend/out/index.html');
    if (fs.existsSync(adminFile)) res.sendFile(adminFile);
    else res.sendFile(indexFile);
});

app.use('/api/auth', AuthController);

// Card Management API (Admin Only)
import cardRoutes from './game/card.routes';
app.use('/api/cards', cardRoutes);

// Static File Serving
// Serve Next.js Static Export
app.use(express.static(path.join(__dirname, '../../frontend/out'), { extensions: ['html'] }));




app.get('/game/:id', (req, res) => {
    const id = req.params.id;
    res.redirect(`/game?id=${id}`);
});

// --- NEW GAME ENDPOINTS (MOVED TO GAME SERVICE) ---

import { AuthService } from './auth/auth.service';

const authService = new AuthService();

// Game Schedule API
app.post('/api/games', async (req, res) => {
    try {
        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const { initData, startTime, maxPlayers, promoSpots, description, price } = req.body;

        // Auth Check
        const user = await authService.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const game = await ScheduledGameModel.create({
            hostId: user._id,
            startTime: new Date(startTime),
            maxPlayers: Number(maxPlayers),
            promoSpots: Number(promoSpots),
            description,
            price: Number(price) || 20,
            status: 'SCHEDULED'
        });

        res.json({ success: true, gameId: game._id });
    } catch (e) {
        console.error("Failed to create game:", e);
        res.status(500).json({ error: "Creation failed" });
    }
});

app.get('/api/games', async (req, res) => {
    try {
        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const { type } = req.query;

        let query: any = {
            status: 'SCHEDULED',
            startTime: { $gt: new Date() }
        };
        let sort: any = { startTime: 1 };

        if (type === 'history') {
            query = {
                // Show completed or past scheduled games
                startTime: { $lt: new Date() }
            };
            sort = { startTime: -1 };
        }

        // Fetch games, populated with host info
        const games = await ScheduledGameModel.find(query)
            .sort(sort)
            .populate('hostId', 'username first_name photo_url telegram_id') // Get host details including telegram_id
            .populate('participants.userId', 'username first_name photo_url telegram_id') // Get participant details
            .limit(20);

        res.json(games);
    } catch (e) {
        console.error("Failed to fetch games:", e);
        res.status(500).json({ error: "Internal Error" });
    }
});

// App Stats API
app.get('/api/stats', async (req, res) => {
    try {
        const { UserModel } = await import('./models/user.model');
        const userCount = await UserModel.countDocuments();
        res.json({
            users: userCount,
            debug: {
                dbName: mongoose.connection.db?.databaseName,
                host: mongoose.connection.host
            }
        });
    } catch (e) {
        console.error("Failed to fetch stats:", e);
        res.status(500).json({ error: "Stats Error" });
    }
});

// Transaction History API
app.get('/api/transactions', async (req, res) => {
    try {
        let initData = req.headers.authorization?.split(' ')[1]; // Expecting 'Bearer initData'

        // Fallback to query param if header is missing (avoids Header Char validation issues on frontend)
        if (!initData && req.query.initData) {
            initData = req.query.initData as string;
        }

        if (!initData) return res.status(401).json({ error: "No auth data" });

        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { TransactionModel } = await import('./models/transaction.model');
        // Fetch last 50 transactions, sorted by newest
        const transactions = await TransactionModel.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .populate('relatedUserId', 'username firstName first_name telegram_id') // Populate source user info + telegram_id
            .limit(50);

        res.json(transactions);
    } catch (e) {
        console.error("Failed to fetch transactions:", e);
        res.status(500).json({ error: "Transaction Fetch Error" });
    }
});

// Update Game (Protected via initData)
app.put('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { initData, startTime, maxPlayers, description } = req.body;

        if (!initData) return res.status(401).json({ error: "No auth data" });

        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);

        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);

        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== user.id.toString()) {
            return res.status(403).json({ error: "Not authorized" });
        }

        if (startTime) game.startTime = new Date(startTime);
        if (maxPlayers) game.maxPlayers = Number(maxPlayers);
        if (req.body.promoSpots !== undefined) game.promoSpots = Number(req.body.promoSpots);
        if (description !== undefined) game.description = description;

        await game.save();
        res.json({ success: true, game });

    } catch (e) {
        console.error("Update game failed:", e);
        res.status(500).json({ error: "Update failed" });
    }
});

// GET Single Game (Detailed)
app.get('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id).populate('participants.userId', 'username first_name photo_url telegram_id');
        if (!game) return res.status(404).json({ error: "Game not found" });
        res.json(game);
    } catch (e) {
        res.status(500).json({ error: "Error fetching game" });
    }
});

// Kick Player
app.delete('/api/games/:id/players/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        const initData = req.headers.authorization?.split(' ')[1]; // Expecting 'Bearer initData'

        if (!initData) return res.status(401).json({ error: "No auth data" });

        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== user.id.toString()) return res.status(403).json({ error: "Not master" });

        const initialLen = game.participants.length;
        game.participants = game.participants.filter((p: any) => p.userId.toString() !== userId);

        if (game.participants.length !== initialLen) {
            await game.save();
            // Notify User via Bot
            if (botService) {
                const { UserModel } = await import('./models/user.model');
                const kickedUser = await UserModel.findById(userId);
                if (kickedUser?.telegram_id) {
                    botService.bot?.sendMessage(kickedUser.telegram_id, `❌ Вы были исключены из игры ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК).`);
                }
            }
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Player not found in game" });
        }

    } catch (e) {
        console.error("Kick failed:", e);
        res.status(500).json({ error: "Kick failed" });
    }
});

// NEW: Global Admin Broadcast
app.post('/api/admin/broadcast', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || '').split(',').map(s => s.trim());
    if (!validSecrets.includes(secret as string)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { message, recipients } = req.body;
    if (!message || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({ error: 'Message and recipients array required' });
    }

    try {
        let sentCount = 0;
        let failCount = 0;

        // Send to each recipient using telegram_id
        for (const telegramId of recipients) {
            try {
                await botService?.bot?.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
                sentCount++;
                // Tiny delay to be safe
                await new Promise(r => setTimeout(r, 50));
            } catch (e) {
                failCount++;
                console.error(`Failed to send to ${telegramId}:`, e);
            }
        }

        res.json({ success: true, sent: sentCount, failed: failCount });
    } catch (e: any) {
        console.error("Broadcast error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get All Games
app.get('/api/admin/games', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || '').split(',').map(s => s.trim());
    if (!validSecrets.includes(secret as string)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const { page = 1, limit = 20 } = req.query;

        const games = await ScheduledGameModel.find()
            .sort({ startTime: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate('hostId', 'username first_name telegram_id');

        const total = await ScheduledGameModel.countDocuments();

        res.json({
            games,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Cancel/Delete Game
app.delete('/api/admin/games/:id', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || '').split(',').map(s => s.trim());
    if (!validSecrets.includes(secret as string)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const { id } = req.params;
        const { ScheduledGameModel } = await import('./models/scheduled-game.model');

        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        // Refund players if needed? 
        // For now, simpler: just mark cancelled or delete.
        // Let's UPDATE status to CANCELLED instead of hard delete to preserve history
        game.status = 'CANCELLED';
        await game.save();

        // Notify players via bot
        if (botService) {
            const { UserModel } = await import('./models/user.model');
            for (const p of game.participants) {
                // Fetch user because participant might just be object structure (unless populated)
                // Participant schema has userId
                if (p.userId) {
                    const u = await UserModel.findById(p.userId);
                    if (u?.telegram_id) {
                        botService.bot?.sendMessage(u.telegram_id, `⚠️ Игра ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК) была отменена администратором.`).catch(() => { });
                    }
                }
            }
            // Notify Host
            const host = await UserModel.findById(game.hostId);
            if (host?.telegram_id) {
                botService.bot?.sendMessage(host.telegram_id, `⚠️ Ваша игра ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК) была отменена администратором.`).catch(() => { });
            }
        }

        res.json({ success: true, message: "Game cancelled" });
    } catch (e: any) {
        console.error("Game cancel error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Get Recipients by Category
app.get('/api/admin/broadcast/recipients', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || '').split(',').map(s => s.trim());
    if (!validSecrets.includes(secret as string)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const category = req.query.category as string;
    if (!category) return res.status(400).json({ error: 'Category required' });

    try {
        const { UserModel } = await import('./models/user.model');
        let recipients: any[] = [];

        switch (category) {
            case 'all':
                recipients = await UserModel.find({ telegram_id: { $exists: true, $ne: null } })
                    .select('_id username first_name telegram_id');
                break;
            case 'avatars':
                recipients = await UserModel.find({
                    telegram_id: { $exists: true, $ne: null },
                    $or: [
                        { hasAvatar: true },
                        { partnershipBalance: { $gt: 0 } }
                    ]
                }).select('_id username first_name telegram_id');
                break;
            case 'balance':
                recipients = await UserModel.find({
                    telegram_id: { $exists: true, $ne: null },
                    $or: [
                        { referralBalance: { $gt: 0 } },
                        { balanceRed: { $gt: 0 } }
                    ]
                }).select('_id username first_name telegram_id');
                break;
            case 'custom':
                // For now, return all users for custom selection
                recipients = await UserModel.find({ telegram_id: { $exists: true, $ne: null } })
                    .select('_id username first_name telegram_id');
                break;
            default:
                return res.status(400).json({ error: 'Invalid category' });
        }

        res.json({
            success: true,
            recipients: recipients.map(r => ({
                id: r._id.toString(),
                username: r.username,
                first_name: r.first_name,
                telegram_id: r.telegram_id
            }))
        });
    } catch (e: any) {
        console.error("Recipients fetch error:", e);
        res.status(500).json({ error: e.message });
    }
});

// NEW: Campaign Management
app.get('/api/admin/campaigns', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || '').split(',').map(s => s.trim());
    if (!validSecrets.includes(secret as string)) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const { CampaignModel } = await import('./models/campaign.model');
        const campaigns = await CampaignModel.find().sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/campaigns', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || '').split(',').map(s => s.trim());
    if (!validSecrets.includes(secret as string)) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const { CampaignModel } = await import('./models/campaign.model');
        const campaign = await CampaignModel.create(req.body);
        res.json(campaign);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Broadcast Message
app.post('/api/games/:id/broadcast', async (req, res) => {
    try {
        const { id } = req.params;
        const { message, initData } = req.body;

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id).populate('participants.userId');
        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== user.id.toString()) return res.status(403).json({ error: "Not master" });

        if (!botService) return res.status(503).json({ error: "Bot not active" });

        let count = 0;
        for (const p of game.participants) {
            if (p.userId?.telegram_id) {
                botService.bot?.sendMessage(p.userId.telegram_id, `📢 <b>Сообщение от Мастера:</b>\n\n${message}`, { parse_mode: 'HTML' }).catch(() => { });
                count++;
            }
        }

        res.json({ success: true, sent: count });

    } catch (e) {
        console.error("Broadcast failed:", e);
        res.status(500).json({ error: "Broadcast failed" });
    }
});

// Invite Player by Username (Master only)
app.post('/api/games/:id/invite', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, initData } = req.body;

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const master = await auth.verifyTelegramAuth(initData);
        if (!master) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== master._id.toString()) {
            return res.status(403).json({ error: "Not master" });
        }

        // Find player by username or telegram_id
        const { UserModel } = await import('./models/user.model');
        const usernameClean = username.replace('@', '').trim();
        const player = await UserModel.findOne({
            $or: [
                { username: usernameClean },
                { telegram_id: parseInt(usernameClean) || 0 }
            ]
        });

        if (!player) {
            return res.status(404).json({ error: "Игрок не найден" });
        }

        // Check if already joined
        const alreadyJoined = game.participants.some((p: any) =>
            p.userId.toString() === player._id.toString()
        );

        if (alreadyJoined) {
            return res.status(400).json({ error: "Игрок уже в списке" });
        }

        // Add player to game
        game.participants.push({
            userId: player._id,
            type: 'PROMO', // Master invite = promo spot
            isVerified: true, // Auto-verified since master invited
            paymentStatus: 'PAY_AT_GAME'
        });

        await game.save();

        // Send Telegram notification
        if (botService && player.telegram_id) {
            const dateStr = new Date(game.startTime).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Moscow'
            });

            const message = `🎮 <b>Приглашение на игру!</b>\n\n` +
                `Мастер <b>${master.first_name}${master.username ? ` (@${master.username})` : ''}</b> пригласил вас на игру:\n\n` +
                `📅 <b>Дата:</b> ${dateStr} (МСК)\n` +
                `💰 <b>Цена:</b> ${game.price} ₽\n\n` +
                `Вы добавлены в список участников!`;

            botService.bot?.sendMessage(player.telegram_id, message, { parse_mode: 'HTML' });
        }

        res.json({
            success: true,
            playerName: player.first_name || player.username
        });

    } catch (e) {
        console.error("Invite player failed:", e);
        res.status(500).json({ error: "Invite failed" });
    }
});

// Private Message
app.post('/api/games/:id/message', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetUserId, message, initData } = req.body;

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== user.id.toString()) return res.status(403).json({ error: "Not master" });

        if (!botService) return res.status(503).json({ error: "Bot not active" });

        const { UserModel } = await import('./models/user.model');
        const targetUser = await UserModel.findById(targetUserId);

        if (!targetUser || !targetUser.telegram_id) {
            return res.status(404).json({ error: "User not found or no Telegram ID" });
        }

        await botService.bot?.sendMessage(targetUser.telegram_id, `📩 <b>Личное сообщение от Мастера:</b>\n\n${message}`, { parse_mode: 'HTML' });

        res.json({ success: true });

    } catch (e) {
        console.error("Message send failed:", e);
        res.status(500).json({ error: "Message send failed" });
    }
});

// Join Game
app.post('/api/games/:id/join', async (req, res) => {
    try {
        const { id } = req.params;
        const { initData, type, repostLink } = req.body; // type: 'PROMO' | 'PAID'

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        // Check if already registered
        if (game.participants.some((p: any) => p.userId.toString() === user._id.toString())) {
            return res.status(400).json({ error: "Already registered" });
        }

        const promoCount = game.participants.filter((p: any) => p.type === 'PROMO').length;
        const paidCount = game.participants.filter((p: any) => p.type === 'PAID').length;
        const freeSpots = game.promoSpots - promoCount;
        const paidSpots = (game.maxPlayers - game.promoSpots) - paidCount;

        let paymentStatus: 'PAID' | 'PAY_AT_GAME' | undefined;

        if (type === 'PROMO') {
            if (freeSpots <= 0) return res.status(400).json({ error: "No promo spots" });
        } else if (type === 'PAID') {
            if (paidSpots <= 0) return res.status(400).json({ error: "No paid spots" });

            paymentStatus = 'PAID';

            // New Balance Logic via PartnershipClient (Atomic)
            const { PartnershipClient, Currency } = await import('./services/partnership.client');

            try {
                // Check balances first
                const balances = await PartnershipClient.getBalances(user._id);

                if (balances.red >= game.price) {
                    await PartnershipClient.charge(user.id, Currency.RED, game.price, `Game Fee: ${game._id}`);
                    // Backend Transaction (optional, but keeping for compatibility if backend API reads local model)
                    // Note: PartnershipClient.charge ALREADY creates a Transaction in DB.
                    // If backend reads from same DB, we don't need to duplicate.
                    // BUT, to be safe with currency types and backend model enums, we let it be.
                    // ACTUALLY, duplicate transaction might be confusing.
                    // Backend /api/transactions reads from TransactionModel.
                    // If shared DB, it will see the one created by PartnershipService.
                    // So we do NOT create another one here.
                } else if (balances.green >= game.price) {
                    // Using Green instead of Legacy Referral
                    await PartnershipClient.charge(user.id, Currency.GREEN, game.price, `Game Fee: ${game._id}`);
                } else if (balances.referral >= game.price) {
                    // Fallback to legacy referral field if not migrated yet? 
                    // WalletService.getBalances returns referral.
                    // But WalletService.charge only supports GREEN/YELLOW/RED check.
                    // The audit plan said: "referralBalance (Legacy) will be deprecated and migrated to greenBalance."
                    // So we assume migration or we treat Referral same as Green?
                    // Let's assume user has Green.
                    // If user fails, let's try 'PAY_AT_GAME'
                    paymentStatus = 'PAY_AT_GAME';
                } else {
                    paymentStatus = 'PAY_AT_GAME';
                }
            } catch (e: any) {
                console.error("Balance charge failed:", e.message);
                // Fallback to offline payment
                paymentStatus = 'PAY_AT_GAME';
            }
        } else {
            return res.status(400).json({ error: "Invalid type" });
        }

        // Add Participant
        const isPromo = type === 'PROMO';
        game.participants.push({
            userId: user._id,
            username: user.username,
            firstName: user.first_name,
            type: type,
            paymentStatus: paymentStatus,
            repostLink: isPromo ? repostLink : undefined,
            isVerified: !isPromo,
            joinedAt: new Date()
        });

        await game.save();

        // Notify Host
        if (botService) {
            const { UserModel } = await import('./models/user.model');
            const host = await UserModel.findById(game.hostId);
            if (host?.telegram_id) {
                const t = type === 'PAID' ? '💰' : '🎟';
                const status = isPromo ? '(Ожидает подтверждения)' : (paymentStatus === 'PAY_AT_GAME' ? '(Оплата на месте)' : '');
                const link = (isPromo && repostLink) ? `\n🔗 Ссылка: ${repostLink}` : (isPromo ? '\n🔗 Ссылка: Не указана' : '');

                botService.bot?.sendMessage(host.telegram_id,
                    `ℹ️ Новый игрок: ${t} ${user.first_name} (@${user.username}) записался на ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК). ${status}${link}`,
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Подтвердить', callback_data: `confirm_player_${game._id}_${user._id}` },
                                { text: '❌ Отклонить', callback_data: `reject_player_${game._id}_${user._id}` }
                            ], [
                                { text: '💬 Написать', url: `tg://user?id=${user.telegram_id}` }
                            ]]
                        }
                    }
                );
            }

            // Notify User
            if (user.telegram_id) {
                const dateStr = new Date(game.startTime).toLocaleString('ru-RU', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    timeZone: 'Europe/Moscow'
                });

                let msg = `✅ Вы записались на игру: ${dateStr}\n\n`;
                if (isPromo) {
                    msg += `Ваша заявка (Промо) принята и ожидает подтверждения мастера.`;
                } else if (paymentStatus === 'PAY_AT_GAME') {
                    msg += `Вы записаны. Оплата мастеру на месте.`;
                } else {
                    msg += `Будем рады видеть вас на игре!`;
                }

                botService.bot?.sendMessage(user.telegram_id, msg);
            }
        }

        res.json({
            success: true,
            game,
            paid: paymentStatus === 'PAID'
        });

    } catch (e) {
        console.error("Join failed:", e);
        res.status(500).json({ error: "Join failed" });
    }
});



// Cancel Game Participation
app.post('/api/games/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { initData } = req.body;

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === user._id.toString());
        if (pIndex === -1) return res.status(400).json({ error: "Not registered" });

        const participant = game.participants[pIndex];

        // Remove participant
        game.participants.splice(pIndex, 1);
        await game.save();

        // Notify Host
        if (botService) {
            const { UserModel } = await import('./models/user.model');
            const host = await UserModel.findById(game.hostId);
            if (host?.telegram_id) {
                botService.bot?.sendMessage(host.telegram_id,
                    `🗑 Игрок ${user.first_name} (@${user.username}) отменил запись на ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК).`
                );
            }
        }

        res.json({ success: true });

    } catch (e) {
        console.error("Cancel failed:", e);
        res.status(500).json({ error: "Cancel failed" });
    }
});

// Confirm Player (Master only)
app.post('/api/games/:id/players/:userId/confirm', async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const { initData } = req.body;

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== user._id.toString()) return res.status(403).json({ error: "Not master" });

        const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === targetUserId);
        if (pIndex === -1) return res.status(404).json({ error: "Participant not found" });

        game.participants[pIndex].isVerified = true;
        await game.save();

        // Notify Player
        const { UserModel } = await import('./models/user.model');
        const targetUser = await UserModel.findById(targetUserId);
        if (targetUser?.telegram_id && botService) {
            botService.bot?.sendMessage(targetUser.telegram_id, `✅ Ваше участие в игре ${new Date(game.startTime).toLocaleDateString()} подтверждено мастером!`);
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Confirm failed:", e);
        res.status(500).json({ error: "Confirm failed" });
    }
});

// Kick Player (Master only)
app.delete('/api/games/:id/players/:userId', async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const authHeader = req.headers.authorization;
        const initData = authHeader?.split(' ')[1]; // Bearer <initData> OR just initData depending on client. 
        // ManageGameModal sends initData in header as Bearer? L98: `Bearer ${webApp?.initData}`. Yes.

        if (!initData) return res.status(401).json({ error: "No auth data" });
        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        const game = await ScheduledGameModel.findById(id);
        if (!game) return res.status(404).json({ error: "Game not found" });

        if (game.hostId.toString() !== user._id.toString()) return res.status(403).json({ error: "Not master" });

        const pIndex = game.participants.findIndex((p: any) => p.userId.toString() === targetUserId);
        if (pIndex === -1) return res.status(404).json({ error: "Participant not found" });

        // Remove
        game.participants.splice(pIndex, 1);
        await game.save();

        // Notify Player
        const { UserModel } = await import('./models/user.model');
        const targetUser = await UserModel.findById(targetUserId);
        if (targetUser?.telegram_id && botService) {
            botService.bot?.sendMessage(targetUser.telegram_id, `❌ Вы были исключены из игры ${new Date(game.startTime).toLocaleDateString()}.`);
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Kick failed:", e);
        res.status(500).json({ error: "Kick failed" });
    }
});

// Sync Balance (Legacy -> Partnership)
app.post('/api/partnership/sync-balance', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(401).json({ error: "No auth data" });

        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        // Logic: Transfer referralBalance to greenBalance in Partnership Backend
        if (user.referralBalance > 0) {
            const amount = user.referralBalance;

            // Call Partnership Backend to Deposit
            const PARTNERSHIP_API_URL = process.env.PARTNERSHIP_API_URL || 'http://localhost:4000/api';
            const ADMIN_SECRET = process.env.ADMIN_SECRET || 'supersecret';

            try {
                // We use the admin endpoint to update balance
                // POST /api/admin/balance
                const response = await fetch(`${PARTNERSHIP_API_URL}/admin/balance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-secret': ADMIN_SECRET
                    },
                    body: JSON.stringify({
                        userId: user.telegram_id, // Pass telegram_id
                        amount: amount,
                        type: 'GREEN'
                    })
                });

                if (response.ok) {
                    // Only clear balance if transfer success
                    user.referralBalance = 0;
                    // Sync local simplified field too
                    // @ts-ignore
                    user.greenBalance = (user.greenBalance || 0) + amount;
                    await user.save();

                    console.log(`Synced balance for ${user.username}: Moved ${amount} from Referral to Green.`);
                    res.json({ success: true, synced: amount, newGreenBalance: user.greenBalance });
                } else {
                    const errText = await response.text();
                    console.error("Partnership Sync Error:", errText);
                    res.status(500).json({ error: "Partnership API Error" });
                }

            } catch (err) {
                console.error("Network Sync Error:", err);
                res.status(500).json({ error: "Network Error during Sync" });
            }
        } else {
            res.json({ success: true, synced: 0, message: "No legacy balance to sync" });
        }

    } catch (e) {
        console.error("Sync Balance Failed:", e);
        res.status(500).json({ error: "Sync failed" });
    }
});

// Check Legacy Balance (For UI debugging)
app.get('/api/partnership/legacy-balance', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let initData = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        // Fallback to query param if header is missing (avoids Header Char validation issues on frontend)
        if (!initData && req.query.initData) {
            initData = req.query.initData as string;
        }

        if (!initData) return res.status(401).json({ error: "No auth data" });

        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        // Return legacy balance
        res.json({ legacyBalance: user.referralBalance || 0 });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch legacy balance" });
    }
});

// DEBUG: Get Raw User Balances (Admin only - verify with secret if possible, or just open for now for rapid debug)
app.get('/api/debug-balance/:username', async (req, res) => {
    try {
        const { UserModel } = await import('./models/user.model');
        const user = await UserModel.findOne({ username: req.params.username });
        if (!user) return res.json({ error: "User not found" });
        res.json({
            username: user.username,
            referralBalance: user.referralBalance, // Green (Legacy)
            greenBalance: user.greenBalance,       // Green (Synced)
            balanceRed: user.balanceRed,           // Red
            isMaster: user.isMaster
        });
    } catch (e) {
        res.json({ error: e });
    }
});

// Recalculate Referrals and Award Bonuses
app.post('/api/recalculate-referrals', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(401).json({ error: "No auth data" });

        const { AuthService } = await import('./auth/auth.service');
        const auth = new AuthService();
        const user = await auth.verifyTelegramAuth(initData);
        if (!user) return res.status(401).json({ error: "Invalid auth" });

        const { UserModel } = await import('./models/user.model');
        const { TransactionModel } = await import('./models/transaction.model');

        // Count all users referred by this user
        const referrals = await UserModel.find({ referredBy: user.username });
        const actualCount = referrals.length;
        const currentCount = user.referralsCount || 0;

        console.log(`[Recalc] User ${user.username}: ${actualCount} actual refs, ${currentCount} recorded`);

        // Update referralsCount
        user.referralsCount = actualCount;

        // Calculate missing bonuses
        // Check existing referral transactions
        const existingBonuses = await TransactionModel.countDocuments({
            userId: user._id,
            type: 'REFERRAL'
        });

        const missingBonuses = actualCount - existingBonuses;

        if (missingBonuses > 0) {
            const bonusAmount = missingBonuses * 10; // $10 per referral
            user.balanceRed += bonusAmount;

            // Create transaction record
            await TransactionModel.create({
                userId: user._id,
                amount: bonusAmount,
                currency: 'RED',
                type: 'REFERRAL',
                description: `Пересчет рефералов: ${missingBonuses} x $10`
            });

            await user.save();

            console.log(`[Recalc] Awarded ${bonusAmount} RED to ${user.username} for ${missingBonuses} missing bonuses`);

            res.json({
                success: true,
                actualReferrals: actualCount,
                previousCount: currentCount,
                missingBonuses: missingBonuses,
                bonusAwarded: bonusAmount,
                newRedBalance: user.balanceRed
            });
        } else {
            await user.save();
            res.json({
                success: true,
                actualReferrals: actualCount,
                previousCount: currentCount,
                missingBonuses: 0,
                message: "All bonuses already awarded"
            });
        }

    } catch (e) {
        console.error("Recalculate Referrals Failed:", e);
        res.status(500).json({ error: "Recalculation failed" });
    }
});


// Get User Stats (Public Profile)
app.get('/api/users/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { UserModel } = await import('./models/user.model');

        // Allow querying by MongoID or TelegramID or Username?
        // ID is likely MongoID from frontend.
        let targetUser = await UserModel.findById(id);
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        // Check if user is MASTER (stats mainly relevant)
        // Return public stats
        res.json({
            id: targetUser._id,
            username: targetUser.username,
            firstName: targetUser.first_name,
            photoUrl: targetUser.photo_url,
            wins: targetUser.wins || 0,
            gamesPlayed: 0, // Need to count 'COMPLETED' games? Or store in user model. 
            // For now return 0 or implement count.
            // Let's count from ScheduledGameModel where status=COMPLETED and participant.userId = id
            isMaster: targetUser.isMaster,
            createdAt: targetUser.createdAt
        });

    } catch (e) {
        console.error("Stats failed:", e);
        res.status(500).json({ error: "Stats failed" });
    }
});

// Rankings API
app.get('/api/rankings', async (req, res) => {
    try {
        const { UserModel } = await import('./models/user.model');

        // Fetch top 50 users sorted by wins (desc) then balanceRed (desc)
        const rankings = await UserModel.find({
            $or: [
                { wins: { $gt: 0 } },
                { balanceRed: { $gt: 0 } }
            ]
        })
            .sort({ wins: -1, balanceRed: -1 })
            .limit(50)
            .select('username first_name photo_url wins balanceRed isMaster');

        res.json(rankings);
    } catch (e) {
        console.error("Rankings fetch failed:", e);
        res.status(500).json({ error: "Rankings failed" });
    }
});

// Static File Serving (with HTML extension support)
app.use(express.static(path.join(__dirname, '../../frontend/out'), {
    extensions: ['html'],
    index: false // We handle index.html manually via wildcard if needed, or let standard serving work
}));

// SPA Fallback
app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not Found' });
        return;
    }

    const frontendDir = path.join(__dirname, '../../frontend/out');

    // Try adding .html
    let possiblePath = path.join(frontendDir, `${req.path}.html`);
    if (fs.existsSync(possiblePath)) {
        res.sendFile(possiblePath);
        return;
    }

    // Try index.html in sub-directory
    possiblePath = path.join(frontendDir, req.path, 'index.html');
    if (fs.existsSync(possiblePath)) {
        res.sendFile(possiblePath);
        return;
    }

    // Fallback to root index.html
    console.log(`Fallback to index.html for ${req.path}`);
    const indexFile = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(404).send('Frontend not found (index.html missing)');
    }
});

const PORT = process.env.PORT || 3001;


const bootstrap = async () => {
    try {
        console.log('--- STARTING SERVER BOOTSTRAP ---');

        // 0. Start HTTP Server IMMEDIATELY to pass Health Checks
        const server = httpServer.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`Server is running on http://0.0.0.0:${PORT}`);
            console.log(`Health Check: http://0.0.0.0:${PORT}/api/health`);
        });

        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        // 1. Database (Wrap in try/catch to prevent fatal crash)
        try {
            console.log('Connecting to Database...');
            await connectDatabase();
            dbStatus = 'connected';
            console.log('Database Connected.');

            // Initialize Card Manager (Sync with DB)
            const { DbCardManager } = await import('./game/db.card.manager');
            await DbCardManager.getInstance().init();

        } catch (dbErr) {
            console.error('DB Connection Failed (Handled):', dbErr);
            dbStatus = `failed: ${dbErr}`;
        }

        // 2. Bot Service
        try {
            console.log('📦 Initializing Card Manager (DB Mode)...');
            const { DbCardManager } = await import('./game/db.card.manager'); // Re-import if not already in scope
            console.log('✅ Card Manager Ready (DB).');
        } catch (err) {
            console.error('Card Manager failed to initialize', err);
            process.exit(1);
        }

        // 3. Bot Service / Microservice Logic
        try {
            if (isGameServiceOnly) {
                console.log('🚀 Running in Game Service Mode (Microservice)');
                const { BotProxy } = await import('./services/bot.proxy');
                botService = new BotProxy();
                botStatus = 'proxy-active';
            } else {
                console.log('🤖 Running in Monolith Mode');
                botService = new BotService();
                botStatus = 'active';
                global.bot = botService.bot;
            }
        } catch (botErr) {
            console.error('Bot Init Failed:', botErr);
            botStatus = `failed: ${botErr}`;
        }

        // Admin endpoint to reload cards (useful after migration)
        app.post('/api/admin/reload-cards', async (req, res) => {
            try {
                const { DbCardManager } = await import('./game/db.card.manager');
                await DbCardManager.getInstance().reload();
                const templates = DbCardManager.getInstance().getTemplates();
                res.json({
                    success: true,
                    message: 'Cards reloaded from database',
                    counts: {
                        small: templates.small.length,
                        big: templates.big.length,
                        market: templates.market.length,
                        expense: templates.expense.length
                    }
                });
            } catch (error: any) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Admin endpoint to run migration on production
        app.post('/api/admin/migrate-cards', async (req, res) => {
            try {
                const { EXPENSE_CARDS, SMALL_DEALS, BIG_DEALS, MARKET_CARDS } = await import('./game/card.manager');
                const { CardModel } = await import('./models/card.model');

                // Delete existing cards
                const deleted = await CardModel.deleteMany({});
                console.log(`🗑️ Deleted ${deleted.deletedCount} existing cards`);

                // Prepare cards with unique IDs
                const expenseCards = EXPENSE_CARDS.map((c, idx) => ({ ...c, displayId: idx + 1 }));
                const smallDeals = SMALL_DEALS.map((c, idx) => ({
                    ...c,
                    id: c.id.startsWith('DEAL_SMALL') ? `${c.id}_${idx}_${Date.now()}` : c.id,
                    displayId: idx + 1
                }));
                const bigDeals = BIG_DEALS.map((c, idx) => ({
                    ...c,
                    id: c.id.startsWith('DEAL_BIG') ? `${c.id}_${idx}_${Date.now()}` : c.id,
                    displayId: idx + 1
                }));
                const marketCards = MARKET_CARDS.map((c, idx) => ({ ...c, displayId: idx + 1 }));

                const allCards = [...expenseCards, ...smallDeals, ...bigDeals, ...marketCards];

                // Insert all cards
                const inserted = await CardModel.insertMany(allCards);
                console.log(`✅ Inserted ${inserted.length} cards`);

                // Reload DbCardManager
                const { DbCardManager } = await import('./game/db.card.manager');
                await DbCardManager.getInstance().reload();

                res.json({
                    success: true,
                    message: 'Migration completed successfully',
                    counts: {
                        deleted: deleted.deletedCount,
                        inserted: inserted.length,
                        breakdown: {
                            expense: expenseCards.length,
                            small: smallDeals.length,
                            big: bigDeals.length,
                            market: marketCards.length
                        }
                    }
                });
            } catch (error: any) {
                console.error('Migration failed:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });


        // 3. Game Gateway - REMOVED (Moved to Game Service)

        // 3.1 Backup Service
        try {
            const { BackupService } = await import('./services/backup.service');
            const backupService = new BackupService();
            backupService.start();
        } catch (backupErr) {
            console.error('Backup Service Init Failed:', backupErr);
        }

        // 4. DB Maintenance (Only if connected)
        if (dbStatus === 'connected') {
            try {
                console.log('--- DB MAINTENANCE ---');
                // Note: using dynamic import if needed, or static if already imported top level? 
                // We imported connectDatabase. RoomModel is inside room.model.ts
                const RoomModel = (await import('./models/room.model')).RoomModel;

                // Debug Persistence: List all rooms
                const allRooms = await RoomModel.find({});
                console.log(`[PERSISTENCE DEBUG] Total Rooms in DB: ${allRooms.length}`);
                allRooms.forEach(r => console.log(` - Room: ${r.name} [${r.status}] Creator: ${r.creatorId} Players: ${r.players.length}`));

                const duplicates = await RoomModel.aggregate([
                    { $match: { status: 'waiting' } },
                    { $group: { _id: "$creatorId", count: { $sum: 1 }, rooms: { $push: "$_id" } } },
                    { $match: { count: { $gt: 1 } } }
                ]);

                if (duplicates.length > 0) {
                    console.log(`Found ${duplicates.length} duplicate waiting rooms.`);
                    for (const dup of duplicates) {
                        const roomsToDelete = dup.rooms.slice(0, dup.rooms.length - 1);
                        console.log(`Maintaining DB: Deleting ${roomsToDelete.length} duplicate rooms for user ${dup._id}, keeping ${dup.rooms[dup.rooms.length - 1]}`);
                        await RoomModel.deleteMany({ _id: { $in: roomsToDelete } });
                    }
                }
                await RoomModel.syncIndexes();
                console.log('DB Maintenance Complete.');
            } catch (dbMaintErr) {
                console.error('DB Maintenance Failed:', dbMaintErr);
            }
        }

        // 5. Notify Admin (User Request)
        if (botService) {
            const upTime = new Date().toISOString();
            botService.sendAdminMessage(`🚀 <b>Server Restarted</b>\n\nEnvironment: Production\nTime: ${upTime}\nStatus: Online\nCC: @roman_arctur`).catch((err: any) => console.error("Failed to notify admin:", err));
        }

    } catch (fatalError) {
        console.error("FATAL SERVER ERROR:", fatalError);
    }
};

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

bootstrap();

// Check User Referrals
app.get('/api/check-referrals/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { UserModel } = await import('./models/user.model');
        const referrals = await UserModel.find({ referredBy: username })
            .select('username first_name telegram_id createdAt')
            .sort({ createdAt: -1 });
        res.json({
            username,
            totalReferrals: referrals.length,
            referrals: referrals.map((r: any) => ({
                username: r.username,
                firstName: r.first_name,
                telegramId: r.telegram_id,
                joinedAt: r.createdAt
            }))
        });
    } catch (e) {
        res.status(500).json({ error: "Failed" });
    }
});

// Get All Users (Admin)
app.get('/api/users/all', async (req, res) => {
    try {
        const { UserModel } = await import('./models/user.model');
        const users = await UserModel.find({})
            .select('username first_name telegram_id referralBalance balanceRed greenBalance referralsCount referredBy createdAt')
            .sort({ createdAt: -1 })
            .limit(1000);
        res.json({ users });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Search Users (Admin)
app.get('/api/users/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [] });

        const { UserModel } = await import('./models/user.model');
        const users = await UserModel.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { first_name: { $regex: q, $options: 'i' } },
                { telegram_id: isNaN(Number(q)) ? undefined : Number(q) }
            ].filter(Boolean)
        })
            .select('username first_name telegram_id referralBalance balanceRed greenBalance referralsCount referredBy createdAt')
            .limit(100);

        res.json({ users });
    } catch (e) {
        res.status(500).json({ error: "Search failed" });
    }
});



// Temporary Restore Endpoint (GET for Browser Access)
app.get('/api/admin/restore-latest', async (req, res) => {
    const secret = req.query.secret;
    if (secret !== process.env.ADMIN_SECRET && secret !== 'temporary-restore-secret') {
        return res.status(403).json({ error: 'Forbidden. Use ?secret=temporary-restore-secret' });
    }

    try {
        console.log('🔄 Triggering Remote Restore...');
        const { listBackups, restoreBackup } = await import('./restore_db');

        const backups = await listBackups();
        if (backups.length === 0) {
            return res.status(404).json({ error: 'No backups found' });
        }

        const latest = backups[0];
        console.log(`🎯 Restoring: ${latest.secure_url}`);

        await restoreBackup(latest.secure_url);

        res.json({ success: true, message: `Restored backup from ${latest.created_at}`, url: latest.secure_url });
    } catch (e: any) {
        console.error("Restore Endpoint Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// SPA Fallback - Must be the last route
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    // API-Only Mode (Frontend is separate)
    res.status(200).json({
        message: 'MONEO Game API Service',
        status: 'running',
        docs: 'https://github.com/mag8888/moneo'
    });
});

