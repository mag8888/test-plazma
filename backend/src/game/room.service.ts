import { v4 as uuidv4 } from 'uuid';
import { RoomModel, IRoom } from '../models/room.model';

export class RoomService {

    constructor() { }

    async createRoom(creatorId: string, playerName: string, name: string, maxPlayers: number = 6, timer: number = 120, password?: string): Promise<any> {
        const room = await RoomModel.create({
            name,
            creatorId, // Keep creatorId for now, as it's in the original interface, though not directly used in the new model's top level.
            maxPlayers,
            timer,
            password,
            players: [{
                id: creatorId,
                name: playerName,
                isReady: false
            }],
            status: 'waiting', // Add status and createdAt as they are part of the Room interface
            createdAt: Date.now()
        });
        return this.sanitizeRoom(room);
    }

    async joinRoom(roomId: string, playerId: string, playerName: string, password?: string): Promise<any> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");
        if (room.status !== 'waiting') throw new Error("Game already started");
        if (room.players.length >= room.maxPlayers) throw new Error("Room is full");
        if (room.password && room.password !== password) throw new Error("Invalid password");

        // Idempotency: if player already in room, just update name/socket
        const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);

        if (existingPlayerIndex !== -1) {
            room.players[existingPlayerIndex].name = playerName;
        } else {
            room.players.push({
                id: playerId,
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

        // Check if room is empty, if so, maybe delete? 
        // For now let's keep it simple. If we want to auto-delete empty rooms:
        const room = await RoomModel.findById(roomId);
        if (room) {
            if (room.players.length === 0) {
                await RoomModel.findByIdAndDelete(roomId);
            } else if (room.creatorId === playerId) {
                // If creator leaves, promote next player
                room.creatorId = room.players[0].id;
                await room.save();
            }
        }
    }

    async kickPlayer(roomId: string, requesterId: string, playerIdToKick: string): Promise<void> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");

        if (room.creatorId !== requesterId) {
            throw new Error("Only the host can kick players");
        }

        if (requesterId === playerIdToKick) {
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

    async setPlayerReady(roomId: string, playerId: string, isReady: boolean, dream?: string, token?: string): Promise<any> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");

        const player = room.players.find(p => p.id === playerId);
        if (!player) throw new Error("Player not in room");

        // Validate Dream (Mandatory per requirements)
        if (isReady && !dream) {
            throw new Error("Выберите мечту перед тем как нажать Готов");
        }

        if (token) {
            const tokenTaken = room.players.some(p => p.token === token && p.id !== playerId);
            if (tokenTaken) {
                throw new Error("Эта фишка уже занята другим игроком");
            }
            player.token = token;
        }

        player.isReady = isReady;
        if (dream) player.dream = dream;
        // if (token) player.token = token; // This line is already handled above

        await room.save();
        return this.sanitizeRoom(room);
    }

    async checkAllReady(roomId: string): Promise<boolean> {
        const room = await RoomModel.findById(roomId);
        if (!room || room.players.length === 0) return false;
        return room.players.every(p => p.isReady);
    }

    async startGame(roomId: string): Promise<void> {
        await RoomModel.findByIdAndUpdate(roomId, { status: 'playing' });
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
