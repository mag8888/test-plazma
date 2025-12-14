"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';
import { RulesModal } from '../game/RulesModal';

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
    const [maxPlayers, setMaxPlayers] = useState(4);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRules, setShowRules] = useState(false);

    // Lazy init to avoid hydration mismatch while reading from LS immediately on client
    const [user, setUser] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        } else {
            router.push('/');
        }

        const fetchRooms = () => {
            console.log("Fetching rooms...");
            socket.emit('get_rooms', (data: Room[]) => {
                console.log("Rooms received:", data);
                setRooms(data);
            });
        };

        fetchRooms();

        socket.on('connect', fetchRooms);
        socket.on('rooms_updated', (data: Room[]) => setRooms(data));

        return () => {
            socket.off('connect', fetchRooms);
            socket.off('rooms_updated');
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const createRoom = () => {
        if (!newRoomName || !user || isSubmitting) return;
        setIsSubmitting(true);
        const playerName = user.firstName || user.username || 'Guest';
        const userId = user._id || user.id;

        socket.emit('create_room', { name: newRoomName, maxPlayers, timer: 120, playerName, userId }, (response: any) => {
            setIsSubmitting(false);
            if (response.success) {
                router.push(`/game?id=${response.room.id}`);
            } else {
                alert("Failed to create room: " + response.error);
            }
        });
    };

    const joinRoom = (roomId: string) => {
        router.push(`/game?id=${roomId}`);
    };

    if (!mounted || !user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                            {user.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Игрок</div>
                            <div className="font-bold text-lg leading-none">{user.username || 'Guest'}</div>
                        </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                        <button
                            onClick={() => setIsCreating(!isCreating)}
                            className="bg-green-600 hover:bg-green-500 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all font-bold text-xs sm:text-sm whitespace-nowrap flex-1 text-center"
                        >
                            + Новая
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-slate-700 hover:bg-red-500/80 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-bold border border-slate-600 whitespace-nowrap"
                        >
                            Выход
                        </button>
                    </div>
                </header>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-300">Список комнат</h2>
                </div>

                {isCreating && (
                    <div className="bg-slate-800 p-6 rounded-xl mb-8 border border-slate-700">
                        <h2 className="text-xl mb-4">Новая комната</h2>
                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Название комнаты"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />

                            <div className="flex flex-col gap-3">
                                <label className="text-slate-400 text-sm">Количество игроков: <span className="text-white font-bold">{maxPlayers}</span></label>
                                <div className="flex gap-2">
                                    {[...Array(8)].map((_, i) => {
                                        const count = i + 1;
                                        // Start from 2 players, so hide/disable 1 player option? 
                                        // Requirement: 2-8. So index 0 (1 player) should be disabled or effectively 2?
                                        // Let's render 1-8 but only enable 2-8.
                                        if (count < 2) return null;

                                        const isActive = count <= maxPlayers;
                                        return (
                                            <button
                                                key={count}
                                                onClick={() => setMaxPlayers(count)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isActive
                                                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] scale-110'
                                                    : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                                                    }`}
                                                title={`${count} игроков`}
                                            >
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                </svg>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={createRoom}
                                disabled={isSubmitting}
                                className={`bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg w-full sm:w-auto self-end transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Создание...' : 'Создать'}
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
                                    <div className="mt-1 text-slate-400">
                                        Хост: <span className="text-slate-200 font-medium">{room.players[0]?.name || 'Неизвестно'}</span>
                                    </div>
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

            {/* Rules Modal */}
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            {/* Fixed Bottom Bar for Rules */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex justify-center z-50">
                <button
                    onClick={() => setShowRules(true)}
                    className="w-full max-w-4xl py-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold uppercase tracking-widest text-sm hover:bg-violet-500/20 active:bg-violet-500/30 transition-all flex items-center justify-center gap-3 shadow-lg shadow-violet-900/10"
                >
                    <span>📜</span> Правила Игры
                </button>
            </div>

            {/* Spacer for bottom bar */}
            <div className="h-24"></div>
        </div>
    );
}
