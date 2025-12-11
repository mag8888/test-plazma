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
    }
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

app.get('/game/:id', (req, res) => {
    // Redirect legacy URL to new Query Param URL
    const id = req.params.id;
    res.redirect(`/game?id=${id}`);
});

app.use(express.static(path.join(__dirname, '../../frontend/out')));

app.get(/.*/, (req, res) => {
    // API routes should be handled above or ignored here if strict
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not Found' });
        return;
    }
    const indexPath = path.join(__dirname, '../../frontend/out/index.html');

    // DEBUG LOGGING
    console.log('DEBUG: Request to', req.path);
    console.log('DEBUG: __dirname:', __dirname);
    console.log('DEBUG: Resolved indexPath:', indexPath);
    console.log('DEBUG: Exists:', fs.existsSync(indexPath));

    try {
        const rootDir = path.join(__dirname, '../../');
        console.log(`DEBUG: Contents of ${rootDir}:`, fs.readdirSync(rootDir));
        const frontendDir = path.join(__dirname, '../../frontend');
        if (fs.existsSync(frontendDir)) {
            console.log(`DEBUG: Contents of ${frontendDir}:`, fs.readdirSync(frontendDir));
            const outDir = path.join(frontendDir, 'out');
            if (fs.existsSync(outDir)) {
                console.log(`DEBUG: Contents of ${outDir}:`, fs.readdirSync(outDir));
            } else {
                console.log('DEBUG: frontend/out does NOT exist');
            }
        } else {
            console.log('DEBUG: frontend directory does NOT exist');
        }
    } catch (e) {
        console.error('DEBUG: Error listing directories:', e);
    }

    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('SendFile Error:', err);
            res.status(500).send('Frontend not built or missing. Check server logs.');
        }
    });
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
