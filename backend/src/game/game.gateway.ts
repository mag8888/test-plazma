import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './room.service';
import { GameEngine, FULL_BOARD } from './engine';
import { DbCardManager } from './db.card.manager';
import { UserModel } from '../models/user.model';

export class GameGateway {
    private io: Server;
    private roomService: RoomService;
    private games: Map<string, GameEngine> = new Map();
    private processedWinners: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

    constructor(io: Server) {
        this.io = io;
        this.roomService = new RoomService();
        // Moved initGames to explicit initialize() call
        this.initEvents();
    }

    async initialize() {
        // Initialize Card Manager (Load from DB or Seed)
        await DbCardManager.getInstance().init();

        // Restore active games from DB on server restart
        const activeRooms = await this.roomService.getActiveGames();
        console.log(`Restoring ${activeRooms.length} active games...`);
        for (const room of activeRooms) {
            try {
                if (room.gameState) {
                    const engine = new GameEngine(room.id, room.players, room.creatorId, { isTutorial: room.isTraining, availableDreams: room.availableDreams });
                    // Hydrate state but FORCE UPDATE BOARD structure
                    Object.assign(engine.state, room.gameState);
                    // CRITICAL FIX: Overwrite the restored board but RESPECT availableDreams
                    engine.state.board = engine.initializeBoardWithDreams(room.availableDreams);
                    this.games.set(room.id, engine);
                    console.log(`Restored game ${room.id} (Turn: ${room.gameState.currentTurnTime}) | Board Updated`);
                }
            } catch (err) {
                console.error(`Failed to restore room ${room.id}:`, err);
            }
        }
    }

    private saveState(roomId: string, game: GameEngine) {
        const state = game.getState();
        this.roomService.saveGameState(roomId, state).catch(err => console.error("Persist Error:", err));

        // Sync stats for any new winners
        this.syncWinners(roomId, game).catch(err => console.error("Sync Stats Error:", err));
    }

    private async syncWinners(roomId: string, game: GameEngine) {
        const rankings = game.state.rankings || [];
        if (rankings.length === 0) return;

        if (!this.processedWinners.has(roomId)) {
            this.processedWinners.set(roomId, new Set());
        }
        const processed = this.processedWinners.get(roomId)!;

        // Points Map: 1st=10, 2nd=6, 3rd=4, 4th=3, 5th=2, 6th=1, 7th=0.5
        const POINTS_MAP = [10, 6, 4, 3, 2, 1, 0.5];

        for (const rank of rankings) {
            if (rank.userId && !processed.has(rank.userId)) {
                // Found a new winner to process
                const points = POINTS_MAP[rank.place - 1] || 0;

                const update: any = {
                    $inc: {
                        rating: points,
                        gamesPlayed: 1
                    }
                };
                if (rank.place === 1) {
                    update.$inc.wins = 1;
                }

                try {
                    console.log(`[AutoSync] Updating stats for ${rank.name} (Place ${rank.place}): +${points} pts`);
                    await UserModel.findOneAndUpdate({ _id: rank.userId }, update);
                    processed.add(rank.userId);
                } catch (e) {
                    console.error(`[AutoSync] Failed to update stats for ${rank.name}:`, e);
                }
            }
        }
    }

    public handleBabyRoll(roomId: string) {
        const game = this.games.get(roomId);
        if (!game) throw new Error("Game not found");
        if (game.getState().phase !== 'BABY_ROLL') throw new Error("Not in baby roll phase");

        const result: any = game.resolveBabyRoll();
        const state = game.getState();
        const message = result.total <= 4 ? "Baby Born! +$5000" : "No Baby.";

        this.io.to(roomId).emit('dice_rolled', {
            roll: result.total || result,
            diceValues: result.values || [result],
            state,
            message
        });
        this.saveState(roomId, game);
        return { result, state, message };
    }

    public handleTransferDeal(roomId: string, fromUserId: string, targetPlayerId: string, cardId: string) {
        const game = this.games.get(roomId);
        if (!game) throw new Error("Game not found");

        game.transferDeal(fromUserId, targetPlayerId, cardId);
        const state = game.getState();
        this.io.to(roomId).emit('state_updated', { state });
        this.saveState(roomId, game);
        return { state };
    }

