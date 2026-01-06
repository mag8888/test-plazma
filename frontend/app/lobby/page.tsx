"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socket } from '../socket';
import { RulesModal } from '../game/RulesModal';
import { RoomErrorModal } from './RoomErrorModal';
import { DREAMS } from '../lib/dreams';

interface Room {
    id: string;
    name: string;
    players: any[];
    maxPlayers: number;
    status: string;
    timer: number;
    creatorId: string; // Added for Delete Permission
    creatorUsername?: string; // Added for display
}

import { useTelegram } from '../../components/TelegramProvider';

function LobbyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isTutorial = searchParams.get('tutorial') === 'true';
    const { user: tgUser, isReady } = useTelegram(); // Use context

    // Internal user state for Socket usage. 
    // Ideally we should sync tgUser to this, or just use tgUser directly.
    // The legacy code expects 'user' object with ._id or .id

    // Let's alias tgUser to user or sync it.
    // tgUser comes from backend /api/auth/login/telegram, so it should be the full user object.

    const user = tgUser;

    const [rooms, setRooms] = useState<Room[]>([]);
    const [myRooms, setMyRooms] = useState<Room[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(4);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRules, setShowRules] = useState(false);

    // const [user, setUser] = useState<any>(null); // Removed local state
    const [mounted, setMounted] = useState(false);

    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        // Wait for isReady?
        // If !user and isReady, maybe redirect?
        // But for now, let's just let it load.

        if (isReady && !user) {
            // Maybe user is not logged in? 
            // In Mini App we are always logged in via initData.
        }

        const fetchRooms = () => {
            console.log("Fetching rooms...");
            socket.emit('get_rooms', (data: Room[]) => {
                console.log("Rooms received:", data);
                setRooms(data);
            });

            // Fetch Leaderboard
            socket.emit('get_leaderboard', (response: any) => {
                if (Array.isArray(response)) {
                    setLeaderboard(response);
                } else if (response && response.leaders && Array.isArray(response.leaders)) {
                    setLeaderboard(response.leaders);
                } else {
                    setLeaderboard([]);
                }
            });

            // Fetch My Rooms using either Logged In ID or Guest ID
            const userId = user?._id || user?.id; // Use context user

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

            // Refresh logic if needed
            // const parsedUser = userStr ? JSON.parse(userStr) : null;
            // const userId = parsedUser?._id || parsedUser?.id || localStorage.getItem('guest_id');
            const userId = user?._id || user?.id;

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
    }, [user]); // Re-run when user loads

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const [roomError, setRoomError] = useState<{ isOpen: boolean; message: string; roomIdToLeave?: string }>({ isOpen: false, message: '' });

    // ... (existing state)

    const createRoom = () => {
        if (!user) return alert("Пожалуйста, войдите в систему");

        if (!newRoomName.trim()) {
            alert("Пожалуйста, введите название комнаты");
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);
        const playerName = user.firstName || user.username || 'Guest';
        const userId = user._id || user.id;

        // 0. Pre-check: If already in a room, prompt to leave/delete
        if (myRooms.length > 0) {
            const currentRoom = myRooms[0];
            setIsSubmitting(false); // Reset
            setRoomError({
                isOpen: true,
                message: `Вы уже находитесь в комнате "${currentRoom.name}" (${currentRoom.status === 'playing' ? 'Игра идет' : 'Ожидание'}). Хотите покинуть её и создать новую?`,
                roomIdToLeave: currentRoom.id
            });
            return;
        }

        socket.emit('create_room', {
            name: newRoomName,
            maxPlayers,
            timer: 120,
            playerName,

            userId,
            token: '🦊',
            dream: DREAMS[0].name,
            isTraining: isTutorial // Pass Tutorial Flag
        }, (response: any) => {
            setIsSubmitting(false);
            if (response.success) {
                const url = `/game?id=${response.room.id}${isTutorial ? '&tutorial=true' : ''}`;
                router.push(url);
            } else {
                // Check for "already in room" or similar errors
                // We assume backend might send specific error or we check if user is in 'myRooms'
                // But the alert implies backend returned error.
                // Optimistically check if we are in a room locally:
                const currentRoom = myRooms[0]; // Simplistic check if we are in ANY room

                if (response.error.includes('already') || response.error.includes('Вы уже находитесь') || currentRoom) {
                    setRoomError({
                        isOpen: true,
                        message: `Вы уже находитесь в комнате "${currentRoom?.name || 'Unknown'}" (${currentRoom?.status === 'playing' ? 'Игра идет' : 'Ожидание'}). Хотите покинуть её и создать новую?`,
                        roomIdToLeave: currentRoom?.id
                    });
                } else {
                    alert("Не удалось создать комнату: " + response.error);
                }
            }
        });
    };

    const handleForceCreate = () => {
        if (!roomError.roomIdToLeave || !user) return;

        setIsSubmitting(true);
        // Leave old room
        socket.emit('leave_room', { roomId: roomError.roomIdToLeave, userId: user._id || user.id });

        // Optimistically remove from state
        setMyRooms(prev => prev.filter(r => r.id !== roomError.roomIdToLeave));
        setRoomError({ ...roomError, isOpen: false });

        // Retry Create Room after short delay to allow backend processing
        setTimeout(() => {
            setIsSubmitting(false);
            createRoom();
        }, 500);
    };

    // Refactored Helper
    const doCreateRoom = () => {
        // Copy of createRoom logic without isSubmitting check or with it managed
        // Let's just reset isSubmitting before calling createRoom?
        setIsSubmitting(false);
        // But we want to prevent double clicks.
        // Let's rely on createRoom's logic.
        setTimeout(() => createRoom(), 100);
    };

    const joinRoom = (roomId: string) => {
        // Check if user is already in another room
        const currentRoom = myRooms.find(r => r.id !== roomId);

        if (currentRoom) {
            const isConfirm = confirm(`Вы сейчас в комнате "${currentRoom.name}". Хотите перейти? (Вы покинете текущую комнату)`);
            if (isConfirm) {
                if (user) {
                    socket.emit('leave_room', { roomId: currentRoom.id, userId: user._id || user.id });
                    // Optimistically remove from local state
                    setMyRooms(prev => prev.filter(r => r.id !== currentRoom.id));
                }
                router.push(`/game?id=${roomId}`);
            }
        } else {
            router.push(`/game?id=${roomId}`);
        }
    };

    const handleDeleteRoom = (roomId: string) => {
        if (!user) return;
        socket.emit('delete_room', { roomId, userId: user._id || user.id }, (res: any) => {
            if (!res.success) {
                alert('Не удалось удалить комнату: ' + res.error);
            } else {
                // Update handled via socket event
            }
        });
    };

    const handleLeaveRoom = (roomId: string) => {
        if (!user) return;
        // Use kick_player logic or dedicated leave?
        // Use existing 'leave_room' but check if it supports full cleanup
        // The backend 'leave_room' calls 'roomService.leaveRoom' which removes player. 
        // Good for waiting rooms. For active games, it might be tricky if not handled.
        // But for "Fully Exit" from lobby, it just removes player from list.

        socket.emit('leave_room', { roomId, userId: user._id || user.id });
        // Ideally we want a callback to know it succeeded
        // But existing 'leave_room' doesn't have callback in gateway (Line 177). 
        // It just emits updates.
        // We can assume success or just wait for room update.

        // Manually update local state to feel responsive?
        setMyRooms(prev => prev.filter(r => r.id !== roomId));
    };

    if (!mounted || !user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 lg:p-8 pb-32 font-sans">
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
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <span className="text-yellow-500">★</span>
                                                    <span className="text-slate-300 font-bold">{Math.round(player.rating || 0)}</span>
                                                </span>
                                                <span className="w-px h-3 bg-slate-700"></span>
                                                <span>
                                                    Игр: <span className="text-slate-300">{player.gamesPlayed || 0}</span>
                                                </span>
                                                <span className="w-px h-3 bg-slate-700"></span>
                                                <span>
                                                    Побед: <span className="text-slate-300">{player.wins || 0}</span>
                                                </span>
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
                    <div className={`flex justify-between items-center bg-[#1e293b]/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm ${isTutorial && !isCreating ? 'relative z-50' : ''}`}>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="text-3xl">🎲</span> Лобби
                        </h1>
                        <button
                            onClick={() => setIsCreating(!isCreating)}
                            className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 relative ${isTutorial && !isCreating ? 'z-50 ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse' : ''}`}
                        >
                            <span>+</span> Создать комнату
                        </button>
                    </div>

                    {/* TUTORIAL OVERLAY */}
                    {isTutorial && !isCreating && (
                        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center backdrop-blur-sm">
                            <div className="text-center relative">
                                <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300 drop-shadow-2xl animate-bounce mb-8">
                                    1. Создайте комнату
                                </div>
                                <div className="absolute -top-20 right-[-100px] md:right-[-200px] text-emerald-400 animate-pulse hidden md:block">
                                    <svg width="150" height="150" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" className="transform rotate-12">
                                        <path d="M10 80 Q 50 10 90 10" markerEnd="url(#arrowhead)" />
                                    </svg>
                                </div>
                                {/* Mobile Arrow */}
                                <div className="absolute -top-32 right-0 text-emerald-400 animate-pulse md:hidden">
                                    <svg width="80" height="150" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                                        <path d="M50 100 L 50 10" markerEnd="url(#arrowhead)" />
                                    </svg>
                                </div>
                                <svg className="hidden">
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                                        </marker>
                                    </defs>
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* ACTIVE GAMES */}
                    {myRooms.length > 0 && (
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl p-6 border border-indigo-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-slate-800/[0.1] bg-[size:20px_20px]"></div>
                            <h2 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2 relative z-10">
                                <span className="animate-spin-slow">🔄</span> Ваши активные игры
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                {myRooms.map((room) => {
                                    const isHost = room.creatorId === (user._id || user.id);

                                    return (
                                        <div key={room.id} className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30 hover:border-indigo-400 transition-all group shadow-xl relative">
                                            {/* DELETE / LEAVE BUTTON (Top Right) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isHost) {
                                                        if (confirm('Удалить комнату?')) handleDeleteRoom(room.id);
                                                    } else {
                                                        if (confirm('Покинуть игру?')) handleLeaveRoom(room.id);
                                                    }
                                                }}
                                                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors z-20"
                                                title={isHost ? "Удалить комнату" : "Покинуть игру"}
                                            >
                                                {isHost ? '🗑' : '🚪'}
                                            </button>

                                            <div className="flex justify-between items-start mb-4 pr-8">
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
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* CREATE ROOM FORM */}
                    {isCreating && (
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                            <h2 className="text-xl font-bold text-white mb-6">Новая комната</h2>
                            <div className="space-y-6">
                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Название</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Например: Битва Миллиардеров"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-5 py-4 text-white placeholder:text-slate-600 outline-none transition-all font-bold"
                                    />
                                    {isTutorial && !newRoomName && (
                                        <div className="absolute top-[-45px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl animate-bounce shadow-lg z-50 whitespace-nowrap">
                                            1. Введите название 👇
                                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-500"></div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                                        <span>Количество игроков</span>
                                        <span className="text-white text-lg">{maxPlayers}</span>
                                    </label>
                                    <div className="flex gap-2 font-mono">
                                        {[...Array(10)].map((_, i) => {
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
                                    disabled={isSubmitting}
                                    className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all text-sm relative ${!newRoomName.trim()
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 hover:-translate-y-1 active:scale-95'
                                        }`}
                                >
                                    {isTutorial && (
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl animate-bounce shadow-lg z-50 whitespace-nowrap">
                                            2. Нажмите Старт 👇
                                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-500"></div>
                                        </div>
                                    )}
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
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1">{room.name}</h3>
                                                    {room.creatorUsername && (
                                                        <a
                                                            href={`https://t.me/${room.creatorUsername}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-slate-500 hover:text-blue-400 transition-colors inline-flex items-center gap-1 mt-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            👤 @{room.creatorUsername}
                                                        </a>
                                                    )}
                                                </div>
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
                                            disabled={room.players.length >= room.maxPlayers}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${room.players.length >= room.maxPlayers
                                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                : 'bg-slate-700 hover:bg-blue-600 text-white shadow-lg'
                                                }`}
                                        >
                                            {room.status === 'playing'
                                                ? (room.players.length >= room.maxPlayers ? 'Мест нет (Игра идет)' : 'Присоединиться (Игра идет)')
                                                : (room.players.length >= room.maxPlayers ? 'Мест нет' : 'Присоединиться')
                                            }
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* RULES BUTTON (Fixed) */}
            <button
                onClick={() => setShowRules(true)}
                className="fixed bottom-6 left-6 z-50 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md border border-slate-700 text-slate-400 hover:text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl"
            >
                📜 Правила
            </button>

            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            <RoomErrorModal
                isOpen={roomError.isOpen}
                onClose={() => setRoomError({ ...roomError, isOpen: false })}
                onConfirm={handleForceCreate}
                message={roomError.message}
                isSubmitting={isSubmitting}
            />


        </div>
    );
}

export default function Lobby() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Загрузка...</div>}>
            <LobbyContent />
        </Suspense>
    );
}
