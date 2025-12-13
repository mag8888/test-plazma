import { v4 as uuidv4 } from 'uuid';
import { RoomModel, IRoom } from '../models/room.model';

export class RoomService {

    constructor() { }

    async createRoom(creatorId: string, userId: string, playerName: string, name: string, maxPlayers: number = 6, timer: number = 120, password?: string): Promise<any> {
        // Prevent Duplicates: Check if user already has a WAITING room
        const existingRoom = await RoomModel.findOne({ creatorId: userId, status: 'waiting' });
        if (existingRoom) {
            if (existingRoom.name === name) {
                // Exact match (Double click): Return existing
                return this.sanitizeRoom(existingRoom);
            } else {
                // Different name: User wants a new room. Delete old one.
                await RoomModel.findByIdAndDelete(existingRoom._id);
            }
        }

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
        // 1. Try to update EXISTING player (Atomic)
        let room = await RoomModel.findOneAndUpdate(
            { _id: roomId, "players.userId": userId },
            {
                $set: {
                    "players.$.id": playerId,
                    "players.$.name": playerName
                }
            },
            { new: true }
        );

        if (room) {
            // Check Password if updating (optional, but good security)
            if (room.password && room.password !== password) throw new Error("Invalid password");
            return this.sanitizeRoom(room);
        }

        // 2. If not found, try to PUSH new player (Atomic check for maxPlayers)
        // We need to fetch room first to check Password and Status (hard to do strictly atomically with password check)
        // But for race condition of "Adding", the $push is key.

        const roomCheck = await RoomModel.findById(roomId);
        if (!roomCheck) throw new Error("Room not found");
        if (roomCheck.password && roomCheck.password !== password) throw new Error("Invalid password");
        if (roomCheck.status !== 'waiting') throw new Error("Game already started");

        // Atomic Push with Max Players check using query
        room = await RoomModel.findOneAndUpdate(
            {
                _id: roomId,
                "players.userId": { $ne: userId }, // Double check uniqueness
                $expr: { $lt: [{ $size: "$players" }, "$maxPlayers"] } // Check maxPlayers
            },
            {
                $push: {
                    players: {
                        id: playerId,
                        userId: userId,
                        name: playerName,
                        isReady: false
                    }
                }
            },
            { new: true }
        );

        if (!room) {
            // Failed: Either Room Full, Game Started (checked above), or User already added (race lost/won)
            // Re-fetch to see what happened
            const refetch = await RoomModel.findById(roomId);
            if (!refetch) throw new Error("Room not found");

            // If user IS in room now (race won by another request), update socket ID just in case
            const p = refetch.players.find(p => p.userId === userId);
            if (p) {
                // Update socket ID via recursion or simple set
                p.id = playerId;
                await refetch.save();
                return this.sanitizeRoom(refetch);
            }

            if (refetch.players.length >= refetch.maxPlayers) throw new Error("Room is full");
            throw new Error("Unable to join room");
        }

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
        const rooms = await RoomModel.find({ status: 'waiting' }).sort({ createdAt: -1 }).lean();
        return rooms.map(r => this.sanitizeRoom(r));
    }

    async getActiveGames(): Promise<any[]> {
        const rooms = await RoomModel.find({ status: 'playing' }).lean();
        return rooms.map(r => this.sanitizeRoom(r));
    }

    async getRoom(roomId: string): Promise<any> {
        const room = await RoomModel.findById(roomId).lean();
        return room ? this.sanitizeRoom(room) : null;
    }

    async setPlayerReady(roomId: string, playerId: string, userId: string, isReady: boolean, dream?: string, token?: string): Promise<any> {
        // 1. Fetch room to validate Logic (Token uniqueness, existence)
        const roomCheck = await RoomModel.findById(roomId).lean();
        if (!roomCheck) throw new Error("Room not found");

        let player = roomCheck.players.find(p => p.id === playerId);

        // JIT Reconnect: If not found by socket ID, try User ID
        if (!player && userId) {
            player = roomCheck.players.find(p => p.userId === userId);
            // If found by User ID, we must update the Socket ID atomically first or during the main update
            // We can handle it in the main update query query filter.
        }

        if (!player) throw new Error("Player not in room");

        // Validate Dream
        if (isReady && !dream) {
            throw new Error("Выберите мечту перед тем как нажать Готов");
        }

        // Validate Token Uniqueness
        if (token) {
            const tokenTaken = roomCheck.players.some(p => p.token === token && p.userId !== player!.userId);
            if (tokenTaken) {
                console.error(`Token ${token} taken by another player in room ${roomId}`);
                throw new Error("Эта фишка уже занята другим игроком");
            }
        }

        // 2. Atomic Update
        // We match by roomId AND (playerId OR userId) to be safe.
        // Actually, we should match by the immutable identifier we found: userId if available, else socketId.
        // Since we trust userId most:
        const matchQuery = userId
            ? { _id: roomId, "players.userId": userId }
            : { _id: roomId, "players.id": playerId };

        const update: any = {
            $set: {
                "players.$.isReady": isReady
            }
        };

        if (dream) update.$set["players.$.dream"] = dream;
        if (token) update.$set["players.$.token"] = token;
        // Always update / confirm socket ID
        update.$set["players.$.id"] = playerId;

        const updatedRoom = await RoomModel.findOneAndUpdate(
            matchQuery,
            update,
            { new: true }
        ).lean();

        if (!updatedRoom) throw new Error("Update failed (Player lost?)");

        return this.sanitizeRoom(updatedRoom);
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
        // Ensure we work with a plain object
        const obj = room.toObject ? room.toObject() : { ...room };
        if (obj._id) {
            obj.id = obj._id.toString();
            delete obj._id;
        }
        delete obj.__v;
        return obj;
    }
}
