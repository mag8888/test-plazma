import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './room.service';
import { GameEngine, FULL_BOARD } from './engine';
import { UserModel } from '../models/user.model';

export class GameGateway {
    private io: Server;
    private roomService: RoomService;
    private games: Map<string, GameEngine> = new Map();

    constructor(io: Server) {
        this.io = io;
        this.roomService = new RoomService();
        // Moved initGames to explicit initialize() call
        this.initEvents();
    }

    async initialize() {
        // Restore active games from DB on server restart
        const activeRooms = await this.roomService.getActiveGames();
        console.log(`Restoring ${activeRooms.length} active games...`);
        for (const room of activeRooms) {
            try {
                if (room.gameState) {
                    const engine = new GameEngine(room.id, room.players, room.creatorId);
                    // Hydrate state but FORCE UPDATE BOARD structure (to apply layout fixes to existing games)
                    Object.assign(engine.state, room.gameState);

                    // CRITICAL FIX: Overwrite the restored board with the new code definition
                    // This ensures old games get the new Payday/Deal layout
                    engine.state.board = FULL_BOARD;

                    this.games.set(room.id, engine);
                    console.log(`Restored game ${room.id} (Turn: ${room.gameState.currentTurnTime}) | Board Updated`);
                }
            } catch (err) {
                console.error(`Failed to restore room ${room.id}:`, err);
                // Continue to next room - DO NOT CRASH SERVER
            }
        }
    }

    private saveState(roomId: string, game: GameEngine) {
        const state = game.getState();
        // Debug Logging for Turn Persistence
        // console.log(`[Persist] Room ${roomId} | Turn Index: ${state.currentPlayerIndex} | Player: ${state.players[state.currentPlayerIndex]?.name}`);
        this.roomService.saveGameState(roomId, state).catch(err => console.error("Persist Error:", err));
    }

    initEvents() {
        // Game Loop for Timers (Every 1s)
        setInterval(() => {
            this.games.forEach((game, roomId) => {
                try {
                    const changed = game.checkTurnTimeout();
                    if (changed) {
                        this.io.to(roomId).emit('turn_ended', { state: game.getState() });
                        // Also persist state
                        this.saveState(roomId, game);
                    }
                } catch (err) {
                    console.error(`Error in game loop for room ${roomId}:`, err);
                }
            });
        }, 1000);

        this.io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);

            // Get available rooms
            socket.on('get_rooms', async (callback) => {
                const rooms = await this.roomService.getRooms();
                callback(rooms);
            });

            // Get Leaderboard
            socket.on('get_leaderboard', async (callback) => {
                try {
                    // Fetch top 10 players by wins
                    const leaders = await UserModel.find({ wins: { $gt: 0 } })
                        .sort({ wins: -1 })
                        .limit(10)
                        .select('username firstName lastName wins photo_url');

                    callback({ success: true, leaders });
                } catch (e) {
                    console.error("Leaderboard Error:", e);
                    callback({ success: false, error: "Failed to fetch leaderboard" });
                }
            });

