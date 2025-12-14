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

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Enable Trust Proxy for Railway LB

// Health Check Endpoint (Critical for Debugging)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const httpServer = createServer(app);

// Connect to Database
connectDatabase();

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket']
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', AuthController);

// Initialize Bot
const botService = new BotService();
// Initialize Game Gateway
const gameGateway = new GameGateway(io);

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
        // Wait for DB connection if needed (connectDatabase is async void but mongoose buffers)
        // Ideally we await it? connectDatabase in database.ts is async.
        // But we called it synchronously above. 
        // Let's call it here properly if we want to wait, or assume mongoose buffering works.
        // Re-calling it is fine if existing connection is reused?
        // Actually, let's keep it simple. It was called above.

        // DB Maintenance
        try {
            console.log('--- STARTING DB MAINTENANCE ---');
            const RoomModel = (await import('./models/room.model')).RoomModel;
            const duplicates = await RoomModel.aggregate([
                { $match: { status: 'waiting' } },
                { $group: { _id: "$creatorId", count: { $sum: 1 }, rooms: { $push: "$_id" } } },
                { $match: { count: { $gt: 1 } } }
            ]);

            if (duplicates.length > 0) {
                console.log(`Found ${duplicates.length} users with duplicate waiting rooms. Cleaning up...`);
                for (const dup of duplicates) {
                    const roomsToDelete = dup.rooms.slice(0, dup.rooms.length - 1);
                    await RoomModel.deleteMany({ _id: { $in: roomsToDelete } });
                }
                console.log('Duplicates removed.');
            }

            console.log('Syncing Indexes...');
            await RoomModel.syncIndexes();
            console.log('Indexes Synced Successfully.');
            console.log('--- DB MAINTENANCE COMPLETE ---');
        } catch (dbErr) {
            console.error('DB MAINTENANCE FAILED:', dbErr);
        }

        try {
            await gameGateway.initialize();
        } catch (initErr) {
            console.error("WARNING: Game Gateway Initialization failed:", initErr);
        }

        const server = httpServer.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Serving frontend from: ${path.join(__dirname, '../../frontend/out')}`);
        });

        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

bootstrap();
