import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BotService } from './bot/bot.service';
import { AuthController } from './auth/auth.controller';
import { GameGateway } from './game/game.gateway';
import { connectDatabase } from './database';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config();

// Global type augmentation
declare global {
    var bot: any;
}

let dbStatus = 'pending';
let botStatus = 'pending';

const app = express();
app.set('trust proxy', 1); // Enable Trust Proxy for Railway LB

// Health Check Endpoint (Critical for Debugging)
app.get('/api/health', (req, res) => {
    const health = {
        status: 'ok',
        uptime: process.uptime(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        bot: global.bot ? 'active' : 'inactive',
        version: '1.1.0-strict-rooms' // Tracer
    };
    res.status(200).json(health);
});

const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket']
});

app.use(express.json());
app.use('/api/auth', AuthController);

let botService: BotService | null = null;
let gameGateway: GameGateway | null = null;

// Static File Serving
app.get(['/game', '/game.html'], (req, res) => {
    const file = path.join(__dirname, '../../frontend/out/game.html');
    if (fs.existsSync(file)) {
        res.sendFile(file);
    } else {
        console.error(`Missing game.html at ${file}`);
        res.status(404).send('Game file not found');
    }
});

app.get(['/lobby', '/lobby.html'], (req, res) => {
    const file = path.join(__dirname, '../../frontend/out/lobby.html');
    if (fs.existsSync(file)) {
        res.sendFile(file);
    } else {
        console.error(`Missing lobby.html at ${file}`);
        res.sendFile(path.join(__dirname, '../../frontend/out/index.html'));
    }
});

app.get('/game/:id', (req, res) => {
    const id = req.params.id;
    res.redirect(`/game?id=${id}`);
});

// Game Schedule API
app.get('/api/games', async (req, res) => {
    try {
        const { ScheduledGameModel } = await import('./models/scheduled-game.model');
        // Fetch upcoming games, populated with host info if needed (hostId is Ref)
        const games = await ScheduledGameModel.find({
            status: 'SCHEDULED',
            startTime: { $gt: new Date() }
        })
            .sort({ startTime: 1 })
            .populate('hostId', 'username first_name photo_url') // Get host details
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
        res.json({ users: userCount });
    } catch (e) {
        console.error("Failed to fetch stats:", e);
        res.status(500).json({ error: "Stats Error" });
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

        if (type === 'PROMO') {
            if (freeSpots <= 0) return res.status(400).json({ error: "No promo spots" });
            // Repost link optional now
        } else if (type === 'PAID') {
            if (paidSpots <= 0) return res.status(400).json({ error: "No paid spots" });

            if (user.balanceRed >= game.price) {
                user.balanceRed -= game.price;
            } else if (user.referralBalance >= game.price) {
                user.referralBalance -= game.price;
            } else {
                return res.status(400).json({ error: "Insufficient balance" });
            }
            await user.save();

            // Log Transaction
            const { TransactionModel } = await import('./models/transaction.model');
            await TransactionModel.create({
                userId: user._id,
                amount: -game.price, // Negative for Payment
                currency: 'RED', // Simplification: we treat spending as RED mostly, but could be green. 
                // Let's mark as RED context for game.
                type: 'GAME_FEE',
                description: `Оплата игры ${new Date(game.startTime).toLocaleDateString()}`
            });
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
            repostLink: isPromo ? repostLink : undefined, // Might be empty initially
            isVerified: !isPromo, // Paid is auto-verified
            joinedAt: new Date()
        });

        await game.save();

        // Notify Host
        if (botService) {
            const { UserModel } = await import('./models/user.model');
            const host = await UserModel.findById(game.hostId);
            if (host?.telegram_id) {
                const t = type === 'PAID' ? '💰' : '🎟';
                const status = isPromo ? '(Ожидает подтверждения)' : '';
                const link = isPromo ? `\n🔗 Ссылка: ${repostLink}` : '';

                botService.bot?.sendMessage(host.telegram_id,
                    `ℹ️ Новый игрок: ${t} ${user.first_name} (@${user.username}) записался на ${new Date(game.startTime).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК). ${status}${link}`
                );
            }

            // Notify User (Welcome Message)
            if (user.telegram_id) {
                const dateStr = new Date(game.startTime).toLocaleString('ru-RU', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    timeZone: 'Europe/Moscow'
                });

                let msg = `✅ Вы записались на игру: ${dateStr}\n\n`;
                if (isPromo) {
                    msg += `Ваша заявка (Промо) принята и ожидает подтверждения мастера. Мы уведомим вас, когда мастер проверит репост.`;
                } else {
                    msg += `Будем рады видеть вас на игре!`;
                }

                botService.bot?.sendMessage(user.telegram_id, msg);
            }
        }

        res.json({ success: true, game });

    } catch (e) {
        console.error("Join failed:", e);
        res.status(500).json({ error: "Join failed" });
    }
});



app.use(express.static(path.join(__dirname, '../../frontend/out')));

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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

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
        } catch (dbErr) {
            console.error('DB Connection Failed (Handled):', dbErr);
            dbStatus = `failed: ${dbErr}`;
        }

        // 2. Bot Service
        try {
            console.log('Initializing Bot Service...');
            botService = new BotService();
            botStatus = 'active';
            console.log('Bot Service Active.');
        } catch (botErr) {
            console.error('Bot Init Failed:', botErr);
            botStatus = `failed: ${botErr}`;
        }

        // 3. Game Gateway
        try {
            console.log('Initializing Game Gateway...');
            gameGateway = new GameGateway(io);
            await gameGateway.initialize();
            console.log('Game Gateway Active.');
        } catch (gwErr) {
            console.error('Game Gateway Init Failed:', gwErr);
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
            botService.sendAdminMessage(`🚀 <b>Server Restarted</b>\n\nEnvironment: Production\nTime: ${upTime}\nStatus: Online\nCC: @roman_arctur`).catch(err => console.error("Failed to notify admin:", err));
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
