import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { GameEngine, FULL_BOARD } from './engine';

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
                    const engine = new GameEngine(room.id, room.players);
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
                        password
                    );
                    socket.join(room.id);
                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms); // Broadcast update
                    callback({ success: true, room });
                } catch (e: any) {
                    console.error("Create Room Error:", e);
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
                        password
                    );
                    socket.join(roomId);

                    // Sync Active Game Engine if exists
                    const game = this.games.get(roomId);
                    if (game) {
                        game.updatePlayerId(userId, socket.id);
                        // Re-emit game start to ensure client has latest state with correct ID
                        this.io.to(roomId).emit('game_started', { roomId, state: game.getState() });
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

            // Leave Room
            socket.on('leave_room', async (data) => {
                const { roomId } = data;
                await this.roomService.leaveRoom(roomId, socket.id);
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
                    const { roomId, playerId, userId } = data; // Expect userId
                    await this.roomService.kickPlayer(roomId, userId, playerId);

                    // Notify the kicked player
                    this.io.to(roomId).emit('player_kicked', { playerId });

                    const room = await this.roomService.getRoom(roomId);
                    if (room) {
                        this.io.to(roomId).emit('room_state_updated', room);
                    }
                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);

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
                    const engine = new GameEngine(roomId, room.players);
                    this.games.set(roomId, engine);

                    this.io.to(roomId).emit('game_started', { roomId, state: engine.getState() });

                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);
                } catch (e) {
                    console.error("Start game failed:", e);
                }
            });

            // Game Actions - Helper to save state
            const saveState = (roomId: string, game: GameEngine) => {
                this.roomService.saveGameState(roomId, game.getState()).catch(err => console.error("Persist Error:", err));
            };

            socket.on('roll_dice', ({ roomId, diceCount }) => {
                const game = this.games.get(roomId);
                if (game) {
                    const roll = game.rollDice(diceCount);
                    const state = game.getState();
                    this.io.to(roomId).emit('dice_rolled', { roll, state });
                    saveState(roomId, game);
                }
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
                        game.transferFunds(socket.id, toId, amount);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('buy_asset', ({ roomId, quantity }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        const result: any = game.buyAsset(socket.id, quantity);
                        const state = game.getState();

                        if (result && result.mlmRoll) {
                            this.io.to(roomId).emit('dice_rolled', {
                                roll: result.mlmRoll,
                                state,
                                type: 'MLM',
                                message: `Recruited ${result.mlmRoll} Partners! +$${result.mlmCashflow}/mo`
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
                        game.transferAsset(socket.id, toPlayerId, assetIndex, quantity);
                        const state = game.getState();
                        this.io.to(roomId).emit('state_updated', { state });
                        saveState(roomId, game);
                    } catch (e: any) {
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
                    if (game.getState().phase === 'ROLL') {
                        return;
                    }
                    game.endTurn();
                    const state = game.getState();
                    this.io.to(roomId).emit('turn_ended', { state });
                    saveState(roomId, game);
                }
            });

            socket.on('disconnecting', async () => {
                for (const roomId of socket.rooms) {
                    if (roomId !== socket.id) {
                        try {
                            // Clean up WAITING rooms (remove player, delete if empty)
                            const room = await this.roomService.getRoom(roomId);
                            if (room && room.status === 'waiting') {
                                console.log(`Client ${socket.id} left waiting room ${roomId}`);
                                await this.roomService.leaveRoom(roomId, socket.id);

                                // Broadcast to remaining players in room
                                const updatedRoom = await this.roomService.getRoom(roomId);
                                if (updatedRoom) {
                                    this.io.to(roomId).emit('room_state_updated', updatedRoom);
                                }

                                const rooms = await this.roomService.getRooms();
                                this.io.emit('rooms_updated', rooms);
                            }
                            // If playing, do NOT remove player to allow reconnection
                        } catch (e) {
                            console.error(`Disconnect error for room ${roomId}:`, e);
                        }
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }
}
