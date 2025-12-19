import { v4 as uuidv4 } from 'uuid';
import { RoomModel, IRoom, IPlayer } from '../models/room.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';

export class RoomService {

    constructor() { }

    async createRoom(creatorId: string, userId: string, playerName: string, name: string, maxPlayers: number = 6, timer: number = 120, password?: string, token?: string, dream?: string): Promise<any> {
        // 0. Strict Isolation: Check if user is already in a PLAYING room
        const playing = await RoomModel.findOne({ status: 'playing', 'players.userId': userId });
        if (playing) {
            throw new Error("Вы уже находитесь в активной игре. Завершите её или признайте поражение, чтобы создать новую.");
        }

        // 1. Cleanup: Remove user from ALL waiting rooms (Auto-Leave)
        await this.removeUserFromAllWaitingRooms(userId);

        // 2. Cleanup: Delete any previous room hosted by this user
        // This ensures the Host moves to the new room and the old one is closed/wiped
        await RoomModel.deleteMany({ creatorId: userId, status: 'waiting' });

        // 3. Validation: Check for Name Uniqueness
        const nameTaken = await RoomModel.findOne({ name: name, status: 'waiting' });
        if (nameTaken) {
            throw new Error("Комната с таким именем уже существует");
        }

        // Resolve User Photo safe lookup
        let userPhoto = '';
        try {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                const u = await UserModel.findById(userId);
                userPhoto = u?.photo_url || '';
            } else if (!isNaN(Number(userId))) {
                const u = await UserModel.findOne({ telegram_id: Number(userId) });
                userPhoto = u?.photo_url || '';
            }
        } catch (e) { }

        // 4. Create proper new room
        const room = await RoomModel.create({
            name,
            creatorId: userId, // Persistent User ID
            maxPlayers,
            timer,
            password,
            players: [{
                id: creatorId, // Socket ID
                userId: userId,
                name: playerName,
                isReady: false,
                token: '🦊', // Default fallback
                dream: 'Дом мечты ($100 000)', // Default fallback
                photo_url: userPhoto
            }],
            status: 'waiting',
            createdAt: Date.now()
        });

