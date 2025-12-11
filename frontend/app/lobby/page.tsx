"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';

interface Room {
    id: string;
    name: string;
    players: any[];
    maxPlayers: number;
    status: string;
    timer: number;
}

export default function Lobby() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');

    useEffect(() => {
        socket.emit('get_rooms', (data: Room[]) => setRooms(data));

        socket.on('rooms_updated', (data: Room[]) => {
            setRooms(data);
        });

        return () => {
            socket.off('rooms_updated');
        };
    }, []);

    const createRoom = () => {
        if (!newRoomName) return;
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        const playerName = user.firstName || user.username || 'Guest';
        const userId = user._id || user.id || 'guest-' + Math.random();

        socket.emit('create_room', { name: newRoomName, maxPlayers: 4, timer: 120, playerName, userId }, (response: any) => {
            if (response.success) {
                router.push(`/game/${response.room.id}`);
            } else {
                alert("Failed to create room: " + response.error);
            }
        });
    };

    const joinRoom = (roomId: string) => {
        router.push(`/game/${roomId}`);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                        Игровые комнаты
                    </h1>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-all"
                    >
                        + Создать комнату
                    </button>
                </header>

                {isCreating && (
                    <div className="bg-slate-800 p-6 rounded-xl mb-8 border border-slate-700">
                        <h2 className="text-xl mb-4">Новая комната</h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Название комнаты"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={createRoom}
                                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg"
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    {rooms.map(room => (
                        <div key={room.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold mb-1">{room.name}</h3>
                                <p className="text-slate-400 text-sm">
                                    Игроки: {room.players.length}/{room.maxPlayers} • {room.timer}с
                                </p>
                                <div className="mt-2 text-xs">
                                    ID: {room.id}
                                </div>
                            </div>
                            <button
                                onClick={() => joinRoom(room.id)}
                                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg border border-slate-600"
                            >
                                Войти
                            </button>
                        </div>
                    ))}

                    {rooms.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-slate-500">
                            Нет доступных комнат. Создайте первую!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