    initEvents() {
        // Game Loop for Timers
        setInterval(() => {
            this.games.forEach((game, roomId) => {
                try {
                    const changed = game.checkTurnTimeout();
                    if (changed) {
                        this.io.to(roomId).emit('turn_ended', { state: game.getState() });
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

            // Transfer Cash
            socket.on('transfer_cash', (data) => {
                const { roomId, amount, targetPlayerId } = data;
                const game = this.games.get(roomId);
                if (game) {
                    // Start of rudimentary auth check: socket.id mapping or passing fromId
                    // For now, we rely on the client sending correct actions or session map
                    // But `GameEngine.transferCash` needs `fromId`.
                    // We need to resolve `fromId` from socket. 
                    // Usually we store `socket.id -> userId` mapping or passed activePlayerId.
                    // Let's assume frontend passes `fromUserId` or we find it.
                    // Wait, existing handlers like `buy_asset` don't extract user from socket context here?
                    // Ah, `buy_asset` uses `state.currentPlayerIndex`. 
                    // But transfer can be done by ANYONE (even not their turn)? 
                    // Or only current player? User said "Click on player -> Transfer". Usually implies anytime.
                    // But to be safe, let's limit to "My Turn" OR find player by socket.
                    // Since we don't have socket auth mapping easily here without lookup...
                    // Let's rely on frontend passing `fromUserId` for now and trust it (MVP).
                    // Or iterate players to find one with this socket ID? 
                    // Players don't store socket ID in `engine` state usually (unless `connected: true` etc).
                    // Actually `game.join` stores socketId?
                    // Let's look at `game.gateway.ts` structure.
                    // `handleJoin` stores socket?

                    // Simple approach: Frontend sends `fromUserId`.
                    if (data.fromUserId) {
                        game.transferCash(data.fromUserId, targetPlayerId, Number(amount));
                        this.io.to(roomId).emit('state_updated', { state: game.getState() });
                        this.saveState(roomId, game);
                    }
                }
            });

            // Get Deck Content
            socket.on('get_deck_content', (data) => {
                const { type, roomId } = data;

                if (type === 'MARKET') {
                    // Start with empty array
                    let content: any[] = [];

                    // If roomId is provided, get active market cards from game instance
                    if (roomId) {
                        const game = this.games.get(roomId);
                        if (game && game.state.activeMarketCards) {
                            // Map active market items to their card content
                            content = game.state.activeMarketCards.map(item => item.card);
                        }
                    } else {
                        // Fallback or Error? 
                        // Maybe getting template market cards? No, market is dynamic.
                    }
                    socket.emit('deck_content', content);
                    return;
                }

                const templates = DbCardManager.getInstance().getTemplates();
                let content: any[] = [];
                if (type === 'SMALL') content = templates.small;
                if (type === 'BIG') content = templates.big;
                socket.emit('deck_content', content);
            });

            // Get Leaderboard
            socket.on('get_leaderboard', async (callback) => {
                try {
                    const leaders = await UserModel.find({ gamesPlayed: { $gt: 0 } })
                        .sort({ rating: -1, wins: -1 })
                        .limit(10)
                        .select('username firstName lastName wins rating gamesPlayed photo_url');
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

                    // 1. Single Room Policy: Cleanup previous rooms hosted by this user
                    if (userId) {
                        try {
                            const previousRooms = await this.roomService.getCreatedRooms(userId);
                            if (previousRooms.length > 0) {
                                console.log(`[SingleRoomPolicy] Cleaning up ${previousRooms.length} rooms for host ${userId}`);
                                for (const prevRoom of previousRooms) {
                                    const prevRoomId = prevRoom._id.toString();

                                    // A. Memory Cleanup
                                    if (this.games.has(prevRoomId)) {
                                        this.games.delete(prevRoomId);
                                    }

                                    // B. Notify Clients
                                    this.io.to(prevRoomId).emit('room_deleted');

                                    // C. Database Cleanup
                                    await this.roomService.deleteRoom(prevRoomId, userId);
                                }
                                // Broadcast update after massive deletion
                                const rooms = await this.roomService.getRooms();
                                this.io.emit('rooms_updated', rooms);
                            }
                        } catch (cleanupErr) {
                            console.error("[SingleRoomPolicy] Cleanup failed:", cleanupErr);
                            // Verify if we should block creation? Probably not, try to proceed.
                        }
                    }

                    const room = await this.roomService.createRoom(
                        socket.id,
                        userId || 'guest_' + socket.id, // Fallback
                        playerName || 'Player',
                        name,
                        maxPlayers,
                        timer,
                        password,
                        data.token,
                        data.dream,
                        data.isTraining,
                        data.gameMode
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

            // Start Game (Host)
            socket.on('start_game', async (data) => {
                try {
                    const { roomId, userId } = data;
                    // Update Room Status
                    const room = await this.roomService.startGame(roomId, userId);
                    this.io.emit('rooms_updated', await this.roomService.getRooms());
                    this.io.to(roomId).emit('room_state_updated', room);
                } catch (e: any) {
                    console.error("Start Game Error:", e);
                }
            });

            // Toggle Pause
            socket.on('toggle_pause', (data) => {
                const { roomId, userId } = data;
                const game = this.games.get(roomId);
                if (game) {
                    // Host check? Usually only host can pause.
                    if (game.state.creatorId !== userId) return;
                    game.togglePause();
                    this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    this.saveState(roomId, game);
                }
            });

            // Charity Actions


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

            // Toggle Lock Room (Host Only)
            socket.on('toggle_lock', async (data, callback) => {
                try {
                    const { roomId, userId } = data;
                    const isLocked = await this.roomService.toggleLock(roomId, userId);

                    // Sync with active game engine if exists
                    const game = this.games.get(roomId);
                    if (game) {
                        game.state.isLocked = isLocked;
                        this.saveState(roomId, game);
                        // Emit state update so clients see the lock status immediately
                        this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    }

                    // Broadcast room update to lobby (so people see lock icon)
                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);

                    // Respond to sender
                    if (callback) callback({ success: true, isLocked });

                } catch (e: any) {
                    console.error("Toggle Lock Error:", e);
                    if (callback) callback({ success: false, error: e.message });
                }
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
                        this.io.to(roomId).emit('game_state_update', { state: game.getState() });
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

            // Toggle Skip Turns (Sandbox Mode)
            socket.on('toggle_skip_turns', ({ roomId, userId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.toggleSkipTurns(userId);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        this.saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
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
                    this.io.to(roomId).emit('state_updated', { state });
                    this.saveState(roomId, game);

                    callback({ success: true });
                } catch (e: any) {
                    callback({ success: false, error: e.message });
                }
            });

            // Host Force Move (Turn for him)
            socket.on('host_force_move', async (data, callback) => {
                try {
                    const { roomId, userId, targetPlayerId } = data;
                    const game = this.games.get(roomId);
                    if (!game) return callback?.({ success: false, error: "Game not found" });

                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room || room.creatorId !== userId) {
                        return callback?.({ success: false, error: "Only host can force move" });
                    }

                    const currentPlayer = game.state.players[game.state.currentPlayerIndex];
                    if (currentPlayer.id !== targetPlayerId) {
                        return callback?.({ success: false, error: "It is not this player's turn" });
                    }

                    game.addLog(`🎲 Host forced move for ${currentPlayer.name}`);

                    // Handle different phases
                    if (game.getState().phase === 'BABY_ROLL') {
                        const result: any = game.resolveBabyRoll();
                        const state = game.getState();
                        const message = result.total <= 4 ? "Baby Born! +$5000" : "No Baby.";


                        this.io.to(roomId).emit('dice_rolled', {
                            roll: result.total || result,
                            diceValues: result.values || [result],
                            state,
                            message
                        });
                        this.saveState(roomId, game);
                    } else if (game.getState().phase === 'ROLL') {
                        // Standard Roll
                        const result = game.handleRoll(socket.id);

                        // Handle Union Return (number | {total, values})
                        let total = 0;
                        let values: number[] = [];

                        if (typeof result === 'number') {
                            total = result;
                            values = [result];
                        } else {
                            total = result.total;
                            values = result.values;
                        }

                        const state = game.getState();

                        this.io.to(roomId).emit('dice_rolled', {
                            roll: total,
                            diceValues: values,
                            state
                        });
                        this.saveState(roomId, game);
                    } else {
                        return callback?.({ success: false, error: "Cannot roll in current phase" });
                    }

                    if (callback) callback({ success: true });
                } catch (e: any) {
                    console.error("Force Move Error:", e);
                    if (callback) callback({ success: false, error: e.message });
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

                    // Calculate Final Rankings & Assign Points
                    const rankings = game.calculateFinalRankings();
                    game.addLog(`🛑 HOST ЗАВЕРШИЛ ИГРУ!`);

                    const state = game.getState();
                    const winnerName = rankings[0]?.name || 'Unknown';

                    // Attach points for frontend display (DB update handled by syncWinners via saveState)
                    const POINTS_MAP = [10, 6, 4, 3, 2, 1, 0.5];
                    for (const rank of rankings) {
                        const points = POINTS_MAP[rank.place - 1] || 0;
                        (rank as any).earnedPoints = points;
                    }

                    // Mark Room as Completed in DB so it doesn't show up as 'playing'
                    const roomModel = await this.roomService.getRoom(roomId);
                    if (roomModel && (roomModel as any)._id) { // Use internal _id to update
                        const { RoomModel } = await import('../models/room.model');
                        await RoomModel.findByIdAndUpdate((roomModel as any)._id || roomId, { status: 'completed' });
                    }

                    // Emit Game Ended
                    this.io.to(roomId).emit('game_over', {
                        winner: winnerName,
                        rankings: rankings
                    });

                    this.saveState(roomId, game);

                    // Remove from active memory? Or keep for a bit?
                    // Better to keep for a minute to allow final socket events to process, or just delete.
                    // Implementation Plan said: "Manually ends game to finalize rankings".
                    // Usually we clear memory to free resources.
                    // this.games.delete(roomId); 

                    callback({ success: true });
                } catch (e: any) {
                    console.error("Force End Game Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Admin: Toggle Pause
            socket.on('admin_toggle_pause', async (data, callback) => {
                try {
                    const { roomId, userId } = data;
                    const game = this.games.get(roomId);
                    if (!game) return callback({ success: false, error: "Game not found" });

                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room || room.creatorId !== userId) {
                        return callback({ success: false, error: "Only host can pause game" });
                    }

                    game.togglePause();
                    const state = game.getState();

                    // Emit to everyone
                    this.io.to(roomId).emit('state_updated', { state });
                    this.saveState(roomId, game);

                    callback({ success: true, isPaused: state.isPaused });
                } catch (e: any) {
                    console.error("Pause Toggle Error:", e);
                    callback({ success: false, error: e.message });
                }
            });

            // Admin: Reshuffle Cards
            socket.on('admin_reshuffle_cards', async (data, callback) => {
                try {
                    const { roomId, userId } = data;
                    const game = this.games.get(roomId);
                    if (!game) return callback({ success: false, error: "Game not found" });

                    // Verify Host
                    const room = await this.roomService.getRoom(roomId);
                    if (!room || room.creatorId !== userId) {
                        return callback({ success: false, error: "Only host can reshuffle cards" });
                    }

                    game.reshuffleCards();
                    const state = game.getState();

                    // Emit to everyone
                    this.io.to(roomId).emit('state_updated', { state });
                    this.saveState(roomId, game);

                    callback({ success: true });
                } catch (e: any) {
                    console.error("Reshuffle Error:", e);
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
                    const { roomId, isReady, dream, token, userId, name } = data; // Expect name and userId
                    const room = await this.roomService.setPlayerReady(
                        roomId,
                        socket.id,
                        userId, // Pass userId for JIT check
                        isReady,
                        dream,
                        token,
                        name
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
                    const engine = new GameEngine(roomId, shuffledPlayers, room.creatorId, {
                        isTutorial: room.isTraining,
                        gameMode: room.gameMode,
                        availableDreams: room.availableDreams
                    });

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


            // Charity Choice
            socket.on('charity_choice', ({ roomId, accept }) => {
                const game = this.games.get(roomId);
                if (!game) return;
                try {
                    game.handleCharityChoice(socket.id, accept);
                    const state = game.getState();
                    this.io.to(roomId).emit('state_updated', { state });
                    this.saveState(roomId, game);
                } catch (e: any) {
                    socket.emit('error', e.message);
                }
            });

            // Dismiss Market Card
            socket.on('dismiss_market_card', ({ roomId, cardId }) => {
                const game = this.games.get(roomId);
                if (!game) return;
                try {
                    game.dismissMarketCard(socket.id, cardId);
                    this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    this.saveState(roomId, game);
                } catch (e: any) {
                    console.error("Dismiss Market Card Error:", e);
                }
            });

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

                    // Tutorial: Add Random Asset
                    socket.on('tutorial_add_asset', ({ roomId }) => {
                        const game = this.games.get(roomId);
                        if (!game) return;

                        // Add random asset (Logic from engine or manual)
                        // For simplicity, let's just pick a random Small/Big deal and add it.
                        // Or better, use a specific mock asset.
                        const mockAsset = {
                            id: 'tutorial-' + Date.now(),
                            title: 'Тестовый Дом 3Br/2Ba',
                            description: 'Отличный актив для старта',
                            cost: 0,
                            downPayment: 0,
                            cashflow: 250,
                            type: 'SMALL_DEAL',
                            rule: 'residential',
                            quantity: 1
                        };

                        const player = game.state.players.find(p => p.id === socket.id);
                        if (player) {
                            player.assets.push(mockAsset);
                            player.passiveIncome += mockAsset.cashflow;
                            game.recalculateFinancials(player);

                            game.addLog(`🎓 ${player.name} получил обучающий актив: ${mockAsset.title}`);
                            this.io.to(roomId).emit('game_state_update', game.getState());
                            this.saveState(roomId, game);
                        }
                    });

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

            // Tutorial: Manual Step Set
            socket.on('set_tutorial_step', ({ roomId, step }) => {
                const game = this.games.get(roomId);
                if (game && game.state.isTutorial) {
                    game.state.tutorialStep = step;
                    this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    saveState(roomId, game);
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
                    }
                }
            });

            // HOST: Transfer Asset (Admin Override)
            // HOST: Transfer Asset (Admin Override)
            socket.on('host_transfer_asset', async ({ roomId, userId, fromPlayerId, toPlayerId, assetIndex }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        // 1. Verify Host
                        if (game.state.creatorId !== userId) { // Use persistent ID
                            socket.emit('error', { message: 'Only host can transfer assets.' });
                            return;
                        }

                        // 2. Execute Transfer
                        game.transferAsset(fromPlayerId, toPlayerId, assetIndex);

                        // 3. Update State
                        this.io.to(roomId).emit('game_update', game.getState());
                        this.io.to(roomId).emit('log_message', {
                            text: `👮 ADMIN transferred asset from ${game.state.players.find((p: any) => p.id === fromPlayerId)?.name} to ${game.state.players.find((p: any) => p.id === toPlayerId)?.name}`,
                            type: 'info'
                        });

                    } catch (e: any) {
                        console.error('[host_transfer_asset] Error:', e);
                        socket.emit('error', { message: e.message || 'Transfer failed' });
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

            socket.on('draw_card', ({ roomId, type }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        // type: 'MARKET' | 'EXPENSE'
                        game.drawCard(socket.id, type);
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
                    const state = game.getState();
                    this.io.to(roomId).emit('state_updated', { state });
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

                    const state = game.getState();
                    this.io.to(roomId).emit('state_updated', { state });
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

            // Player Give Cash (Social Gifting)
            socket.on('player_give_cash', ({ roomId, toPlayerId, amount }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.giftCash(socket.id, toPlayerId, amount);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
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
