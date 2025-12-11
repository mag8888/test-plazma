import { v4 as uuidv4 } from 'uuid';
import { RoomModel, IRoom } from '../models/room.model';

export class RoomService {

    constructor() { }

    async createRoom(creatorId: string, userId: string, playerName: string, name: string, maxPlayers: number = 6, timer: number = 120, password?: string): Promise<any> {
        const room = await RoomModel.create({
            name,
            creatorId: userId, // Use Persistent User ID as Creator
            maxPlayers,
            timer,
            password,
            players: [{
                id: creatorId,
                userId: userId,
                name: playerName,
                isReady: false
            }],
            status: 'waiting',
            createdAt: Date.now()
        });
        return this.sanitizeRoom(room);
    }

    async joinRoom(roomId: string, playerId: string, userId: string, playerName: string, password?: string): Promise<any> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");
        // Allow rejoin if game started provided user is in list
        if (room.status !== 'waiting' && !room.players.some(p => p.userId === userId)) throw new Error("Game already started");

        // If not already in room and full
        if (!room.players.some(p => p.userId === userId) && room.players.length >= room.maxPlayers) {
            throw new Error("Room is full");
        }

        if (room.password && room.password !== password) throw new Error("Invalid password");

        // Idempotency: Identity by userId
        const existingPlayerIndex = room.players.findIndex(p => p.userId === userId);

        if (existingPlayerIndex !== -1) {
            // Player exists, update socket ID and name
            room.players[existingPlayerIndex].id = playerId;
            room.players[existingPlayerIndex].name = playerName;
        } else {
            room.players.push({
                id: playerId,
                userId: userId,
                name: playerName,
                isReady: false
            });
        }

        await room.save();
        return this.sanitizeRoom(room);
    }

    async leaveRoom(roomId: string, playerId: string): Promise<void> {
        // We use $pull to remove the player
        await RoomModel.findByIdAndUpdate(roomId, {
            $pull: { players: { id: playerId } }
        });

        // Check if room is empty
        const room = await RoomModel.findById(roomId);
        if (room) {
            if (room.players.length === 0) {
                await RoomModel.findByIdAndDelete(roomId);
            }
            // NOTE: We don't automatically migrate host on simple leave anymore because 
            // userId is persistent. Host can rejoin. 
            // If we want to support "Host left forever", we need explicit handover or timeout.
        }
    }

    async kickPlayer(roomId: string, requesterUserId: string, playerIdToKick: string): Promise<void> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");

        if (room.creatorId !== requesterUserId) {
            throw new Error("Only the host can kick players");
        }

        // Check if hitting self (by socket ID)
        const player = room.players.find(p => p.id === playerIdToKick);
        if (player && player.userId === requesterUserId) {
            throw new Error("Host cannot kick themselves");
        }

        await this.leaveRoom(roomId, playerIdToKick);
    }

    async getRooms(): Promise<any[]> {
        const rooms = await RoomModel.find({ status: 'waiting' }).sort({ createdAt: -1 });
        return rooms.map(r => this.sanitizeRoom(r));
    }

    async getRoom(roomId: string): Promise<any> {
        const room = await RoomModel.findById(roomId);
        return room ? this.sanitizeRoom(room) : null;
    }

    async setPlayerReady(roomId: string, playerId: string, userId: string, isReady: boolean, dream?: string, token?: string): Promise<any> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");

        let player = room.players.find(p => p.id === playerId);

        // JIT Reconnection fallback
        if (!player && userId) {
            player = room.players.find(p => p.userId === userId);
            if (player) {
                // Update the stale socket ID to the new one
                player.id = playerId;
            }
        }

        if (!player) throw new Error("Player not in room");

        // Validate Dream (Mandatory per requirements)
        if (isReady && !dream) {
            throw new Error("Выберите мечту перед тем как нажать Готов");
        }

        if (token) {
            // Check based on Token uniqueness. 
            // Exclude SELF using userId if possible, or socketId.
            // player.id is now up to date.
            const tokenTaken = room.players.some(p => p.token === token && p.id !== player!.id);
            if (tokenTaken) {
                throw new Error("Эта фишка уже занята другим игроком");
            }
            player.token = token;
        }

        player.isReady = isReady;
        if (dream) player.dream = dream;

        await room.save();
        return this.sanitizeRoom(room);
    }

    async checkAllReady(roomId: string): Promise<boolean> {
        const room = await RoomModel.findById(roomId);
        if (!room || room.players.length === 0) return false;
        return room.players.every(p => p.isReady);
    }

    async startGame(roomId: string, requesterUserId: string): Promise<void> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");

        if (room.creatorId !== requesterUserId) {
            throw new Error("Only the host can start the game");
        }

        room.status = 'playing';
        await room.save();
    }

    async saveGameState(roomId: string, state: any): Promise<void> {
        await RoomModel.findByIdAndUpdate(roomId, { gameState: state });
    }

    // Helper to format room for frontend (convert _id to id)
    private sanitizeRoom(room: any): any {
        const obj = room.toObject ? room.toObject() : room;
        obj.id = obj._id.toString();
        delete obj._id;
        delete obj.__v;
        return obj;
    }
}