            // Create Room
            socket.on('create_room', async (data, callback) => {
                try {
                    const { name, maxPlayers, timer, password, playerName, userId } = data; // Expect userId
                    const room = await this.roomService.createRoom(
                        socket.id,
                        userId || 'guest_' + socket.id, // Fallback
                        playerName || 'Player',
                        name,
                        maxPlayers,
                        timer,
                        password,
                        data.token,
                        data.dream
                    );
                    socket.join(room.id);
                    if (userId) socket.join(userId);
                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms); // Broadcast update
                    callback({ success: true, room });
                } catch (e: any) {
                    console.error("Create Room Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Add Bot
            socket.on('add_bot', async (data, callback) => {
                try {
                    const { roomId, difficulty, userId } = data;
                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room) return callback({ success: false, error: "Room not found" });
                    if (room.creatorId !== userId) return callback({ success: false, error: "Only host can add bots" });

                    const updatedRoom = await this.roomService.addBot(roomId, difficulty);

                    // Broadcast
                    this.io.to(roomId).emit('room_state_updated', updatedRoom);
                    this.io.emit('rooms_updated', await this.roomService.getRooms());

                    callback({ success: true, room: updatedRoom });
                } catch (e: any) {
                    console.error("Add Bot Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Join Room
            socket.on('join_room', async (data, callback) => {
                try {
                    // ... (no change to logic, just context)
                    console.log(`Join Request: Room ${data.roomId} User ${data.userId}`);
                    const { roomId, password, playerName, userId } = data; // Expect userId
                    const room = await this.roomService.joinRoom(
                        roomId,
                        socket.id,
                        userId || 'guest_' + socket.id,
                        playerName || 'Player',
                        password,
                        data.token,
                        data.dream
                    );
                    socket.join(room.id);
                    if (userId) socket.join(userId);
                    // Broadcast update to Lobby so player counts update in real-time
                    this.io.emit('rooms_updated', await this.roomService.getRooms());

                    // Sync Active Game Engine if exists
                    const game = this.games.get(roomId);
                    if (game) {
                        // Check if player exists in Engine
                        const existsInEngine = game.state.players.find(p => p.userId === userId);
                        console.log(`[Gateway] Player ${userId} joining room ${roomId}. ExistsInEngine:`, !!existsInEngine);
                        console.log(`[Gateway] Current players in engine:`, game.state.players.map(p => `${p.name}(${p.userId})`).join(', '));

                        if (!existsInEngine) {
                            // NEW PLAYER JOINING ACTIVE GAME
                            console.log(`[Gateway] Adding NEW player ${userId} to active game ${roomId}`);
                            // Find full player object from RoomService return (it has token, dream, etc updated)
                            const playerInfo = room.players.find((p: any) => p.userId === userId);
                            console.log(`[Gateway] PlayerInfo from room.players:`, playerInfo ? `${playerInfo.name}(${playerInfo.userId})` : 'NOT FOUND');
                            if (playerInfo) {
                                game.addPlayer(playerInfo);
                            }
                        } else {
                            // RECONNECTING PLAYER
                            console.log(`[Gateway] Reconnecting player ${userId}, updating socket ID from ${existsInEngine.id} to ${socket.id}`);
                            game.updatePlayerId(userId, socket.id);
                        }

                        // Re-emit game start to ensure client has latest state with correct ID/List
                        this.io.to(roomId).emit('game_started', { roomId, state: game.getState() });

                        // Force state update broadcast
                        this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    }

                    this.io.to(roomId).emit('room_state_updated', room);

                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);
                    callback({ success: true, room });
                } catch (e: any) {
                    console.error("Join Room Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Get User's Active Rooms (Waiting or Playing)
            socket.on('get_my_rooms', async (data, callback) => {
                try {
                    if (!data.userId) return callback({ success: false, error: "No userId" });
                    const rooms = await this.roomService.getMyRooms(data.userId);
                    callback({ success: true, rooms });
                } catch (e: any) {
                    callback({ success: false, error: e.message });
                }
            });

            // WebRTC Signaling
            socket.on('signal', (data) => {
                // Forward signal to specific target
                // data: { to: socketId, signal: any }
                const { to, signal } = data;
                if (to) {
                    this.io.to(to).emit('signal', { from: socket.id, signal });
                }
            });

            // WebSocket Transcription Event
            socket.on('transcript', (data) => {
                const { roomId, text, userId, name } = data;
                // Broadcast to room (including sender? usually sender sees their own local preview, but for sync logs, broadcast to others).
                // Let's broadcast to Room excluding sender, OR everyone if we want unified server timestamp.
                // Simpler: Broadcast to everyone BUT sender, sender handles local display immediately for latency.
                socket.to(roomId).emit('transcript_received', { userId, text, name, timestamp: Date.now() });
            });

            // Leave Room
            socket.on('leave_room', async (data) => {
                const { roomId, userId } = data;
                await this.roomService.leaveRoom(roomId, socket.id, userId);
                socket.leave(roomId);
                const room = await this.roomService.getRoom(roomId);
                if (room) {
                    this.io.to(roomId).emit('room_state_updated', room);
                }
                const rooms = await this.roomService.getRooms();
                this.io.emit('rooms_updated', rooms);
            });

            // Kick Player
            socket.on('kick_player', async (data, callback) => {
                try {
                    const { roomId, playerId, userId } = data; // Expect userId (Requester)

                    // 1. Perform RoomService Logic (Lobby/DB check)
                    await this.roomService.kickPlayer(roomId, userId, playerId);

                    // 2. Active Game Logic
                    const game = this.games.get(roomId);
                    if (game) {
                        game.removePlayer(playerId);
                        // If game ended due to lack of players?
                        this.io.to(roomId).emit('game_state_update', game.getState());
                        this.saveState(roomId, game);
                    }

                    // Notify the kicked player
                    this.io.to(roomId).emit('player_kicked', { playerId });

                    // Broadcast Room Update
                    const room = await this.roomService.getRoom(roomId);
                    if (room) {
                        this.io.to(roomId).emit('room_state_updated', room);
                        // If game is active, also sync players list in DB if needed? 
                        // roomService.kickPlayer handles DB pull.
                    }
                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);

                    callback({ success: true });
                } catch (e: any) {
                    console.error("Kick Player Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Host Skip Turn (Force End Turn)
            socket.on('host_skip_turn', async (data, callback) => {
                try {
                    const { roomId, userId } = data;
                    const game = this.games.get(roomId);
                    if (!game) return callback({ success: false, error: "Game not found" });

                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room || room.creatorId !== userId) {
                        return callback({ success: false, error: "Only host can skip turns" });
                    }

                    game.addLog(`⏩ Host forced end of turn.`);
                    game.endTurn();

                    const state = game.getState();
                    this.io.to(roomId).emit('turn_ended', { state });
                    this.saveState(roomId, game);

                    callback({ success: true });
                } catch (e: any) {
                    callback({ success: false, error: e.message });
                }
            });

            // Host Give Cash (Gift)
            socket.on('host_give_cash', async (data, callback) => {
                try {
                    const { roomId, userId, targetPlayerId, amount } = data;
                    const game = this.games.get(roomId);
                    if (!game) return callback({ success: false, error: "Game not found" });

                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room || room.creatorId !== userId) {
                        return callback({ success: false, error: "Only host can give cash" });
                    }

                    game.giveCash(targetPlayerId, amount);

                    const state = game.getState();
                    this.io.to(roomId).emit('game_state_update', state);
                    this.saveState(roomId, game);

                    callback({ success: true });
                } catch (e: any) {
                    callback({ success: false, error: e.message });
                }
            });

            // Host Force End Game
            socket.on('host_end_game', async (data, callback) => {
                try {
                    const { roomId, userId } = data;
                    const game = this.games.get(roomId);
                    if (!game) return callback({ success: false, error: "Game not found" });

                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room || room.creatorId !== userId) {
                        return callback({ success: false, error: "Only host can end game" });
                    }

                    // Calculate Final Rankings
                    const rankings = game.calculateFinalRankings();
                    game.addLog(`🛑 HOST ЗАВЕРШИЛ ИГРУ!`);

                    // Access State directly from game instance (public read access usually?)
                    // Engine 'state' is private/protected? Let's assume getState() returns ref or I can access internals.
                    // Actually 'game.getState()' returns the object. 
                    const state = game.getState();
                    const winnerName = state.winner;

                    // Update DB Stats
                    const { UserModel } = await import('../models/user.model');

                    // New Ranking Logic (10, 6, 4, 3, 2, 1, 0.5, 0)
                    const POINTS_MAP = [10, 6, 4, 3, 2, 1, 0.5]; // Index 0 = Place 1

                    for (const rank of rankings) {
                        if (rank.userId) {
                            const points = POINTS_MAP[rank.place - 1] || 0;

                            const update: any = { $inc: { rating: points } };
                            if (rank.place === 1) {
                                update.$inc.wins = 1;
                            }

                            await UserModel.findOneAndUpdate(
                                { _id: rank.userId },
                                update
                            ).catch(e => console.error(`Failed to update ranking for ${rank.name}:`, e));

                            // Attach points to ranking object for frontend display if needed
                            (rank as any).earnedPoints = points;
                        }
                    }

                    // Emit Game Ended
                    this.io.to(roomId).emit('game_over', {
                        winner: winnerName,
                        rankings: rankings
                    });

                    this.saveState(roomId, game);

                    callback({ success: true });
                } catch (e: any) {
                    console.error("Force End Game Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Delete Room (Host)
            socket.on('delete_room', async (data, callback) => {
                try {
                    const { roomId, userId } = data;
                    await this.roomService.deleteRoom(roomId, userId);

                    // If game was active, remove it from memory
                    this.games.delete(roomId);

                    // Notify everyone (Room removed)
                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);

                    // Force redirect for anyone inside?
                    // Client needs to listen for room deletion or handle "Room not found" gracefully.
                    this.io.to(roomId).emit('room_deleted');

                    callback({ success: true });
                } catch (e: any) {
                    callback({ success: false, error: e.message });
                }
            });

            // Player Ready
            socket.on('player_ready', async (data, callback) => {
                try {
                    console.log('socket event: player_ready', JSON.stringify(data));
                    const { roomId, isReady, dream, token, userId } = data; // Expect userId
                    const room = await this.roomService.setPlayerReady(
                        roomId,
                        socket.id,
                        userId, // Pass userId for JIT check
                        isReady,
                        dream,
                        token
                    );
                    this.io.to(roomId).emit('room_state_updated', room);
                    callback({ success: true });
                } catch (e: any) {
                    console.error('player_ready error:', e);
                    callback({ success: false, error: e.message });
                }
            });

            // Start Game
            socket.on('start_game', async (data) => {
                const { roomId, userId } = data;
                try {
                    // Service now handles auth via userId
                    await this.roomService.startGame(roomId, userId);

                    // Init Engine (need fresh room data)
                    const room = await this.roomService.getRoom(roomId);

                    // Shuffle Players Logic
                    // 1. Create a shuffled copy of players
                    const shuffledPlayers = [...room.players];
                    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
                    }

                    // 2. Init Engine with Shuffled Players
                    const engine = new GameEngine(roomId, shuffledPlayers, room.creatorId);

                    // 3. Log the result
                    const orderNames = shuffledPlayers.map(p => p.name).join(' -> ');
                    engine.state.log.push(`🎲 Random Order: ${orderNames}`);

                    this.games.set(roomId, engine);

                    this.io.to(roomId).emit('game_started', { roomId, state: engine.getState() });

                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);
                } catch (e) {
                    console.error("Start game failed:", e);
                }
            });

            // Chat Message
            socket.on('chat_message', (payload: { roomId: string, message: string }) => {
                const { roomId, message } = payload;
                const game = this.games.get(roomId);
                if (!game) return;

                const player = game.state.players.find(p => p.id === socket.id);
                if (!player) return;

                if (!message || message.trim().length === 0) return;

                // Add to log
                game.state.log.push(`💬 ${player.name}: ${message.trim().slice(0, 100)}`); // Limit length
                this.io.to(roomId).emit('game_state_update', game.state);
            });

            // Game Actions - Helper to save state
            const saveState = (roomId: string, game: GameEngine) => {
                this.roomService.saveGameState(roomId, game.getState()).catch(err => console.error("Persist Error:", err));
            };

            socket.on('roll_dice', ({ roomId, diceCount }) => {
                const game = this.games.get(roomId);
                if (!game) {
                    console.log(`[roll_dice] No game found for room ${roomId}`);
                    return;
                }

                const currentPlayer = game.state.players[game.state.currentPlayerIndex];
                console.log(`[roll_dice] Room: ${roomId}, Phase: ${game.state.phase}, Current Player: ${currentPlayer?.name}(${currentPlayer?.id}), Socket: ${socket.id}`);

                // Check for BABY_ROLL phase
                if (game.getState().phase === 'BABY_ROLL') {
                    const result: any = game.resolveBabyRoll();
                    const state = game.getState();

                    // Emit result
                    this.io.to(roomId).emit('dice_rolled', {
                        roll: result.total || result,
                        diceValues: result.values || [result],
                        state,
                        message: result.total <= 4 ? "Baby Born! +$5000" : "No Baby."
                    });
                    saveState(roomId, game);
                    return;
                }

                const result = game.rollDice(diceCount);
                // result is { total: number, values: number[] } or just number (0) if failed
                // To be safe, check type or assume object if not 0

                let roll = 0;
                let diceValues: number[] = [];

                if (typeof result === 'object') {
                    roll = result.total;
                    diceValues = result.values;
                } else {
                    roll = result;
                }

                const state = game.getState();
                this.io.to(roomId).emit('dice_rolled', { roll, diceValues, state });
                saveState(roomId, game);
            });

            socket.on('donate_charity', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    game.donateCharity(socket.id);
                    const state = game.getState();
                    this.io.to(roomId).emit('state_updated', { state });
                    saveState(roomId, game);
                }
            });

            socket.on('skip_charity', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    game.skipCharity(socket.id);
                    const state = game.getState();
                    this.io.to(roomId).emit('state_updated', { state }); // Or turn_ended if it ends turn
                    saveState(roomId, game);
                }
            });

            socket.on('take_loan', ({ roomId, amount }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.takeLoan(socket.id, amount);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('repay_loan', ({ roomId, amount }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.repayLoan(socket.id, amount);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('transfer_funds', ({ roomId, toId, amount }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        // Find from player by socket.id
                        const fromPlayer = game.state.players.find(p => p.id === socket.id);
                        if (!fromPlayer || !fromPlayer.userId) {
                            console.error(`[transfer_funds] Cannot find player with socket.id ${socket.id}`);
                            socket.emit('error', 'Player not found');
                            return;
                        }

                        game.transferFunds(fromPlayer.id, toId, amount);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('buy_asset', ({ roomId, quantity, cardId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        const result: any = game.buyAsset(socket.id, quantity, cardId);
                        const state = game.getState();

                        if (result && result.mlmRoll) {
                            this.io.to(roomId).emit('dice_rolled', {
                                roll: result.mlmRoll,
                                state,
                                type: 'MLM',
                                message: `Привлечено ${result.mlmRoll} партнеров! +$${result.mlmCashflow}/мес`
                            });
                        }
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('resolve_opportunity', ({ roomId, choice }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.resolveOpportunity(choice);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('decision_downsized', ({ roomId, choice }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.handleDownsizedDecision(socket.id, choice);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('sell_stock', ({ roomId, quantity }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.sellStock(socket.id, quantity);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });


            socket.on('transfer_asset', ({ roomId, toPlayerId, assetIndex, quantity }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        // CRITICAL FIX: Find userId from socket.id for BOTH players
                        const fromPlayer = game.state.players.find(p => p.id === socket.id);
                        if (!fromPlayer || !fromPlayer.userId) {
                            console.error(`[transfer_asset] Cannot find FROM player with socket.id ${socket.id}`);
                            socket.emit('error', 'Player not found in game');
                            return;
                        }

                        const toPlayer = game.state.players.find(p => p.id === toPlayerId);
                        if (!toPlayer || !toPlayer.userId) {
                            console.error(`[transfer_asset] Cannot find TO player with id ${toPlayerId}`);
                            socket.emit('error', 'Recipient not found in game');
                            return;
                        }

                        const fromUserId = fromPlayer.userId;
                        const toUserId = toPlayer.userId;
                        console.log(`[transfer_asset] Transfer from ${fromUserId} (socket: ${socket.id}) to ${toUserId} (socket: ${toPlayerId}), asset ${assetIndex}`);

                        game.transferAsset(fromUserId, toUserId, assetIndex, quantity);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        console.error('[transfer_asset] Error:', e);
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('sell_asset', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.sellAsset(socket.id);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('dismiss_card', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.dismissCard();
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('transfer_deal', ({ roomId, targetPlayerId, cardId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        // Find from player by socket.id
                        const fromPlayer = game.state.players.find(p => p.id === socket.id);
                        if (!fromPlayer || !fromPlayer.userId) {
                            console.error(`[transfer_deal] Cannot find player with socket.id ${socket.id}`);
                            socket.emit('error', 'Player not found');
                            return;
                        }

                        game.transferDeal(fromPlayer.userId, targetPlayerId, cardId);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });




            // Host Reshuffle Decks
            socket.on('host_reshuffle_decks', ({ roomId, userId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        // Verify creator (basic check)
                        if (game.state.creatorId !== userId) {
                            throw new Error("Only room creator can reshuffle decks");
                        }

                        // Call reshuffle method
                        game.cardManager.reshuffleAllDecks();
                        game.addLog(`🔄 Host reshuffled all card decks`);

                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('draw_deal', ({ roomId, type }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.drawDeal(socket.id, type);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('end_turn', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    // Prevent Ending Turn if Phase is ROLL (Must roll first)
                    // EXCEPTION: If player was Downsized (lastEvent.type === 'DOWNSIZED'), they can end turn even if phase stuck in ROLL (legacy/restored games)
                    if (game.getState().phase === 'BABY_ROLL') {
                        return;
                    }

                    if (game.getState().phase === 'ROLL') {
                        const lastEvent = game.getState().lastEvent;
                        if (lastEvent?.type !== 'DOWNSIZED') {
                            return;
                        }
                    }
                    game.endTurn();
                    const state = game.getState();
                    this.io.to(roomId).emit('turn_ended', { state });
                    saveState(roomId, game);
                }
            });

            // Fast Track Entry
            socket.on('enter_fast_track', (data) => {
                const { roomId, userId } = data; // userId needed
                const game = this.games.get(roomId);
                if (game) {
                    game.enterFastTrack(userId || socket.id);
                    this.io.to(roomId).emit('state_updated', game.getState());
                    this.saveState(roomId, game);
                }
            });

            // Chat Message
            socket.on('chat_message', (data) => {
                const { roomId, text, senderId, senderName, avatar } = data;
                const game = this.games.get(roomId);
                if (game) {
                    const message = {
                        id: uuidv4(),
                        senderId,
                        senderName,
                        text,
                        timestamp: Date.now(),
                        avatar
                    };
                    game.state.chat.push(message);

                    // Keep chat history limited (e.g., last 100 messages)
                    if (game.state.chat.length > 100) {
                        game.state.chat.shift();
                    }

                    this.io.to(roomId).emit('state_updated', game.getState());
                    // Optional: Specific 'chat_update' if state is too big, but for now state_updated is fine
                    this.saveState(roomId, game);
                }
            });

            // End Game (Host Only)
            socket.on('end_game_host', async (data) => {
                const { roomId, userId } = data;
                const game = this.games.get(roomId);
                const room = await this.roomService.getRoom(roomId);

                if (game && room) {
                    const rankings = game.calculateRankings();
                    game.state.rankings = rankings;
                    game.state.isGameEnded = true;
                    game.state.phase = 'END'; // Force END phase now

                    this.io.to(roomId).emit('game_over', { rankings, state: game.getState() });

                    // Update Wins in DB
                    const winnerName = rankings.find(r => r.place === 1)?.name;
                    if (winnerName) {
                        const winnerPlayer = game.state.players.find(p => p.name === winnerName);
                        if (winnerPlayer && winnerPlayer.userId && !winnerPlayer.userId.startsWith('guest_')) {
                            try {
                                await UserModel.findByIdAndUpdate(winnerPlayer.userId, { $inc: { wins: 1 } });
                                console.log(`🏆 Updated wins for user ${winnerPlayer.userId}`);
                            } catch (err) {
                                console.error("Failed to update wins:", err);
                            }
                        }
                    }

                    this.saveState(roomId, game);
                }
            });

            socket.on('disconnecting', async () => {
                // User Request: Room should NOT disappear on refresh/re-entry.
                // We disable auto-leave on disconnect for waiting rooms.
                // Cleanup is handled by 'createRoom' (removing old rooms) or manual 'Exit' button.

                /* 
                for (const roomId of socket.rooms) {
                    if (roomId !== socket.id) {
                        try {
                            const room = await this.roomService.getRoom(roomId);
                            if (room && room.status === 'waiting') {
                                console.log(`Client ${socket.id} disconnected from waiting room ${roomId} (Persistence Active)`);
                                // await this.roomService.leaveRoom(roomId, socket.id);
                                // Broadcast to remaining players in room
                                // const updatedRoom = await this.roomService.getRoom(roomId);
                                // if (updatedRoom) {
                                //    this.io.to(roomId).emit('room_state_updated', updatedRoom);
                                // }
                                // const rooms = await this.roomService.getRooms();
                                // this.io.emit('rooms_updated', rooms);
                            }
                        } catch (e) {
                            console.error(`Disconnect error for room ${roomId}:`, e);
                        }
                    }
                }
                */
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }
}
