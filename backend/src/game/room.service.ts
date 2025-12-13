import { v4 as uuidv4 } from 'uuid';
import { RoomModel, IRoom } from '../models/room.model';

export class RoomService {

    constructor() { }

    async createRoom(creatorId: string, userId: string, playerName: string, name: string, maxPlayers: number = 6, timer: number = 120, password?: string): Promise<any> {
        // Cleanup old sessions
        await this.removeUserFromAllWaitingRooms(userId);

        // Optimistic Locking: Try to create, handle duplicate key error
        try {
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
        } catch (error: any) {
            if (error.code === 11000) {
                // Race condition caught: User already has a waiting room.
                // Fetch and return it.
                // If the name is DIFFERENT, we might want to update it? 
                // Existing logic had a delete-and-recreate for different name.
                // But with Unique Index, we can't create until we delete.

                const existing = await RoomModel.findOne({ creatorId: userId, status: 'waiting' });
                if (existing) {
                    if (existing.name !== name) {
                        // Update name if different? Or just return existing?
                        // Let's just return existing to be safe and avoid complexity.
                        // Or better: Update the name to what the user just asked for.
                        existing.name = name;
                        existing.maxPlayers = maxPlayers; // Update config too
                        await existing.save();
                        return this.sanitizeRoom(existing);
                    }
                    return this.sanitizeRoom(existing);
                }
            }
            throw error;
        }
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

        // Ensure user is not ghosting in other waiting rooms
        await this.removeUserFromAllWaitingRooms(userId);

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
        }
    }

    // New helper to ensure single-room consistency
    async removeUserFromAllWaitingRooms(userId: string): Promise<string[]> {
        const affectedRoomIds: string[] = [];

        // Find rooms where this user exists
        const rooms = await RoomModel.find({
            status: 'waiting',
            'players.userId': userId
        });

        for (const room of rooms) {
            affectedRoomIds.push(room._id.toString());

            // Remove player
            room.players = room.players.filter(p => p.userId !== userId);

            if (room.players.length === 0) {
                await RoomModel.findByIdAndDelete(room._id);
            } else {
                await room.save();
            }
        }

        return affectedRoomIds;
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

        // 2. Atomic Update using arrayFilters for robustness
        const filter = { _id: roomId };
        const updateOp: any = {
            $set: {
                "players.$[elem].isReady": isReady,
                "players.$[elem].id": playerId // Always update socket ID
            }
        };

        if (dream) updateOp.$set["players.$[elem].dream"] = dream;
        if (token) updateOp.$set["players.$[elem].token"] = token;

        // Match the player by userId preference, then socketId
        // We need to know WHICH one to match.
        // Since we did a check above:
        // let player = roomCheck.players.find(p => p.id === playerId);
        // if (!player && userId) player = roomCheck.players.find(p => p.userId === userId);

        // We know 'player' exists and we know its userId/id.
        // We should target that specific player.
        const targetUserId = player!.userId;
        const targetSocketId = player!.id;

        const arrayFilters = targetUserId
            ? [{ "elem.userId": targetUserId }]
            : [{ "elem.id": targetSocketId }];

        console.log('RoomService.setPlayerReady: filter', JSON.stringify(filter), 'update', JSON.stringify(updateOp), 'arrayFilters', JSON.stringify(arrayFilters));

        const updatedRoom = await RoomModel.findOneAndUpdate(
            filter,
            updateOp,
            {
                new: true,
                arrayFilters: arrayFilters
            }
        ).lean();

        if (!updatedRoom) {
            console.error('RoomService.setPlayerReady FAILED to find document or update.');
            throw new Error("Update failed");
        }

        // Find modified player to log result
        const p = updatedRoom.players.find(p => p.userId === userId || p.id === playerId);
        console.log('RoomService.setPlayerReady SUCCESS. Updated player:', JSON.stringify(p));

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
