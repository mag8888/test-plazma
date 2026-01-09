"use client";

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { socket } from '../socket';
import GameBoard from './board';
import { DREAMS } from '../lib/dreams';
import { useTelegram } from '../../components/TelegramProvider';
import { ReadyModal } from './ReadyModal';
import { ErrorBoundary } from './ErrorBoundary';
import { VoiceRoom } from './VoiceRoom';
import { VoiceControls } from './VoiceControls';

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
    isTraining?: boolean;
}

const TutorialTip: React.FC<{ text: string, position?: string, arrow?: string, colorClass?: string, arrowColorClass?: string }> = ({
    text,
    position = "top-full mt-4",
    arrow = "top-[-6px] border-t-0",
    colorClass = "bg-emerald-500 text-white",
    arrowColorClass = "border-b-emerald-500"
}) => (
    <div className={`absolute ${position} left-1/2 -translate-x-1/2 z-[100] w-max max-w-[200px] pointer-events-none`}>
        <div className={`${colorClass} text-xs font-bold px-3 py-2 rounded-xl animate-pulse shadow-lg shadow-black/20 relative text-center`}>
            {text}
            <div className={`absolute ${arrow} left-1/2 -translate-x-1/2 border-8 border-transparent ${arrowColorClass}`}></div>
        </div>
    </div>
);



export default function GameRoom() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка игры...</div>}>
            <GameContent />
        </Suspense>
    );
}

function GameContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get('id') as string;
    const isTutorialOverride = searchParams.get('tutorial') === 'true';
    const router = useRouter();
    const { user } = useTelegram(); // Use Context

    const [room, setRoom] = useState<Room | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState('');
    const [dream, setDream] = useState(DREAMS[0].name);
    const [token, setToken] = useState<string>('🦊');
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState(''); // Specific name for this game

    const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);

    const [isKickModalOpen, setIsKickModalOpen] = useState(false);
    const [playerToKick, setPlayerToKick] = useState<string | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    const dreamRef = useRef(dream);
    const tokenRef = useRef(token);

    useEffect(() => {
        dreamRef.current = dream;
    }, [dream]);

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);


    const [hasSelectedToken, setHasSelectedToken] = useState(false);
    const [hasSelectedDream, setHasSelectedDream] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // Local user speaking
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]); // All active speakers IDs

    // Initial Join & Socket Setup
    useEffect(() => {
        if (!roomId || !user) return; // Wait for user

        // Identity Validation
        // PREFERENCE RESTORATION
        const prefName = user.preferences?.displayName || user.firstName || user.username || 'Guest';
        const prefDream = user.preferences?.dream || DREAMS[0].name;
        const prefToken = user.preferences?.token || '🦊';

        setDisplayName(prefName);
        setDream(prefDream);
        setToken(prefToken); // Backend handles collision, UI handles selection

        // Auto-fulfill steps if preferences exist? 
        // For tutorial, better to force interaction or check if they changed it?
        // Let's assume for tutorial we start fresh or treat loaded prefs as "not yet selected in this session" to guide them?
        // Actually the user wants 1 -> 2 -> 3. 
        // If they have a token pre-selected, maybe we should consider step 1 done?
        // But the prompt implies "Choice" is needed. 
        // Let's start with false to force the "Look here -> Click" flow.

        const userId = user._id || user.id;

        setMyUserId(userId);

        const joinGame = (retries = 0) => {
            console.log(`Joining room... (Attempt ${retries + 1})`, { roomId, playerName: prefName, userId });
            socket.emit('join_room', {
                roomId,
                playerName: prefName,
                userId,
                token: prefToken,
                dream: prefDream
            }, (response: any) => {
                if (!response.success) {
                    console.error("Join failed:", response.error);

                    // Retry logic for "Room not found" or other transient errors
                    if (retries < 3) {
                        console.log(`Retrying join in 1s... (${retries + 1}/3)`);
                        setTimeout(() => joinGame(retries + 1), 1000);
                        return;
                    }

                    setError(response.error);
                    if (response.error === "Room not found") {
                        console.error("Room not found error received for ID:", roomId);
                        // Disable auto-kick for debugging
                        // setTimeout(() => router.push('/lobby'), 3000); 
                    }
                } else {
                    setError(''); // Clear error on success
                }
            });
        };

        if (socket.connected) {
            joinGame();
        } else {
            socket.connect();
        }

        const onConnect = () => {
            joinGame();
        };

        const handleConnect = () => {
            console.log("Reconnected. Re-joining...");
            joinGame();
        };

        socket.on('connect', handleConnect);

        socket.on('room_state_updated', (updatedRoom: Room) => {
            console.log("Room updated:", updatedRoom);
            setRoom(updatedRoom);
            const me = updatedRoom.players.find(p => String(p.userId) === String(userId));
            if (me) {
                setIsReady(me.isReady);

                // FORCE SYNC: Trust Server State for Token & Dream
                // If the server assigned us a different token (collision resolution), we must use it.
                // We use Refs to check current state to avoid unnecessary updates/renders if already matching.

                if (me.token && me.token !== tokenRef.current) {
                    console.log(`[Sync] Token mismatch. Local: ${tokenRef.current}, Server: ${me.token}. Syncing to Server.`);
                    setToken(me.token);
                }

                if (me.dream && me.dream !== dreamRef.current) {
                    // Only sync dream if we haven't selected one? Or always? 
                    // Always sync for consistency.
                    setDream(me.dream);
                }
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
    }, [roomId, router, user]);

    const handleReadyClick = () => {
        if (!isReady) {
            setIsReadyModalOpen(true);
        } else {
            // Cancel Ready immediately
            toggleReady(false, displayName);
        }
    };

    const confirmReady = (finalName: string) => {
        setDisplayName(finalName);
        toggleReady(true, finalName);
        setIsReadyModalOpen(false);
    };

    const toggleReady = (readyState: boolean, finalName?: string) => {
        if (!myUserId) return;
        // Construct updated player object if needed, but backend takes params
        socket.emit('player_ready', {
            roomId,
            isReady: readyState,
            dream,
            token,
            userId: myUserId,
            name: finalName // Pass updated name
        }, (res: any) => {
            if (!res.success) alert(res.error);
        });
    };

    const updateSettings = (newToken: string, newDream: string) => {
        if (!myUserId) return;
        // Emit ready=false to just update settings without locking in
        socket.emit('player_ready', {
            roomId,
            isReady: false,
            dream: newDream,
            token: newToken,
            userId: myUserId
        }, (res: any) => {
            if (!res.success) console.error("Failed to update settings:", res.error);
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

    const [isAddingBot, setIsAddingBot] = useState(false);

    const handleAddBot = (difficulty: 'easy' | 'hard') => {
        if (!myUserId || isAddingBot) return;
        setIsAddingBot(true);
        socket.emit('add_bot', { roomId, difficulty, userId: myUserId }, (res: any) => {
            setIsAddingBot(false);
            if (!res.success) {
                alert("Ошибка при добавлении бота: " + res.error);
            }
        });
    };

    const isHost = !!(room && myUserId && String(room.creatorId) === String(myUserId));

    if (!room) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-4 text-center">
            <div className="text-xl text-slate-400 animate-pulse">Загрузка данных комнаты...</div>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center gap-4 max-w-sm">
                    <div className="text-red-400 font-bold text-lg">🚫 Ошибка</div>
                    <div className="text-slate-300">{error}</div>
                    <button
                        onClick={() => router.push('/lobby')}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-700 w-full"
                    >
                        ⬅ Вернуться в Лобби
                    </button>
                </div>
            )}
        </div>
    );

    const isRoomTraining = room?.isTraining ?? false;
    const effectiveIsTraining = isRoomTraining || isTutorialOverride;

    // TUTORIAL STEPS LOGIC
    // 1. Token (If no token interactions yet)
    // 2. Dream (If token done, no dream interaction yet)
    // 3. Ready (If token & dream done, not ready)
    // 4. Add Bot (If ready, < 2 players)
    // 5. Start Game (If ready, >= 2 players)

    // We assume 'hasSelectedToken' becomes true on click.
    // We assume 'hasSelectedDream' becomes true on change.

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
        return (
            <ErrorBoundary name="GameBoard">
                <GameBoard
                    roomId={roomId}
                    userId={myUserId}
                    initialState={initialBoardState}
                    isHost={isHost}
                    isTutorial={effectiveIsTraining}
                    username={user?.first_name || user?.username || 'Player'}
                />
            </ErrorBoundary>
        );
    }

    const userIdString = user?.id?.toString() || user?.telegram_id?.toString() || '';

    return (
        <VoiceRoom
            roomId={roomId}
            userId={userIdString}
            username={user?.first_name || 'Player'}
            onSpeakingChanged={setIsSpeaking}
            onActiveSpeakersChange={setActiveSpeakers}
            players={room.players}
            onActiveSpeakersChange={setActiveSpeakers}
            players={room.players}
        >
            {(isConnected: boolean) => (
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
                                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest pl-1">Room #{room.id} | T: {String(effectiveIsTraining)}</span>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-20">
                            {/* LEFT COLUMN: Player List */}
                            <div className="lg:col-span-5 space-y-4">
                                {/* Voice Controls Block */}
                                {isConnected && (
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Голосовой чат
                                            </span>
                                        </div>
                                        <div className="flex justify-center">
                                            <VoiceControls onSpeakingChanged={setIsSpeaking} players={room.players} />
                                        </div>
                                    </div>
                                )}

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
                                                {/* Speaking Indicator Ring */}
                                                {activeSpeakers.includes(player.userId || player.id) && (
                                                    <>
                                                        <div className="absolute top-4 left-4 w-10 h-10 rounded-full border-2 border-green-500 animate-ping opacity-75 pointer-events-none"></div>
                                                        <div className="absolute top-4 left-4 w-10 h-10 rounded-full border border-green-400 opacity-20 animate-pulse pointer-events-none"></div>
                                                    </>
                                                )}
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
                                            <div key={`empty-${i}`} className="p-4 rounded-2xl border border-white/5 border-dashed bg-transparent flex items-center justify-center text-slate-600 text-sm italic relative group/empty">
                                                {isHost ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className={`${effectiveIsTraining ? 'hidden' : 'group-hover/empty:hidden'}`}>Ожидание игрока...</span>
                                                        <div className={`${effectiveIsTraining ? 'flex' : 'hidden group-hover/empty:flex'} gap-2`}>
                                                            <button
                                                                onClick={() => handleAddBot('easy')}
                                                                disabled={isAddingBot}
                                                                className={`px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold transition-colors ${isAddingBot ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500 hover:text-white'}`}
                                                            >
                                                                + Easy Bot
                                                            </button>
                                                            {/* Step 4: Add Bot */}
                                                            {effectiveIsTraining && isReady && room.players.length < 2 && room.players.length === 1 && (
                                                                <div className="absolute top-12 left-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-2 rounded-xl animate-pulse shadow-lg z-50 pointer-events-none max-w-[180px] text-center leading-tight">
                                                                    4. Пригласите друга или выберите бота для старта игры 👆
                                                                    <div className="absolute top-[-4px] left-4 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-emerald-500"></div>
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => handleAddBot('hard')}
                                                                disabled={isAddingBot}
                                                                className={`px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold transition-colors ${isAddingBot ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500 hover:text-white'}`}
                                                            >
                                                                + Hard Bot
                                                            </button>
                                                        </div>
                                                        <span className={`text-[10px] text-slate-700 font-mono mt-1 ${effectiveIsTraining ? 'hidden' : 'group-hover/empty:hidden'}`}>+ Добавить бота</span>
                                                    </div>
                                                ) : (
                                                    "Ожидание игрока..."
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {isHost && (
                                    <button
                                        onClick={startGame}
                                        disabled={room.players.length < 2 || !room.players.every(p => p.isReady)}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-6 rounded-3xl font-black text-xl shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none border border-white/10 relative group"
                                    >
                                        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 blur-md"></div>
                                        </div>
                                        <span className="relative flex items-center justify-center gap-3">
                                            🚀 ЗАПУСТИТЬ ИГРУ
                                            {/* Step 5: Start Game */}
                                            {effectiveIsTraining && isReady && room.players.length >= 2 && (
                                                <div className="absolute bottom-full mb-2 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl animate-pulse shadow-lg z-50 whitespace-nowrap pointer-events-none">
                                                    5. Запустите игру! 🚀
                                                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-500"></div>
                                                </div>
                                            )}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Settings */}
                            <div className="lg:col-span-7">
                                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl h-full flex flex-col relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="mb-8 relative z-10">
                                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-2">Настройка персонажа</h3>
                                        <p className="text-slate-400 text-sm">Выберите фишку и определите свою мечту</p>
                                    </div>
                                    <div className="flex-1 relative z-10">
                                        <div className={`mb-8 p-4 rounded-3xl transition-all duration-500 ${!token ? 'bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-pulse-slow' : ''}`}>
                                            <label className={`text-xs uppercase font-bold mb-4 block tracking-wider transition-colors ${!token ? 'text-indigo-400' : 'text-slate-500'}`}>ВЫБЕРИТЕ ФИШКУ</label>
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
                                                                    setHasSelectedToken(true); // Tutorial step 1 complete
                                                                    setToken(t);
                                                                    updateSettings(t, dream);
                                                                }
                                                            }}
                                                            className={`aspect-square rounded-2xl flex items-center justify-center text-4xl relative transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-400 ring-2 ring-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)] scale-110' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 border'} ${(isTaken || isReady) ? 'opacity-50 grayscale cursor-not-allowed scale-90' : 'cursor-pointer'} ${isSelected && isSpeaking ? 'ring-4 ring-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-125' : ''}`} // [NEW] Pulse Effect
                                                        >
                                                            <span className={`drop-shadow-lg ${isSelected ? 'animate-bounce-subtle' : ''}`}>{t}</span>
                                                            {isSelected && <div className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center"><div className="absolute inset-0 bg-blue-500 rounded-full blur-[2px]"></div><div className="relative bg-blue-500 bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900 shadow-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div></div>}
                                                            {isTaken && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-[1px] bg-slate-500/50 rotate-45 transform scale-150"></div></div>}
                                                            {/* Step 1: Token Hint */}
                                                            {effectiveIsTraining && !hasSelectedToken && !isReady && t === '🦊' && (
                                                                <TutorialTip text="1. Выберите фишку" position="bottom-full mb-2" arrow="bottom-[-6px] border-t-emerald-500 border-b-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className={`mb-8 p-4 rounded-3xl transition-all duration-500 ${token ? 'bg-purple-500/10 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] animate-pulse-slow' : ''}`}>
                                            <label className={`text-xs uppercase font-bold mb-2 block tracking-wider transition-colors ${token ? 'text-purple-400' : 'text-slate-500'}`}>
                                                Ваша Мечта
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={dream}
                                                    onChange={(e) => {
                                                        setHasSelectedDream(true); // Tutorial step 2 complete
                                                        const newDream = e.target.value;
                                                        setDream(newDream);
                                                        updateSettings(token, newDream);
                                                    }}
                                                    onClick={() => {
                                                        // Optional: if opening dropdown counts as "interaction", or we wait for change.
                                                        // Let's rely on Valid change for now? Or wait, if they start with default dream,
                                                        // they might never change it.
                                                        // Let's set it to true on Click too, just in case they like the default.
                                                        // Better: set it to true if they interact at all.
                                                        setHasSelectedDream(true);
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
                                                {/* Step 2: Dream Hint */}
                                                {effectiveIsTraining && hasSelectedToken && !hasSelectedDream && !isReady && (
                                                    <TutorialTip
                                                        text="2. Выберите мечту 👇"
                                                        position="top-full mt-4"
                                                        colorClass="bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-amber-400/50"
                                                        arrowColorClass="border-b-orange-600"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleReadyClick}
                                        className={`w-full py-6 rounded-2xl font-bold text-lg transition-all transform shadow-xl border relative ${isReady ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 border-transparent text-white hover:brightness-110 shadow-emerald-500/20 hover:scale-[1.01]'}`}
                                    >
                                        {isReady ? '✖ Отменить готовность' : '✨ Я Готов!'}
                                        {/* Step 3: Ready Hint */}
                                        {effectiveIsTraining && hasSelectedToken && hasSelectedDream && !isReady && (
                                            <TutorialTip
                                                text="3. Нажмите Готов! ✨"
                                                position="bottom-full mb-2"
                                                arrow="bottom-[-6px] border-t-amber-500 border-b-0"
                                                colorClass="bg-amber-500 text-white"
                                                arrowColorClass="border-t-amber-500"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isReadyModalOpen && (
                            <ReadyModal
                                token={token}
                                dream={dream}
                                initialName={displayName}
                                onConfirm={confirmReady}
                                onCancel={() => setIsReadyModalOpen(false)}
                            />
                        )}

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
                </div>
    )
}
        </VoiceRoom >
    );
}



