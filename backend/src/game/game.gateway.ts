import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { GameEngine } from './engine';

export class GameGateway {
    private io: Server;
    private roomService: RoomService;
    private games: Map<string, GameEngine> = new Map();

    constructor(io: Server) {
        this.io = io;
        this.roomService = new RoomService();
        this.initEvents();
    }

    initEvents() {
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
                    callback({ success: false, error: e.message });
                }
            });

            // Join Room
            socket.on('join_room', async (data, callback) => {
                try {
                    const { roomId, password, playerName, userId } = data; // Expect userId
                    const room = await this.roomService.joinRoom(
                        roomId,
                        socket.id,
                        userId || 'guest_' + socket.id,
                        playerName || 'Player',
                        password
                    );
                    socket.join(roomId);
                    this.io.to(roomId).emit('room_state_updated', room);

                    const rooms = await this.roomService.getRooms();
                    this.io.emit('rooms_updated', rooms);
                    callback({ success: true, room });
                } catch (e: any) {
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

            // Game Actions
            socket.on('roll_dice', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    const roll = game.rollDice();
                    this.io.to(roomId).emit('dice_rolled', { roll, state: game.getState() });
                }
            });

            socket.on('take_loan', ({ roomId, amount }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.takeLoan(socket.id, amount);
                        this.io.to(roomId).emit('state_updated', { state: game.getState() });
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
                        this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('buy_asset', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    try {
                        game.buyAsset(socket.id);
                        this.io.to(roomId).emit('state_updated', { state: game.getState() });
                    } catch (e: any) {
                        socket.emit('error', e.message);
                    }
                }
            });

            socket.on('end_turn', ({ roomId }) => {
                const game = this.games.get(roomId);
                if (game) {
                    game.endTurn();
                    this.io.to(roomId).emit('turn_ended', { state: game.getState() });
                }
            });

            socket.on('disconnect', () => {
                // Handle unclean disconnects (find which room they were in?)
                // Complexe without user mapping. For now, rely on explicit leave or timeout.
                console.log('Client disconnected:', socket.id);
            });
        });
    }
}
