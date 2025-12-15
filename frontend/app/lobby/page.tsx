"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';
import { RulesModal } from '../game/RulesModal';
import { DREAMS } from '../lib/dreams';

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
    const [myRooms, setMyRooms] = useState<Room[]>([]);
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

            // Fetch My Rooms using either Logged In ID or Guest ID
            const parsedUser = userStr ? JSON.parse(userStr) : null;
            const userId = parsedUser?._id || parsedUser?.id || localStorage.getItem('guest_id');

            if (userId) {
                socket.emit('get_my_rooms', { userId }, (res: any) => {
                    if (res.success) {
                        setMyRooms(res.rooms);
                    }
                });
            }
        };

        fetchRooms();

        socket.on('connect', fetchRooms);
        socket.on('rooms_updated', (data: Room[]) => {
            setRooms(data);
            // Re-fetch my rooms on update too
            const parsedUser = userStr ? JSON.parse(userStr) : null;
            const userId = parsedUser?._id || parsedUser?.id || localStorage.getItem('guest_id');
            if (userId) {
                socket.emit('get_my_rooms', { userId }, (res: any) => {
                    if (res.success) {
                        setMyRooms(res.rooms);
                    }
                });
            }
        });

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

        socket.emit('create_room', {
            name: newRoomName,
            maxPlayers,
            timer: 120,
            playerName,
            userId,
            token: '🦊',
            dream: DREAMS[0].name
        }, (response: any) => {
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
        <div className="min-h-screen bg-[#0f172a] text-white p-4 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* 👈 LEFT COLUMN: Profile & Leaderboard */}
                <div className="lg:col-span-1 space-y-6">
                    {/* PROFILE CARD */}
                    <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-blue-500/20">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Игрок</div>
                                <div className="font-bold text-xl text-white tracking-wide">{user.username || 'Guest'}</div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            Выйти
                        </button>
                    </div>

                    {/* 🏆 LEADERBOARD WIDGET */}
                    <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="text-yellow-500 text-lg">🏆</span> Топ Игроков
                        </h3>

                        <div className="space-y-4">
                            {leaderboard.length === 0 ? (
                                <div className="text-slate-500 text-xs text-center py-8 italic border border-dashed border-slate-800 rounded-xl">
                                    История побед пишется сейчас...
                                </div>
                            ) : (
                                leaderboard.map((player, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-lg transform group-hover:scale-110 transition-transform ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black ring-2 ring-yellow-500/30' :
                                                idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                                                    idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white' :
                                                        'bg-slate-800 text-slate-500'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-bold truncate ${idx === 0 ? 'text-yellow-400' : 'text-slate-200'} group-hover:text-white transition-colors`}>
                                                {player.username || player.firstName || 'Player'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                                Побед: <span className="text-slate-300">{player.wins}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 👉 RIGHT COLUMN: Main Content */}
                <div className="lg:col-span-3 space-y-8">

                    {/* NEW ROOM & ACTIONS */}
                    <div className="flex justify-between items-center bg-[#1e293b]/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="text-3xl">🎲</span> Лобби
                        </h1>
                        <button
                            onClick={() => setIsCreating(!isCreating)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span>+</span> Создать комнату
                        </button>
                    </div>

                    {/* ACTIVE GAMES */}
                    {myRooms.length > 0 && (
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl p-6 border border-indigo-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-slate-800/[0.1] bg-[size:20px_20px]"></div>
                            <h2 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2 relative z-10">
                                <span className="animate-spin-slow">🔄</span> Ваши активные игры
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                {myRooms.map((room) => (
                                    <div key={room.id} className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30 hover:border-indigo-400 transition-all group shadow-xl">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">
                                                    {room.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${room.status === 'playing' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {room.status === 'playing' ? '🟢 Идет игра' : '🟡 Ожидание'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                                {room.players.length}/{room.maxPlayers}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => joinRoom(room.id)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Вернуться в игру ➡
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CREATE ROOM FORM */}
                    {isCreating && (
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                            <h2 className="text-xl font-bold text-white mb-6">Новая комната</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Название</label>
                                    <input
                                        type="text"
                                        placeholder="Например: Битва Миллиардеров"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-5 py-4 text-white placeholder:text-slate-600 outline-none transition-all font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                                        <span>Количество игроков</span>
                                        <span className="text-white text-lg">{maxPlayers}</span>
                                    </label>
                                    <div className="flex gap-2">
                                        {[...Array(8)].map((_, i) => {
                                            const count = i + 1;
                                            if (count < 2) return null;
                                            return (
                                                <button
                                                    key={count}
                                                    onClick={() => setMaxPlayers(count)}
                                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${maxPlayers === count
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                            : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {count}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={createRoom}
                                    disabled={isSubmitting || !newRoomName}
                                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-green-900/20 hover:-translate-y-1 active:scale-95 transition-all text-sm"
                                >
                                    {isSubmitting ? 'Создание...' : '🚀 Запустить Игру'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ROOM LIST */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Доступные комнаты</h2>

                        {rooms.length === 0 ? (
                            <div className="text-center py-20 bg-[#1e293b]/50 rounded-3xl border border-dashed border-slate-800">
                                <div className="text-6xl mb-4 opacity-20">📭</div>
                                <div className="text-slate-500 font-bold">Нет доступных комнат</div>
                                <div className="text-slate-600 text-sm mt-2">Будьте первыми — создайте игру!</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                {rooms.map((room) => (
                                    <div key={room.id} className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 hover:border-slate-600 hover:shadow-xl transition-all group flex flex-col justify-between h-[180px]">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1">{room.name}</h3>
                                                {room.status === 'playing' && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold uppercase">Идет игра</span>}
                                            </div>
                                            <div className="flex gap-2 mb-4">
                                                <div className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400 font-mono border border-slate-800">
                                                    ⏱ {Math.floor(room.timer / 60)} мин/ход
                                                </div>
                                                <div className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400 font-mono border border-slate-800">
                                                    👥 {room.players.length}/{room.maxPlayers}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => joinRoom(room.id)}
                                            disabled={room.status === 'playing' || room.players.length >= room.maxPlayers}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${room.status === 'playing' || room.players.length >= room.maxPlayers
                                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                    : 'bg-slate-700 hover:bg-blue-600 text-white shadow-lg'
                                                }`}
    </button>
</div>

{/* Spacer for bottom bar */}
                        <div className="h-24"></div>
                    </div >
                    );
}
