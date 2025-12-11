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

// ... (imports)

// ...

app.get('/game/:id', (req, res) => {
    // Redirect legacy URL to new Query Param URL
    const id = req.params.id;
    res.redirect(`/game?id=${id}`);
});

app.use(express.static(path.join(__dirname, '../../frontend/out')));

app.get('*', (req, res) => {
    // API routes should be handled above or ignored here if strict
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not Found' });
        return;
    }
    const indexPath = path.join(__dirname, '../../frontend/out/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(500).send('Frontend not built or missing.');
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



httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