        return this.sanitizeRoom(room);
    }

    async joinRoom(roomId: string, playerId: string, userId: string, playerName: string, password?: string, token?: string, dream?: string): Promise<any> {
        // 0. Strict Isolation: Check if user is already in a PLAYING room (unless re-joining THIS room)
        const playing = await RoomModel.findOne({ status: 'playing', 'players.userId': userId });
        if (playing) {
            // Allow re-joining the SAME room if connection lost
            if (playing._id.toString() !== roomId) {
                throw new Error("Вы уже находитесь в другой активной игре!");
            }
        }

        // Resolve User Photo safe lookup
        let userPhoto = '';
        try {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                const u = await UserModel.findById(userId);
                userPhoto = u?.photo_url || '';
            } else if (!isNaN(Number(userId))) {
                const u = await UserModel.findOne({ telegram_id: Number(userId) });
                userPhoto = u?.photo_url || '';
            }
        } catch (e) { }

        // 1. Try to update EXISTING player (Atomic)
        let room = await RoomModel.findOneAndUpdate(
            { _id: roomId, "players.userId": userId },
            {
                $set: {
                    "players.$.id": playerId,
                    "players.$.name": playerName,
                    "players.$.token": token || '🦊',
                    "players.$.dream": dream || 'Дом мечты ($100 000)',
                    "players.$.photo_url": userPhoto
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

        // Allow rejoin if player is already in the list
        const isAlreadyInRoom = roomCheck.players.some((p: any) => p.userId === userId);
        if (roomCheck.status !== 'waiting' && !isAlreadyInRoom) throw new Error("Game already started");

        // Determine unique token for new player
        const ALL_TOKENS = ['🦁', '🦅', '🦊', '🐻', '🐅', '🐺', '🐘', '🦈', '🦉', '🐬']; // Synced with Frontend Visual Order
        const existingTokens = roomCheck.players.map((p: any) => p.token);
        let finalToken = token || '🦊';

        if (existingTokens.includes(finalToken)) {
            // Pick the next available token in the visual sequence (Cyclic)
            // Example: If Fox (3rd) is taken, we prefer Bear (4th), etc.
            const startIdx = ALL_TOKENS.indexOf(finalToken);
            // Create a rotated list starting from current token's index
            const ordered = startIdx >= 0
                ? [...ALL_TOKENS.slice(startIdx), ...ALL_TOKENS.slice(0, startIdx)]
                : ALL_TOKENS;

            const free = ordered.find(t => !existingTokens.includes(t));
            if (free) finalToken = free;
        }

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
                        isReady: false,
                        token: finalToken,
                        dream: dream || 'Дом мечты ($100 000)',
                        photo_url: userPhoto
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
            const p = refetch.players.find((p: IPlayer) => p.userId === userId);
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

    async leaveRoom(roomId: string, playerId: string, userId?: string): Promise<void> {
        // We use $pull to remove the player by socket ID or User ID (to handle refreshes)
        const pullQuery: any = { id: playerId };
        if (userId) {
            // Need a complex logic or just rely on $or logic within $pull? 
            // $pull accepts a query, so we can do $pull: { players: { $or: [{ id: playerId }, { userId: userId }] } }
            // BUT userId might be undefined/null for guests.
            // CAUTION: 'guest_' IDs might conflict if logic is loose.
            // Let's use specific query.
            await RoomModel.findByIdAndUpdate(roomId, {
                $pull: { players: { $or: [{ id: playerId }, { userId: userId }] } }
            });
        } else {
            await RoomModel.findByIdAndUpdate(roomId, {
                $pull: { players: { id: playerId } }
            });
        }

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
            room.players = room.players.filter((p: IPlayer) => p.userId !== userId);

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
        const player = room.players.find((p: IPlayer) => p.id === playerIdToKick);
        if (player && player.userId === requesterUserId) {
            throw new Error("Host cannot kick themselves");
        }

        await this.leaveRoom(roomId, playerIdToKick);
    }

    async deleteRoom(roomId: string, requesterUserId: string): Promise<void> {
        const room = await RoomModel.findById(roomId);
        if (!room) throw new Error("Room not found");

        if (room.creatorId !== requesterUserId) {
            throw new Error("Only the host can delete the room");
        }

        await RoomModel.findByIdAndDelete(roomId);
    }

    async getRooms(): Promise<any[]> {
        const rooms = await RoomModel.find({ status: 'waiting' }).sort({ createdAt: -1 }).lean();
        return rooms.map(r => this.sanitizeRoom(r));
    }

    async getMyRooms(userId: string): Promise<any[]> {
        // Find rooms where this user is a player (Waiting or Playing)
        const rooms = await RoomModel.find({ 'players.userId': userId }).sort({ createdAt: -1 }).lean();
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

        let player = (roomCheck as any).players.find((p: IPlayer) => p.id === playerId);

        // JIT Reconnect: If not found by socket ID, try User ID
        if (!player && userId) {
            player = (roomCheck as any).players.find((p: IPlayer) => p.userId === userId);
            // If found by User ID, we must update the Socket ID atomically first or during the main update
            // We can handle it in the main update query query filter.
        }

        if (!player) throw new Error("Player not in room");

        // Validate Dream
        if (isReady && !dream) {
            throw new Error("Выберите мечту перед тем как нажать Готов");
        }

        // Validate Token Uniqueness and Auto-Assign if taken
        const ALL_TOKENS = ['🦊', '🐱', '🐭', '🐹', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷'];

        let finalToken = token || '🦊';

        // Check availability of the requested token
        const isTokenTaken = (roomCheck as any).players.some((p: IPlayer) => p.token === finalToken && p.userId !== player!.userId);

        if (isTokenTaken) {
            console.log(`Token ${finalToken} is taken. Finding a free one...`);
            // Find first free token
            const usedTokens = (roomCheck as any).players.map((p: IPlayer) => p.token);
            const freeToken = ALL_TOKENS.find(t => !usedTokens.includes(t));

            if (freeToken) {
                finalToken = freeToken;
                console.log(`Assigned free token: ${finalToken}`);
            } else {
                throw new Error("Все фишки заняты! Невозможно выбрать уникальную.");
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
        if (finalToken) updateOp.$set["players.$[elem].token"] = finalToken;

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
        ).lean() as any;

        if (!updatedRoom) {
            console.error('RoomService.setPlayerReady FAILED to find document or update.');
            throw new Error("Update failed");
        }

        // Find modified player to log result
        const p = updatedRoom.players.find((p: IPlayer) => p.userId === userId || p.id === playerId);
        console.log('RoomService.setPlayerReady SUCCESS. Updated player:', JSON.stringify(p));

        return this.sanitizeRoom(updatedRoom);
    }

    async checkAllReady(roomId: string): Promise<boolean> {
        const room = await RoomModel.findById(roomId);
        if (!room || room.players.length === 0) return false;
        return room.players.every((p: IPlayer) => p.isReady);
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
