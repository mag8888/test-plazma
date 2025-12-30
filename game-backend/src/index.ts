
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { GameGateway } from './game/game.gateway';
import { DbCardManager } from './game/db.card.manager';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket']
});

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

// Store Gateway instance
let gameGateway: GameGateway;

// --- Redis Adapter Setup ---
const setupRedis = async () => {
    if (!REDIS_URL) {
        console.log('⚠️ No REDIS_URL found, using in-memory adapter. (Single instance mode)');
        return;
    }
    try {
        const pubClient = createClient({ url: REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log(`✅ Redis Adapter connected to ${REDIS_URL}`);
    } catch (e) {
        console.error('❌ Redis Connection Failed:', e);
        // Fallback to memory is automatic if adapter isn't set, but we might want to exit if clustering is critical
    }
};

// --- DB Connection ---
mongoose.connect(MONGO_URI as string)
    .then(async () => {
        console.log('✅ Game Server: Connected to MongoDB');

        await setupRedis();

        // Initialize Card Manager (Loads cards from DB or seeds defaults)
        await DbCardManager.getInstance().init();

        // Initialize Game Gateway after DB and Redis
        gameGateway = new GameGateway(io);
        await gameGateway.initialize();
        console.log('✅ Game Gateway Initialized');

    })
    .catch(err => console.error('❌ Game Server DB Error:', err));


// --- REST Endpoints (Proxied from Frontend) ---

// Health Check
app.get('/health', (req, res) => res.send('OK'));

app.post('/api/rooms/:roomId/baby/roll', (req, res) => {
    try {
        const { roomId } = req.params;
        if (!gameGateway) throw new Error("Game Service not ready");
        const result = gameGateway.handleBabyRoll(roomId);
        res.json({ success: true, ...result });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/rooms/:roomId/deal/transfer', (req, res) => {
    try {
        const { roomId } = req.params;
        const { fromUserId, targetPlayerId, cardId } = req.body;

        if (!fromUserId || !targetPlayerId || !cardId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!gameGateway) throw new Error("Game Service not ready");
        const result = gameGateway.handleTransferDeal(roomId, fromUserId, targetPlayerId, cardId);
        res.json({ success: true, ...result });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Admin: Force Reload Cards
app.post('/api/admin/cards/reload', async (req, res) => {
    try {
        const secret = req.headers['x-admin-secret'];
        if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        await DbCardManager.getInstance().reload();
        res.json({ success: true, message: "Cards reloaded from DB" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Force Re-Seed (Destructive)
app.post('/api/admin/cards/reseed', async (req, res) => {
    try {
        const secret = req.headers['x-admin-secret'];
        if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        await DbCardManager.getInstance().forceReseed();
        res.json({ success: true, message: "Cards Force Re-Seeded from Code" });
    } catch (e: any) {
        console.error('Reseed failed:', e);
        res.status(500).json({ error: e.message });
    }
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Game Server running on port ${PORT}`);
});
