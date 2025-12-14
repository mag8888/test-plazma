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
