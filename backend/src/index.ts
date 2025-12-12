import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BotService } from './bot/bot.service';
import { AuthController } from './auth/auth.controller';
import { GameGateway } from './game/game.gateway';

import { connectDatabase } from './database';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Enable Trust Proxy for Railway LB
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
    transports: ['polling', 'websocket'] // Explicit fallback
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', AuthController);

// Initialize Bot
const botService = new BotService();
// Initialize Game Gateway
const gameGateway = new GameGateway(io);

import path from 'path';
import fs from 'fs';

// ... (imports)

// ...

// Serve specific HTML files for known routes to avoid wildcard issues
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
        res.sendFile(path.join(__dirname, '../../frontend/out/index.html')); // Fallback to login?
    }
});

app.get('/game/:id', (req, res) => {
    // Redirect legacy URL to new Query Param URL
    const id = req.params.id;
    res.redirect(`/game?id=${id}`);
});

app.use(express.static(path.join(__dirname, '../../frontend/out')));

app.get(/.*/, (req, res) => {
    // API routes should be handled above
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not Found' });
        return;
    }

    const frontendDir = path.join(__dirname, '../../frontend/out');

    // 1. Try exact match (e.g. /favicon.ico) - handled by express.static above? 
    // express.static handles files if they exist. If we are here, express.static missed it (or it's a route).

    // 2. Try adding .html (e.g. /game -> /game.html)
    let possiblePath = path.join(frontendDir, `${req.path}.html`);
    if (fs.existsSync(possiblePath)) {
        res.sendFile(possiblePath);
        return;
    }

    // 3. Try index.html in directory (e.g. /game -> /game/index.html)
    possiblePath = path.join(frontendDir, req.path, 'index.html');
    if (fs.existsSync(possiblePath)) {
        res.sendFile(possiblePath);
        return;
    }

    // 4. Fallback to root index.html (SPA Fallback)
    // Only if we truly want SPA behavior for unknown routes, usually 404 is better for static export,
    // but for user friendliness we might fallback to login or 404.
    // Given the user is claiming "flies to registration", we essentially ARE falling back to index.html currently.
    // If we want to fix "files to registration" we should serve the CORRECT page. 
    // If the correct page doesn't exist, we SHOULD fall back to index (Login) or 404.

    // Let's fallback to index.html but maybe log it
    console.log(`Fallback to index.html for ${req.path}`);
    res.sendFile(path.join(frontendDir, 'index.html'));
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});



const server = httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Increase Keep-Alive Timeout for Load Balancers (Railway/AWS/Nginx)
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds
