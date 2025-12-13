
"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { socket } from '../socket';
import GameBoard from './board';
import { DREAMS } from '../lib/dreams';

// ... (Interfaces remain same, I'll assume I don't need to retype them if I target carefully or rewriting whole file is safer?
// Rewriting whole file is safer for structure change.)

interface Player {
    id: string; // Socket ID
    userId?: string; // Persistent ID
    name: string;
    isReady: boolean;
    dream?: string;
    token?: string;
}

interface Room {
    id: string;
    name: string;
    players: Player[];
    status: string;
    creatorId: string;
    maxPlayers?: number;
}

function GameContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get('id') as string;
    const router = useRouter();

    const [room, setRoom] = useState<Room | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState('');
    const [dream, setDream] = useState(DREAMS[0].name);
    const [token, setToken] = useState<string>('🦊');
    const [myUserId, setMyUserId] = useState<string | null>(null);

    const [isKickModalOpen, setIsKickModalOpen] = useState(false);
    const [playerToKick, setPlayerToKick] = useState<string | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    // Initial Join & Socket Setup
    useEffect(() => {
        if (!roomId) return;

        // Initialize User Identity
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        const playerName = user.firstName || user.username || 'Guest';
        const userId = user._id || user.id || 'guest-' + Math.random();
        setMyUserId(userId);

        const joinGame = () => {
            console.log("Joining room...", { roomId, playerName, userId });
            socket.emit('join_room', { roomId, playerName, userId }, (response: any) => {
                if (!response.success && socket.connected) {
                    console.error("Join failed:", response.error);
                }
            });
        };

        if (socket.connected) {
            joinGame();
        } else {
            socket.connect();
        }

        const handleConnect = () => {
            console.log("Reconnected. Re-joining...");
            joinGame();
        };

        socket.on('connect', handleConnect);

        socket.on('room_state_updated', (updatedRoom: Room) => {
            console.log("Room updated:", updatedRoom);
            setRoom(updatedRoom);
            const me = updatedRoom.players.find(p => p.userId === userId);
            if (me) {
                setIsReady(me.isReady);
                if (me.dream) setDream(me.dream);
                if (me.token) setToken(me.token);
            }
        });

        socket.on('game_started', (data: any) => {
            if (data?.state) setGameState(data.state);
            setRoom(prev => prev ? { ...prev, status: 'playing' } : null);
        });

        socket.on('player_kicked', (data: { playerId: string }) => {
            if (data.playerId === socket.id) {
                alert("Вы были исключены из комнаты организатором.");
                router.push('/lobby');
            }
        });

        socket.on('error', (err: any) => {
            setError(err.message || 'Error');
        });

        return () => {
            socket.off('connect', handleConnect);
            socket.off('room_state_updated');
            socket.off('game_started');
            socket.off('player_kicked');
            socket.off('error');
            // Do NOT leave room explicitly on unmount, relies on disconnect
            // preventing accidental drops on simple nav
        };
    }, [roomId, router]);

    const toggleReady = () => {
        if (!myUserId) return;
        socket.emit('player_ready', { roomId, isReady: !isReady, dream, token, userId: myUserId }, (res: any) => {
            if (!res.success) alert(res.error);
        });
    };

    const startGame = () => {
        if (!room || !myUserId) return;
        if (room.creatorId !== myUserId) return;
        socket.emit('start_game', { roomId, userId: myUserId });
    };

    const initiateKick = (playerId: string) => {
        setPlayerToKick(playerId);
        setIsKickModalOpen(true);
    };

    const confirmKick = () => {
        if (playerToKick && room && myUserId) {
            socket.emit('kick_player', { roomId, playerId: playerToKick, userId: myUserId }, (res: any) => {
                if (!res.success) alert(res.error);
            });
            setIsKickModalOpen(false);
            setPlayerToKick(null);
        }
    };

    const isHost = room && myUserId && room.creatorId === myUserId;

    if (!room) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка комнаты... {error && <span className="text-red-500 ml-2">{error}</span>}</div>;

    if (room.status === 'playing') {
        const initialBoardState = gameState || {
            roomId,
            players: room.players.map(p => ({ ...p, cash: 10000, assets: [], liabilities: [] })),
            currentPlayerIndex: 0,
            currentTurnTime: 120,
            phase: 'ROLL',
            board: [],
            log: []
        };
        return <GameBoard roomId={roomId} initialState={initialBoardState} />;
    }

    return (
        <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
            <div className="w-full max-w-5xl relative z-10">
                <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

                <header className="mb-8 flex items-center justify-between relative z-20">
                    <button
                        onClick={() => router.push('/lobby')}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-sm transition-all text-slate-300 hover:text-white"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        <span>Назад</span>
                    </button>
                    <div className="text-right">
                        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            {room.name}
                        </h1>
                        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest pl-1">Room #{room.id}</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-20">
                    {/* LEFT COLUMN: Player List */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-bold mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Игроки в комнате
                                <span className="ml-auto bg-white/10 px-2 py-0.5 rounded text-xs text-white">{room.players.length}/{room.maxPlayers || 4}</span>
                            </h2>
                            <div className="space-y-3">
                                {room.players.map(player => (
                                    <div
                                        key={player.id}
                                        className={`group flex items-center gap-4 p-4 rounded-2xl transition-all border relative ${player.id === myUserId
                                            ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="relative">
                                            <div className="text-3xl transform group-hover:scale-110 transition-transform duration-300">
                                                {player.token || '❔'}
                                            </div>
                                            {player.isReady && (
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-[#0f172a]">
                                                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold flex items-center justify-between text-slate-200">
                                                {player.name}
                                                {player.id === myUserId && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded ml-2">ВЫ</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium truncate">
                                                Мечта: {player.dream || '...'}
                                            </div>
                                        </div>

                                        {isHost && player.id !== myUserId && (
                                            <button
                                                onClick={() => initiateKick(player.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-lg absolute right-2 top-2"
                                                title="Удалить из комнаты"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {Array.from({ length: Math.max(0, (room.maxPlayers || 4) - room.players.length) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="p-4 rounded-2xl border border-white/5 border-dashed bg-transparent flex items-center justify-center text-slate-600 text-sm italic">
                                        Ожидание игрока...
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isHost && (
                            <button
                                onClick={startGame}
                                disabled={room.players.length < 2 || !room.players.every(p => p.isReady)}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-6 rounded-3xl font-black text-xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none border border-white/10 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 blur-md"></div>
                                <span className="relative flex items-center justify-center gap-3">
                                    🚀 ЗАПУСТИТЬ ИГРУ
                                </span>
                            </button>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Settings */}
                    <div className="lg:col-span-7">
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl h-full flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            <div className="mb-8 relative z-10">
                                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-2">Настройка персонажа</h3>
                                <p className="text-slate-400 text-sm">Выберите аватар и определите свою мечту</p>
                            </div>
                            <div className="flex-1 relative z-10">
                                <div className="mb-8">
                                    <label className="text-xs uppercase font-bold text-slate-500 mb-4 block tracking-wider">Выберите Аватар</label>
                                    <div className="grid grid-cols-5 sm:grid-cols-5 gap-4">
                                        {['🦁', '🦅', '🦊', '🐻', '🐅', '🐺', '🐘', '🦈', '🦉', '🐬'].map((t) => {
                                            const isTaken = room.players.some(p => p.token === t && p.id !== socket.id);
                                            const isSelected = token === t;
                                            return (
                                                <button
                                                    key={t}
                                                    disabled={isTaken || isReady}
                                                    onClick={() => {
                                                        if (!isReady) {
                                                            setToken(t);
                                                            const userStr = localStorage.getItem('user');
                                                            const userId = userStr ? (JSON.parse(userStr)._id || JSON.parse(userStr).id) : 'guest'; // Simplified
                                                            socket.emit('player_ready', { roomId, isReady, dream, token: t, userId });
                                                        }
                                                    }}
                                                    className={`aspect-square rounded-2xl flex items-center justify-center text-4xl relative transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-400 ring-2 ring-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)] scale-110' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 border'} ${(isTaken || isReady) ? 'opacity-50 grayscale cursor-not-allowed scale-90' : 'cursor-pointer'}`}
                                                >
                                                    <span className={`drop-shadow-lg ${isSelected ? 'animate-bounce-subtle' : ''}`}>{t}</span>
                                                    {isSelected && <div className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center"><div className="absolute inset-0 bg-blue-500 rounded-full blur-[2px]"></div><div className="relative bg-blue-500 bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900 shadow-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div></div>}
                                                    {isTaken && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-[1px] bg-slate-500/50 rotate-45 transform scale-150"></div></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="mb-8">
                                    <label className="text-xs uppercase font-bold text-slate-500 mb-2 block tracking-wider">Ваша Мечта</label>
                                    <div className="relative">
                                        <select
                                            value={dream}
                                            onChange={(e) => {
                                                const newDream = e.target.value;
                                                setDream(newDream);
                                                const userStr = localStorage.getItem('user');
                                                const userId = userStr ? (JSON.parse(userStr)._id || JSON.parse(userStr).id) : 'guest';
                                                socket.emit('player_ready', { roomId, isReady, dream: newDream, token, userId });
                                            }}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 appearance-none outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all text-lg font-medium text-slate-200 shadow-inner"
                                            disabled={isReady}
                                        >
                                            {DREAMS.map(d => (
                                                <option key={d.id} value={d.name}>
                                                    {d.name} (${d.cost.toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={toggleReady}
                                className={`w-full py-6 rounded-2xl font-bold text-lg transition-all transform shadow-xl border ${isReady ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 border-transparent text-white hover:brightness-110 shadow-emerald-500/20 hover:scale-[1.01]'}`}
                            >
                                {isReady ? '✖ Отменить готовность' : '✨ Я Готов!'}
                            </button>
                        </div>
                    </div>
                </div>

                {playerToKick && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-800 p-8 rounded-2xl max-w-sm w-full border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold mb-4 text-white">Удалить игрока?</h3>
                            <p className="text-slate-400 mb-6">Вы уверены, что хотите исключить этого игрока из комнаты?</p>
                            <div className="flex gap-4">
                                <button onClick={() => setPlayerToKick(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors">Отмена</button>
                                <button onClick={confirmKick} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium shadow-lg shadow-red-500/20 transition-colors">Удалить</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function GameRoom() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка игры...</div>}>
            <GameContent />
        </Suspense>
    );
}


