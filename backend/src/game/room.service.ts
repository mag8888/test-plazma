import { v4 as uuidv4 } from 'uuid';

export interface Player {
    id: string; // Socket ID or User ID
    name: string;
    isReady: boolean;
    dream?: string; // Selected Dream
    profession?: string; // Assigned Profession
    token?: string; // Selected Token (1-10)
}

export interface Room {
    id: string;
    name: string;
    creatorId: string;
    players: Player[];
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    timer: number; // Seconds per turn
    password?: string;
    createdAt: number;
}

export class RoomService {
    private rooms: Map<string, Room> = new Map();

    createRoom(creatorId: string, creatorName: string, name: string, maxPlayers: number = 6, timer: number = 120, password?: string): Room {
        const roomId = uuidv4().substring(0, 6).toUpperCase(); // Short ID
        const room: Room = {
            id: roomId,
            name,
            creatorId,
            players: [{
                id: creatorId,
                name: creatorName,
                isReady: false
            }],
            maxPlayers,
            status: 'waiting',
            timer,
            password,
            createdAt: Date.now()
        };
        this.rooms.set(roomId, room);
        return room;
    }

    joinRoom(roomId: string, playerId: string, playerName: string, password?: string): Room {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error("Room not found");
        if (room.status !== 'waiting') throw new Error("Game already started");
        if (room.players.length >= room.maxPlayers) throw new Error("Room is full");
        if (room.password && room.password !== password) throw new Error("Invalid password");

        // Idempotency: If already in room, just return (handle rejoin)
        const existingPlayer = room.players.find(p => p.id === playerId);
        if (existingPlayer) {
            return room;
        }

        room.players.push({
            id: playerId,
            name: playerName,
            isReady: false
        });
        return room;
    }

    leaveRoom(roomId: string, playerId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);

        // If creator leaves or room empty, close room
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
        } else if (room.creatorId === playerId) {
            // Assign new creator? Or close? For now, simplify: close if creator leaves
            // this.rooms.delete(roomId);
            room.creatorId = room.players[0].id; // Promote next player
        }
    }

    getRooms(): Room[] {
        return Array.from(this.rooms.values()).filter(r => r.status === 'waiting');
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    setPlayerReady(roomId: string, playerId: string, isReady: boolean, dream?: string, token?: string): Room {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error("Room not found");

        const player = room.players.find(p => p.id === playerId);
        if (!player) throw new Error("Player not in room");

        // Validate Dream (Mandatory per requirements)
        if (isReady && !dream) {
            throw new Error("Выберите мечту перед тем как нажать Готов");
        }

        if (token) {
            const tokenTaken = room.players.some(p => p.id !== playerId && p.token === token);
            if (tokenTaken) {
                throw new Error("Эта фишка уже занята другим игроком");
            }
            player.token = token;
        }

        player.isReady = isReady;
        if (dream) player.dream = dream;

        return room;
    }

    checkAllReady(roomId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        return room.players.length > 0 && room.players.every(p => p.isReady);
    }

    startGame(roomId: string): Room {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error("Room not found");
        room.status = 'playing';
        return room;
    }
}
