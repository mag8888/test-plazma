"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';
import confetti from 'canvas-confetti';
import { BoardVisualizer } from './BoardVisualizer';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TextChat } from './TextChat';
import { sfx } from './SoundManager';

interface BoardProps {
    roomId: string;
    userId?: string | null;
    initialState: any;
    isHost?: boolean;
}

// ... (existing code top)

// (At line 511, remove duplicate me/isMyTurn/currentPlayer if I moved them up? No, I only added `me` up top. But wait, `isMyTurn` etc depend on `me`.)
// Actually, I should probably keep `me` at line 511 where it was, just Update it.
// My previous tool call injected `me` at line 108? 
// Let's Undo line 108 addition if possible or just remove it, and Update line 511 properly.
// Wait, I can't undo. I will Update Line 511 to be empty (or just the new logic) and Remove the one at line 108 if it exists.
// Actually, `me` is used in `useEffects`? No, it's used in Render.
// Ideally `me` is derived near top is fine.
// But `isMyTurn` etc are at 512.
// Let's just update the ONE place it should be.
// I will target the `BoardProps` specifically first to fix the build error.


interface PlayerState {
    id: string;
    name: string;
    cash: number;
    cashflow: number;
    income: number;
    expenses: number;
    loanDebt: number;
    position: number;
    isFastTrack: boolean;
    childrenCount: number;
    childCost: number;
    salary: number;
    passiveIncome: number;
    token?: string;
    photo_url?: string; // Avatar URL
    professionName?: string;
    isBankrupted?: boolean;
    canEnterFastTrack?: boolean;
    hasWon?: boolean;
}

import { BankModal } from './BankModal';
import { TransferModal } from './TransferModal';
import { RulesModal } from './RulesModal';
import { RankingsModal } from './RankingsModal';
import { MenuModal } from './MenuModal';
import { ExitToFastTrackModal } from './ExitToFastTrackModal';

// Helper for Cash Animation
const CashChangeIndicator = ({ currentCash }: { currentCash: number }) => {
    const [diff, setDiff] = useState<number | null>(null);
    const [visible, setVisible] = useState(false);
    const prevCash = useRef(currentCash);

    useEffect(() => {
        if (prevCash.current !== currentCash) {
            const difference = currentCash - prevCash.current;
            setDiff(difference);
            setVisible(true);
            prevCash.current = currentCash;

            const timer = setTimeout(() => setVisible(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentCash]);

    if (!visible || !diff) return null;

    return (
        <div className={`absolute top-0 right-0 transform -translate-y-full font-bold text-lg animate-out fade-out slide-out-to-top-4 duration-2000 pointer-events-none whitespace-nowrap z-50
            ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {diff > 0 ? '+' : ''}${Math.abs(diff).toLocaleString()}
        </div>
    );
};

// ... (existing interfaces)

const getAvatarColor = (id: string) => {
    const colors = [
        'from-red-500 to-orange-500',
        'from-orange-500 to-amber-500',
        'from-amber-500 to-yellow-500',
        'from-yellow-500 to-lime-500',
        'from-lime-500 to-green-500',
        'from-green-500 to-emerald-500',
        'from-emerald-500 to-teal-500',
        'from-teal-500 to-cyan-500',
        'from-cyan-500 to-sky-500',
        'from-sky-500 to-blue-500',
        'from-blue-500 to-indigo-500',
        'from-indigo-500 to-violet-500',
        'from-violet-500 to-purple-500',
        'from-purple-500 to-fuchsia-500',
        'from-fuchsia-500 to-pink-500',
        'from-pink-500 to-rose-500',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '?';
    return name.substring(0, 2).toUpperCase();
};

export default function GameBoard({ roomId, userId, initialState, isHost }: BoardProps) {
    const router = useRouter();
    const [state, setState] = useState(initialState);
    const [showBank, setShowBank] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [transferAssetItem, setTransferAssetItem] = useState<{ item: any, index: number } | null>(null);
    const [stockQty, setStockQty] = useState(1);

    // Mobile Drawer State
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileView, setMobileView] = useState<'stats' | 'players'>('stats');

    // Sound Settings
    const [volume, setVolume] = useState(0.5);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showFastTrackModal, setShowFastTrackModal] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Chat State
    const [chatMessage, setChatMessage] = useState('');



    useEffect(() => {
        setVolume(sfx.getVolume());
        setIsMuted(sfx.getMute());
    }, []);

    const handleVolumeChange = (val: number) => {
        setVolume(val);
        sfx.setVolume(val);
    };

    const toggleMute = () => {
        const newVal = !isMuted;
        setIsMuted(newVal);
        sfx.setMute(newVal);
    };

    // Zoom State
    const [zoom, setZoom] = useState(1.0);

    // Animation & Popup States
    const [showDice, setShowDice] = useState(false);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [diceBreakdown, setDiceBreakdown] = useState<string | null>(null);
    const [mlmMessage, setMlmMessage] = useState<string | null>(null);
    const [pendingState, setPendingState] = useState<any | null>(null);
    const [squareInfo, setSquareInfo] = useState<any>(null);
    const [babyNotification, setBabyNotification] = useState<string | null>(null);
    const [turnNotification, setTurnNotification] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Host Menu State
    const [selectedPlayerForMenu, setSelectedPlayerForMenu] = useState<PlayerState | null>(null);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(120);

    // Local state to track if player has rolled this turn
    const [hasRolled, setHasRolled] = useState(false);

    // Reset hasRolled when turn changes or Phase resets to ROLL
    useEffect(() => {
        setHasRolled(false);
    }, [state.currentPlayerIndex]);

    useEffect(() => {
        if (state.phase === 'ROLL') {
            setHasRolled(false);
        }
    }, [state.phase]);

    useEffect(() => {
        if (state.lastEvent?.type === 'BABY_BORN') {
            sfx.play('baby');
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FF69B4', '#87CEEB', '#FFD700', '#ffffff']
            });
            setBabyNotification(`👶 Поздравляем! В семье ${state.lastEvent.payload?.player} пополнение!`);

            // Auto End Turn Logic (3s delay)
            const currentPlayer = state.players[state.currentPlayerIndex];
            if (currentPlayer?.id === socket.id) {
                setTimeout(() => {
                    setBabyNotification(null);
                    socket.emit('end_turn', { roomId });
                }, 3000);
            } else {
                setTimeout(() => setBabyNotification(null), 3000);
            }

        } else if (state.lastEvent?.type === 'BABY_MISSED') {
            setBabyNotification(`🎲 Семья ${state.lastEvent.payload?.player} пока не растет.`);

            // Auto End Turn Logic (3s delay)
            const currentPlayer = state.players[state.currentPlayerIndex];
            if (currentPlayer?.id === socket.id) {
                setTimeout(() => {
                    setBabyNotification(null);
                    socket.emit('end_turn', { roomId });
                }, 3000);
            } else {
                setTimeout(() => setBabyNotification(null), 3000);
            }
        } else if (state.lastEvent?.type === 'LOTTERY_WIN') {
            sfx.play('victory');
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#00FF00', '#ffffff']
            });
            // Construct a "Square-like" object to show in the info modal
            const wonCard = state.lastEvent.payload.card;
            setSquareInfo({
                ...wonCard,
                name: `🏆 WON: ${wonCard.title}`,
                description: `Вы выиграли этот актив в лотерею! ${wonCard.description || ''}`,
                cost: 0 // Show as free? Or show original value? UI shows cost as RED. Maybe show Cashflow only?
                // If I set cost to null, it won't show "Cost -$X".
                // If I set cashflow, it will show GREEN.
            });
            // No timeout to close, let user close it.
        } else if (state.lastEvent?.type === 'TURN_SKIPPED') {
            setTurnNotification(`🚫 ${state.lastEvent.payload?.player} пропускает ход! (Осталось: ${state.lastEvent.payload?.remaining})`);
            setTimeout(() => setTurnNotification(null), 3000);

            // Critical Fix: If opponent skipped and turn passed back to me, reset local rolled state
            if (state.players[state.currentPlayerIndex].id === socket.id) {
                setHasRolled(false);
            }
        } else if (state.lastEvent?.type === 'WINNER') {
            setTurnNotification(`🏆 ${state.lastEvent.payload?.player} ПОБЕДИЛ!`);
            sfx.play('win');

            // Fireworks
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [state.lastEvent]);

    const handleRoll = (diceCount?: number) => {
        sfx.play('roll');
        socket.emit('roll_dice', { roomId, diceCount });
        setHasRolled(true);
    };

    const handleBuy = () => {
        if (state.currentCard?.outcomeDescription) {
            alert(state.currentCard.outcomeDescription);
        }
        socket.emit('buy_asset', { roomId });
    };

    // Timer Sync & Countdown Logic
    useEffect(() => {
        const updateTimer = () => {
            if (state.turnExpiresAt) {
                const diff = Math.max(0, Math.ceil((state.turnExpiresAt - Date.now()) / 1000));
                setTimeLeft(diff);
            } else {
                // Fallback if not set (legacy or error)
                if (state.currentTurnTime) setTimeLeft(state.currentTurnTime);
            }
        };

        updateTimer(); // Initial
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [state.turnExpiresAt, state.currentTurnTime]);

    // Track rolling state to prevent efficient handling of 'state_updated' race conditions
    const isRollingRef = useRef(false);

    const [showRankings, setShowRankings] = useState(false);
    const [rankings, setRankings] = useState<any[]>([]);

    useEffect(() => {
        socket.on('dice_rolled', (data) => {
            if (data.type === 'MLM') {
                setDiceValue(data.roll);
                setShowDice(true);
                setMlmMessage(data.message);

                setTimeout(() => {
                    setShowDice(false);
                    setMlmMessage(null);
                    if (data.state) setState(data.state);
                }, 4000);
                return;
            }

            // Standard Roll
            isRollingRef.current = true; // Block external updates
            setDiceValue(data.roll);

            if (data.diceValues && data.diceValues.length > 1) {
                setDiceBreakdown(data.diceValues.join(' + '));
            } else {
                setDiceBreakdown(null);
            }

            setShowDice(true);
            setIsAnimating(true);

            const DICE_DURATION = 2000;
            const BUFFER = 1200;

            const moveDuration = (data.roll || 0) * 500;

            setTimeout(() => {
                setShowDice(false);
                isRollingRef.current = false;

                setTimeout(() => {
                    setState(data.state);
                }, 500);

                setTimeout(() => {
                    const currentPlayer = data.state.players[data.state.currentPlayerIndex];
                    if (!currentPlayer) return;

                    const squareIndex = currentPlayer.position;
                    // Check if player is on fast track for square finding
                    let square;
                    if (currentPlayer.isFastTrack) {
                        square = data.state.board[24 + squareIndex]; // Logic? Backend sends global pos?
                        // Actually engine handles pos. If isFastTrack, position is relative to Outer Track?
                        // Visualizer handles mapping.
                        // For popup info, we might need logic.
                        // But Fast Track squares are simple usually.
                    } else {
                        square = data.state.board.find((s: any) => s.index === squareIndex);
                    }

                    // Show popup only if phase allows
                    // Adjusted for Fast Track compat (might need tweaking)
                    if (square && !['roll_dice'].includes(data.state.phase)) {
                        if (!['EXPENSE', 'MARKET', 'CHARITY', 'DEAL'].includes(square.type)) {
                            setSquareInfo(square);
                        }
                    }
                    setIsAnimating(false);
                }, moveDuration + BUFFER);
            }, DICE_DURATION);
        });

        socket.on('game_over', (data) => {
            setState(data.state);
            setRankings(data.rankings);
            setShowRankings(true);
            setIsAnimating(false);
            setShowDice(false);
            sfx.play('victory');
        });

        socket.on('state_updated', (data) => {
            if (!isRollingRef.current) {
                // Check for Payday or specific events in log?
                // Hard to detect EXACT events without delta, but we can check if cashflow increased significantly?
                // Better: rely on 'lastEvent' if available.
                // Assuming `state.lastEvent` is reliable.

                // My Turn Check
                const oldIdx = state?.currentPlayerIndex;
                const newIdx = data.state?.currentPlayerIndex;
                const meInList = data.state?.players?.findIndex((p: any) => p.id === socket.id);

                // If turn passed TO me
                if (typeof oldIdx === 'number' && typeof newIdx === 'number' && oldIdx !== newIdx && newIdx === meInList) {
                    sfx.play('turn');
                }

                if (data.state.lastEvent?.type === 'PAYDAY') {
                    sfx.play('payday');
                }
                if (data.state.lastEvent?.type === 'DOWNSIZED') {
                    sfx.play('fired');
                }
                if (data.state.lastEvent?.type === 'FAST_TRACK') sfx.play('fasttrack');
                if (data.state.lastEvent?.type === 'STOCK') sfx.play('stock');

                setState(data.state);
            }
        });

        socket.on('turn_ended', (data) => {
            isRollingRef.current = false;

            // My Turn Check
            const meInList = data.state?.players?.findIndex((p: any) => p.id === socket.id);
            if (data.state?.currentPlayerIndex === meInList) {
                sfx.play('turn');
            }

            setState(data.state);
            setSquareInfo(null);
        });

        socket.on('game_started', (data) => {
            isRollingRef.current = false;
            setState(data.state);
            sfx.play('start');
        });

        return () => {
            socket.off('dice_rolled');
            socket.off('game_over');
            socket.off('turn_ended');
            socket.off('state_updated');
            socket.off('game_started');
        };
    }, []);


    // Duplicates removed - these are now handled via engineRef or were redefined at the top level

    const handleBuyStock = () => {
        socket.emit('buy_asset', { roomId, quantity: stockQty });
        setStockQty(1);
    };

    const handleSellStock = () => {
        socket.emit('sell_stock', { roomId, quantity: stockQty });
        setStockQty(1);
    };

    const handleResolveOpportunity = (choice: string) => {
        if (choice === 'buy') sfx.play('stock');
        socket.emit('resolve_opportunity', { roomId: state.roomId, choice });
    };

    const handleTransferFunds = (toId: string, amount: number) => {
        sfx.play('transfer');
        socket.emit('transfer_funds', { roomId: state.roomId, toId, amount });
    };
    const handleLoan = (amount: number) => socket.emit('take_loan', { roomId, amount });
    const handleRepay = (amount: number) => socket.emit('repay_loan', { roomId, amount });
    const handleEndTurn = () => socket.emit('end_turn', { roomId });

    const handleSendChat = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatMessage.trim()) return;
        socket.emit('chat_message', { roomId, message: chatMessage });
        setChatMessage('');
    };

    const handleTransferAsset = (toId: string, quantity?: number) => {
        if (!transferAssetItem) return;
        socket.emit('transfer_asset', { roomId, toPlayerId: toId, assetIndex: transferAssetItem.index, quantity });
        setTransferAssetItem(null);
    };

    const handleDismissCard = () => {
        socket.emit('dismiss_card', { roomId });
    };

    const handleExit = () => {
        if (window.confirm("Вы уверены, что хотите выйти? Если вы организатор, комната будет удалена.")) {
            socket.emit('leave_room', { roomId });
            router.push('/lobby');
        }
    };

    const handleEnterFastTrack = () => {
        if (window.confirm("Do you want to enter the Fast Track? Logic: Reset Cash, Passive Income x10, Debt Free!")) {
            socket.emit('enter_fast_track', { roomId, userId: me.id });
        }
    };

    const handleEndGame = () => {
        if (window.confirm("Вы уверены, что хотите принудительно завершить игру и подсчитать рейтинги?")) {
            socket.emit('host_end_game', { roomId, userId: me.userId || me.id });
        }
    };

    const handleKickPlayer = (playerId: string) => {
        if (!window.confirm("Вы действительно хотите удалить этого игрока из игры?")) return;
        socket.emit('kick_player', { roomId, playerId, userId: me.userId || me.id });
    };

    const handleForceSkip = () => {
        if (!window.confirm("Принудительно завершить ход текущего игрока?")) return;
        socket.emit('host_skip_turn', { roomId, userId: me.userId || me.id });
    };

    const me = state.players.find((p: any) => p.id === socket.id || (userId && p.userId === userId)) || initialState.players[0];
    const isMyTurn = state.players[state.currentPlayerIndex]?.id === me?.id;
    const currentTurnPlayer = state.players[state.currentPlayerIndex];
    const currentPlayer = currentTurnPlayer; // Alias for existing code
    const showExitButton = !me.isFastTrack;

    // Calculate total asset yield
    const totalAssetYield = me.assets?.reduce((sum: number, a: any) => sum + (a.cashflow || 0), 0) || 0;

    if (!currentTurnPlayer) return <div>Loading...</div>; // Safety check

    // Animation State for Visualizer
    const [animatingPos, setAnimatingPos] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!state.players) return;
        const newPosMap: Record<string, number> = {};
        state.players.forEach((p: any) => {
            newPosMap[p.id] = animatingPos[p.id] ?? p.position;
        });
        setAnimatingPos(prev => ({ ...prev, ...newPosMap }));
    }, [state.players]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimatingPos(prev => {
                const next = { ...prev };
                let changed = false;

                state.players.forEach((p: PlayerState) => {
                    const currentDisplayPos = prev[p.id] ?? p.position;

                    if (currentDisplayPos !== p.position) {
                        const max = p.isFastTrack ? 48 : 24;
                        // Move one step forward
                        // NOTE: This handles forward movement. If a player was reset back (e.g. 5 -> 0), 
                        // they will walk 5->6...->23->0. This is usually desired visual effect.
                        next[p.id] = (currentDisplayPos + 1) % max;
                        changed = true;
                    }
                });

                return changed ? next : prev;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [state.players]);

    // Format MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
    };

    return (
        <div className="h-[100dvh] max-h-[100dvh] bg-[#0f172a] text-white font-sans flex flex-col overflow-hidden relative">



            {showRankings && (
                <RankingsModal
                    rankings={rankings}
                    onExit={() => {
                        setShowRankings(false); // Maybe leave?
                        router.push('/lobby');
                    }}
                />
            )}

            {showDice && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center animate-bounce">
                        <div className="text-9xl filter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-spin-slow">🎲</div>
                        {diceValue && (
                            <div className="mt-8 flex flex-col items-center">
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 animate-pulse">
                                    {diceValue}
                                </div>
                                {diceBreakdown && (
                                    <div className="text-2xl font-bold text-white mt-2 bg-slate-800/60 px-4 py-1 rounded-full border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                                        {diceBreakdown}
                                    </div>
                                )}
                            </div>
                        )}
                        {mlmMessage && (
                            <div className="mt-4 bg-green-500/20 text-green-400 px-6 py-3 rounded-xl border border-green-500/50 text-xl font-bold animate-in fade-in zoom-in duration-300">
                                {mlmMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 📱 MOBILE MENU OVERLAY */}
            {
                showMobileMenu && (
                    <div className="lg:hidden absolute inset-0 z-[60] bg-[#0f172a]/95 backdrop-blur-xl p-4 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-left duration-300">
                        {/* Profile Section */}
                        <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg relative">
                            {/* CLOSE BUTTON */}
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="absolute top-4 right-4 p-2 -mr-2 -mt-2 text-slate-500 hover:text-white transition-colors disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-4xl">👷</span>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Профессия</span>
                                    <div className="text-xl font-bold text-white">{me.professionName || 'Выбор...'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Баланс</div>
                                    <div className="font-mono text-xl text-green-400 font-bold">${me.cash?.toLocaleString()}</div>
                                </div>
                                <div className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Кредит</div>
                                    <div className="font-mono text-xl text-red-400 font-bold">${me.loanDebt?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800/50 mb-3">
                                <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Пассивный доход</div>
                                    <div className="font-mono text-green-400 font-medium">+${me.passiveIncome?.toLocaleString() || 0}</div>
                                </div>
                                <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Денежный поток</div>
                                    <div className="font-mono text-green-400 font-medium">+${me.cashflow?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Доход</div>
                                    <div className="font-mono text-slate-300 font-medium">${me.income?.toLocaleString()}</div>
                                </div>
                                <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Расходы</div>
                                    <div className="font-mono text-slate-300 font-medium">${me.expenses?.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Assets Section */}
                        <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2"><span>🏠</span> Ваши Активы</span>
                                <span className="font-mono text-green-400">+${totalAssetYield}</span>
                            </h3>
                            {me.assets?.length > 0 ? (
                                <div className="space-y-2">
                                    {me.assets.map((a: any, i: number) => (
                                        <div
                                            key={i}
                                            onClick={() => setTransferAssetItem({ item: a, index: i })}
                                            className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 cursor-pointer hover:border-slate-500 active:scale-[0.98] transition-all"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 font-medium">
                                                    {a.title}
                                                </span>
                                                {a.quantity > 0 && (
                                                    <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                                        <span className="bg-slate-800 px-1.5 rounded">{a.quantity} шт</span>
                                                        {a.cost && <span className="text-slate-500">Позиция: ${(a.cost * a.quantity).toLocaleString()}</span>}
                                                    </div>
                                                )}
                                                <span className="font-mono text-green-400 font-bold text-[10px]">+$ {a.cashflow}</span>
                                            </div>
                                            <button
                                                onClick={() => setTransferAssetItem({ item: a, index: i })}
                                                className="ml-2 p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-500 hover:text-blue-400"
                                                title="Передать актив"
                                            >
                                                ➡️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-xs text-slate-600 text-center py-4 italic">Нет активов</div>}
                        </div>

                        {/* Players List Section */}
                        <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                                <span>👥</span> Игроки
                            </h3>
                            <div className="space-y-2">
                                {state.players.map((p: any) => (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            console.log("Player clicked:", p.name, p.id);
                                            setSelectedPlayerForMenu(p);
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:border-slate-500 active:scale-[0.98]
                                            ${p.id === currentPlayer.id ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-slate-900/30 border-slate-800/50'} 
                                            ${p.hasWon ? 'ring-2 ring-yellow-500' : ''}
                                            ${p.isBankrupted ? 'opacity-50 grayscale' : ''}
                                        `}
                                    >
                                        <div className={`text-lg w-10 h-10 flex items-center justify-center rounded-full border-2 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)] text-white font-bold bg-gradient-to-br overflow-hidden relative ${getAvatarColor(p.id)}`}>
                                            {p.photo_url ? (
                                                <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(p.name)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-sm font-bold text-slate-200 truncate flex items-center gap-2">
                                                    {p.name}
                                                    {(p.skippedTurns || 0) > 0 && <span className="text-[10px] bg-red-900/50 text-red-200 px-1.5 py-0.5 rounded border border-red-500/30" title="Пропуск хода">⛔ {p.skippedTurns}</span>}
                                                </div>
                                                {p.id === currentPlayer.id && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Ходит</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                                                <span>${p.cash?.toLocaleString()}</span>
                                                {p.loanDebt > 0 && <span className="text-red-400">-${p.loanDebt?.toLocaleString()}</span>}
                                            </div>
                                        </div>

                                        {/* Host Hint */}
                                        {isHost && (
                                            <div className="text-slate-600">⋮</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logs Section (Mobile) */}
                        <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                                <span>📝</span> Лог событий
                            </h3>
                            <div className="bg-[#0B0E14]/30 rounded-xl border border-slate-800/50 p-3 overflow-y-auto font-mono text-[9px] space-y-2 custom-scrollbar h-[150px]">
                                {state.log?.slice().reverse().map((entry: string, i: number) => (
                                    <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-2 last:border-0 leading-relaxed">
                                        <span className="text-slate-600 mr-2">#{state.log.length - i}</span>
                                        {entry}
                                    </div>
                                ))}
                            </div>

                            {/* Chat Input */}
                            <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Сообщение..."
                                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatMessage.trim()}
                                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ➤
                                </button>
                            </form>
                        </div>

                        {/* Rules Button in Menu */}
                        <button
                            onClick={() => setShowRules(true)}
                            className="w-full py-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold uppercase tracking-widest text-sm hover:bg-violet-500/20 active:bg-violet-500/30 transition-all flex items-center justify-center gap-3"
                        >
                            <span>📜</span> Правила
                        </button>

                        {/* Sound Settings in Mobile Menu */}
                        <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg mb-4">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                                <span>🔊</span> Звук
                            </h3>
                            <div className="flex items-center gap-4">
                                <button onClick={toggleMute} className="p-2 bg-slate-800 rounded-lg text-white">
                                    {isMuted ? '🔇' : '🔊'}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Exit Button in Menu */}
                        <button
                            onClick={handleExit}
                            className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest text-sm hover:bg-red-500/20 active:bg-red-500/30 transition-all flex items-center justify-center gap-3"
                        >
                            <span>🚪</span> Выйти из игры
                        </button>

                        {/* Spacer for bottom nav */}
                        <div className="h-20"></div>
                    </div>
                )
            }



            {/* ℹ️ SQUARE INFO POPUP */}
            {
                squareInfo && (
                    <div className="absolute inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSquareInfo(null)}>
                        <div className="bg-[#1e293b] border border-slate-600 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Gradient Line handled by helper */}
                            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${['DREAM'].includes(squareInfo.type) ? 'from-fuchsia-600 to-purple-600' :
                                ['BUSINESS', 'MARKET', 'DEAL', 'OPPORTUNITY'].includes(squareInfo.type) ? 'from-emerald-500 to-green-600' :
                                    ['LOSS', 'EXPENSE', 'DOODAD', 'DOWNSIZED', 'TAX'].includes(squareInfo.type) ? 'from-red-700 to-rose-900' :
                                        squareInfo.type === 'PAYDAY' ? 'from-yellow-500 to-amber-500' :
                                            squareInfo.type === 'BABY' ? 'from-pink-400 to-blue-400' :
                                                'from-blue-500 to-indigo-500' // Default
                                }`}></div>

                            {/* Close Button */}
                            <button onClick={() => setSquareInfo(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">✕</button>

                            <div className="text-6xl mb-6 filter drop-shadow-lg animate-bounce-short">
                                {['MARKET', 'OPPORTUNITY', 'DEAL'].includes(squareInfo.type) ? '⚡' :
                                    squareInfo.type === 'BABY' ? '👶' :
                                        squareInfo.type === 'PAYDAY' ? '💰' :
                                            squareInfo.type === 'DOWNSIZED' ? '📉' :
                                                squareInfo.type === 'CHARITY' ? '❤️' :
                                                    squareInfo.type === 'DREAM' ? '✨' :
                                                        squareInfo.type === 'BUSINESS' ? '🏢' :
                                                            ['LOSS', 'EXPENSE', 'DOODAD'].includes(squareInfo.type) ? '💸' : '📍'}
                            </div>

                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">{squareInfo.name || squareInfo.type}</h3>

                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6 flex flex-col gap-2">
                                {squareInfo.type === 'PAYDAY' ? (
                                    <div className="text-center py-2">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Ваш доход</div>
                                        <div className="text-3xl font-mono text-green-400 font-bold p-2 bg-green-900/10 rounded-xl border border-green-500/20 shadow-lg shadow-green-900/20">
                                            +${me.cashflow?.toLocaleString()}
                                        </div>
                                        <div className="text-slate-400 text-xs mt-2 italic">Начислено на баланс</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Cost */}
                                        {squareInfo.cost !== undefined && squareInfo.cost !== null && (
                                            <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                                <span className="text-xs text-slate-500 uppercase font-bold">Стоимость</span>
                                                <span className="text-xl font-mono text-red-400 font-bold">-${squareInfo.cost.toLocaleString()}</span>
                                            </div>
                                        )}

                                        {/* Cashflow / Income */}
                                        {squareInfo.cashflow !== undefined && squareInfo.cashflow !== null && (
                                            <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                                <span className="text-xs text-slate-500 uppercase font-bold">Доход</span>
                                                <span className="text-xl font-mono text-green-400 font-bold">+${squareInfo.cashflow.toLocaleString()}</span>
                                            </div>
                                        )}

                                        {/* Fallback if neither */}
                                        {!squareInfo.cost && !squareInfo.cashflow && (
                                            <div className="text-center">
                                                {isMyTurn && squareInfo.type === 'DEAL' ? (
                                                    <div className="flex gap-2 mt-4">
                                                        <button
                                                            onClick={() => socket.emit('draw_deal', { roomId, type: 'SMALL' })}
                                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex flex-col items-center"
                                                        >
                                                            <span>Малая сделка</span>
                                                            <span className="text-[10px] opacity-70">До $5,000</span>
                                                        </button>
                                                        <button
                                                            onClick={() => socket.emit('draw_deal', { roomId, type: 'BIG' })}
                                                            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex flex-col items-center"
                                                        >
                                                            <span>Крупная сделка</span>
                                                            <span className="text-[10px] opacity-70">От $6,000</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-sm block py-2">
                                                        {squareInfo.description ? 'Следуйте инструкциям на карточке' : 'Информация отсутствует'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {squareInfo.description && (
                                <p className="text-slate-400 text-sm mb-6 bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                                    {squareInfo.description}
                                </p>
                            )}

                            <button
                                onClick={() => {
                                    // For immediate events that don't require user choice (like Downsized, Baby, Payday),
                                    // closing the modal should end the turn to prevent hanging.
                                    if (['DOWNSIZED', 'BABY', 'PAYDAY', 'LOSS', 'DOODAD', 'TAX'].includes(squareInfo.type)) {
                                        handleEndTurn();
                                    }
                                    setSquareInfo(null);
                                }}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95"
                            >
                                {['DOWNSIZED', 'BABY', 'LOSS', 'DOODAD', 'TAX'].includes(squareInfo.type) ? 'Завершить ход' : 'Закрыть'}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* MAIN GRID */}
            {/* MAIN LAYOUT CONTAINER - FLEXBOX for Aspect Ratio Control */}
            <div className="flex-1 w-full max-w-[1920px] mx-auto p-0 lg:p-4 flex flex-col lg:flex-row gap-0 lg:gap-4 h-full overflow-hidden items-center justify-center">



                {/* 📱 MOBILE STATS HUD */}
                <div className="lg:hidden w-full bg-[#1e293b]/80 backdrop-blur-md border-b border-white/5 p-2 grid grid-cols-3 gap-2 shrink-0 z-20">
                    <div onClick={() => setShowBank(true)} className="bg-[#0f172a]/80 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 shadow-sm cursor-pointer active:scale-95 transition-transform">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Баланс 🏦</span>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-black text-green-400 font-mono tracking-tight">${me.cash?.toLocaleString()}</span>
                            {/* Simple indicator if cash changed recently could go here */}
                        </div>
                    </div>
                    <div className="bg-[#0f172a]/80 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 shadow-sm">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Выплата</span>
                        <span className="text-sm font-black text-green-400 font-mono tracking-tight">+${me.cashflow?.toLocaleString()}</span>
                    </div>
                    <div onClick={() => setShowBank(true)} className="bg-[#0f172a]/80 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 shadow-sm cursor-pointer active:scale-95 transition-transform">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Кредит 💳</span>
                        <span className="text-sm font-black text-red-400 font-mono tracking-tight">-${me.loanDebt?.toLocaleString()}</span>
                    </div>
                </div>

                {/* LEFT SIDEBAR - PLAYER INFO (Fills remaining space) */}
                <div className="hidden lg:flex flex-col gap-4 h-full overflow-hidden flex-1 min-w-0">
                    <div className="bg-[#1e293b]/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl flex-1 flex flex-col relative overflow-hidden group">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-500"></div>
                        <div className="flex justify-between items-center mb-6 relative">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl filter drop-shadow-md">👷</span>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Профессия</span>
                                    <div className="text-xl font-bold text-white leading-tight tracking-tight">{me.professionName || 'Выбор...'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {/* BALANCE */}
                            <button onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 hover:border-green-500/30 transition-all text-left group relative">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Баланс 🏦</div>
                                <div className="font-mono text-xl text-green-400 font-bold tracking-tight shadow-green-900/20 drop-shadow-sm group-hover:scale-105 transition-transform origin-left relative">
                                    ${me.cash?.toLocaleString()}
                                    <CashChangeIndicator currentCash={me.cash} />
                                </div>
                            </button>

                            {/* CREDIT */}
                            <button onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 hover:border-red-500/30 transition-all text-left group">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Кредит 💳</div>
                                <div className="font-mono text-xl text-red-400 font-bold tracking-tight shadow-red-900/20 drop-shadow-sm group-hover:scale-105 transition-transform origin-left">${me.loanDebt?.toLocaleString()}</div>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Доход</div>
                                <div className="font-mono text-slate-300 font-medium">${me.income?.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Расходы</div>
                                <div className="font-mono text-slate-300 font-medium">${me.expenses?.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                            <span className="text-blue-400 font-black text-sm tracking-widest uppercase filter drop-shadow-sm">PAYDAY</span>
                            <span className="font-mono font-black text-lg text-green-400 bg-green-900/10 px-2 py-0.5 rounded-md border border-green-500/20">+${me.cashflow?.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Assets */}
                    <div className="bg-[#151b2b] rounded-2xl p-5 border border-slate-800 shadow-lg flex-1 flex flex-col min-h-0 relative overflow-hidden">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center justify-between gap-2 flex-shrink-0">
                            <span className="flex items-center gap-2"><span>🏠</span> Ваши Активы</span>
                            <span className="font-mono text-green-400">+${totalAssetYield}</span>
                        </h3>
                        {me.assets?.length > 0 ? (
                            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                {me.assets.map((a: any, i: number) => (
                                    <div
                                        key={i}
                                        onClick={() => setTransferAssetItem({ item: a, index: i })}
                                        className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 hover:border-slate-500 active:scale-[0.98] transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-300 font-medium">
                                                {a.title}
                                                {a.quantity > 0 && <span className="text-slate-500 ml-1 text-[10px]">({a.quantity} шт)</span>}
                                            </span>
                                            <span className="font-mono text-green-400 font-bold bg-green-900/10 px-1.5 py-0.5 rounded">+${a.cashflow}</span>
                                        </div>
                                        <button
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700/50 rounded-lg transition-all text-slate-500 hover:text-blue-400"
                                            title="Передать актив"
                                        >
                                            ➡️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-xs text-slate-600 text-center py-4 italic">Нет активов</div>}
                    </div>


                </div>

                {/* CENTER BOARD (Strict Aspect Square) */}
                <div className="w-full lg:w-auto lg:h-full aspect-square flex-shrink-0 relative bg-[#0f172a] overflow-hidden flex flex-col rounded-3xl border border-slate-800/50 shadow-2xl max-h-full">


                    <div className="flex-1 relative overflow-hidden p-0 flex items-center justify-center">
                        <BoardVisualizer
                            board={state.board}
                            players={state.players}
                            animatingPos={animatingPos}
                            currentPlayerId={currentPlayer.id}
                            zoom={zoom}
                            onSquareClick={(sq: any) => setSquareInfo(sq)}
                            showExitButton={showExitButton}
                            onExitClick={() => setShowFastTrackModal(true)}
                        />

                        {/* MOBILE TIMER OVERLAY (Abs on Board) */}
                        <div className="lg:hidden absolute top-4 right-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg z-20 pointer-events-none">
                            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">⏳</span>
                            <span className={`font-mono font-black text-xl leading-none ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* MOBILE TURN INDICATOR (Abs on Board) */}
                        <div className="lg:hidden absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg z-20 pointer-events-none">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Ход</div>
                            <div className="font-bold text-white text-sm max-w-[100px] truncate">{currentPlayer?.name}</div>
                        </div>


                        {/* Active Market Cards Overlay (Persistent) */}
                        {state.activeMarketCards?.map((ac: any) => {
                            const timeLeft = ac.expiresAt - Date.now();
                            if (timeLeft <= 0) return null;
                            if (state.currentCard?.title === ac.card.title) return null; // Already shown

                            // Check ownership
                            const hasAsset = me.assets.some((a: any) => a.title === ac.card.targetTitle || a.title.includes(ac.card.targetTitle || ''));
                            if (!hasAsset) return null;

                            return (
                                <div key={ac.id} className="absolute inset-0 z-[95] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 pointer-events-none">
                                    <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-blue-500/50 shadow-2xl relative pointer-events-auto animate-in fade-in zoom-in duration-300">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-500"></div>
                                        <div className="text-4xl mb-2 text-center">🏠</div>
                                        <div className="text-center mb-4">
                                            <div className="text-blue-400 font-bold uppercase tracking-widest text-xs">Рынок открыт</div>
                                            <div className="text-white font-bold text-lg">{ac.card.title}</div>
                                            <div className="text-slate-400 text-xs text-center mt-1">
                                                Осталось: {Math.ceil(timeLeft / 1000)} сек.
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/50 p-4 rounded-xl mb-4 text-center border border-slate-700">
                                            <div className="text-[10px] text-slate-500 uppercase">Предложение</div>
                                            <div className="text-2xl font-mono text-green-400 font-bold">${(ac.card.offerPrice || 0).toLocaleString()}</div>
                                            <div className="text-slate-400 text-xs mt-1">за: {ac.card.targetTitle}</div>
                                        </div>

                                        <button
                                            onClick={() => socket.emit('sell_asset', { roomId })}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 transition-all"
                                        >
                                            ПРОДАТЬ АКТИВ
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Action Card Overlay */}
                        {state.currentCard && !showDice && !isAnimating && (
                            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                                <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                    {/* Card ID Display (Integrated Style) */}
                                    {/* Card ID Display (Integrated Style) */}
                                    {state.currentCard.displayId && (
                                        <div className="absolute top-4 right-4 bg-slate-900/60 backdrop-blur-md text-white/90 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-sm z-10 flex items-center gap-1">
                                            <span className="text-yellow-500">No.</span> {state.currentCard.displayId}
                                        </div>
                                    )}
                                    <div className="text-5xl mb-4 text-center">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>
                                    {state.currentCard.type === 'MARKET' && (
                                        <div className="text-center mb-2">
                                            <span className="bg-blue-900/50 text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-blue-800/50">РЫНОК</span>
                                        </div>
                                    )}
                                    <h2 className="text-xl font-bold text-white mb-2 text-center">{state.currentCard.title}</h2>
                                    <p className="text-slate-400 text-sm mb-6 text-center">{state.currentCard.description}</p>

                                    {state.currentCard.type === 'MARKET' ? (
                                        <div className="bg-slate-900/50 p-3 rounded-xl mb-6 border border-slate-800 text-center">
                                            <div className="text-[10px] text-slate-500 uppercase">Предложение</div>
                                            <div className="text-2xl font-mono text-green-400 font-bold">${(state.currentCard.offerPrice || 0).toLocaleString()}</div>
                                            <div className="text-slate-400 text-xs mt-1">за: {state.currentCard.targetTitle}</div>
                                        </div>
                                    ) : state.currentCard.cost && (
                                        <div className="bg-slate-900/50 p-3 rounded-xl mb-6 border border-slate-800 text-center">
                                            {state.currentCard.downPayment ? (
                                                <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-white/5">
                                                    <div>
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Стоимость</div>
                                                        <div className="text-sm font-mono text-slate-300">${state.currentCard.cost.toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Взнос</div>
                                                        <div className="text-xl font-mono text-white font-bold">${state.currentCard.downPayment.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // No down payment (Small deals/expenses)
                                                <>
                                                    <div className="text-[10px] text-slate-500 uppercase">Цена</div>
                                                    <div className="text-2xl font-mono text-white font-bold">${state.currentCard.cost.toLocaleString()}</div>
                                                </>
                                            )}
                                            {state.currentCard.cashflow && <div className="text-emerald-400 font-bold text-sm tracking-wide mt-1">+${state.currentCard.cashflow}/мес</div>}
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 w-full">
                                        {/* STOCK LOGIC */}
                                        {state.currentCard.symbol ? (
                                            <div className="flex flex-col gap-2 w-full animate-in slide-in-from-bottom duration-300">
                                                {/* Quantity Input */}
                                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 text-xs font-bold uppercase ml-2">Кол-во:</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="100000"
                                                            value={stockQty}
                                                            onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                            onFocus={(e) => e.target.select()}
                                                            className="flex-1 bg-transparent text-white font-mono font-bold text-lg outline-none text-right"
                                                        />
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max={Math.max(50, Math.floor(me.cash / (state.currentCard.cost || 1)), me.assets.find((a: any) => a.symbol === state.currentCard.symbol)?.quantity || 0)}
                                                        value={stockQty}
                                                        onChange={(e) => setStockQty(Number(e.target.value))}
                                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* BUY BUTTON (Current Player Only) */}
                                                    {/* BUY BUTTON (Current Player Only) */}
                                                    {isMyTurn && (
                                                        me.cash < (state.currentCard.cost || 0) * stockQty ? (
                                                            // INSUFFICIENT FUNDS -> SHOW LOAN
                                                            <div className="flex flex-col gap-1 w-full">
                                                                <button
                                                                    className="bg-red-600/50 cursor-not-allowed opacity-50 text-white font-bold py-2 rounded-xl flex flex-col items-center"
                                                                    disabled
                                                                >
                                                                    <span className="text-sm">Не хватает средств</span>
                                                                    <span className="text-[10px]">-${((state.currentCard.cost || 0) * stockQty).toLocaleString()}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const deficit = ((state.currentCard.cost || 0) * stockQty) - me.cash;
                                                                        const loanAmount = Math.ceil(deficit / 1000) * 1000;
                                                                        handleLoan(loanAmount);
                                                                    }}
                                                                    disabled={(me.loanDebt || 0) + ((state.currentCard.cost || 0) * stockQty - me.cash) > 38000}
                                                                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold py-2 rounded-xl shadow-lg shadow-yellow-900/20"
                                                                >
                                                                    🏦 Взять кредит (+${Math.ceil(((state.currentCard.cost || 0) * stockQty - me.cash) / 1000) * 1000})
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            // SUFFICIENT FUNDS -> SHOW BUY
                                                            <button
                                                                onClick={handleBuyStock}
                                                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 flex flex-col items-center"
                                                            >
                                                                <span className="text-sm">КУПИТЬ</span>
                                                                <span className="text-[10px] opacity-70">-${((state.currentCard.cost || 0) * stockQty).toLocaleString()}</span>
                                                            </button>
                                                        )
                                                    )}

                                                    {/* SELL BUTTON (Anyone with stock) */}
                                                    {me.assets.some((a: any) => a.symbol === state.currentCard.symbol && a.quantity >= stockQty) ? (
                                                        <button
                                                            onClick={handleSellStock}
                                                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 flex flex-col items-center"
                                                        >
                                                            <span className="text-sm">ПРОДАТЬ</span>
                                                            <span className="text-[10px] opacity-70">+${((state.currentCard.cost || 0) * stockQty).toLocaleString()}</span>
                                                        </button>
                                                    ) : (
                                                        // Placeholder to keep grid layout if not selling
                                                        !isMyTurn && <div className="bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-600 text-xs font-bold">Нет акций</div>
                                                    )}
                                                </div>

                                                {isMyTurn && (
                                                    <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs mt-1">
                                                        ПАС (Завершить ход)
                                                    </button>
                                                )}

                                                <div className="text-center text-[10px] text-slate-500 mt-1 animate-pulse">
                                                    Рынок открыт: Сделки доступны всем!
                                                </div>
                                            </div>
                                        ) : state.currentCard.type === 'MARKET' ? (
                                            /* MARKET: Special Logic for Global Interaction */
                                            <div className="flex gap-2 w-full">
                                                {me.assets.some((a: any) => a.title === state.currentCard?.targetTitle) ? (
                                                    <button onClick={() => socket.emit('sell_asset', { roomId })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 transition-all">
                                                        ПРОДАТЬ
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center bg-slate-800 text-slate-500 text-xs font-bold py-3 rounded-xl border border-slate-700">
                                                        Нет актива
                                                    </div>
                                                )}

                                                {/* Only Current Player can Dismiss (Close Market) */}
                                                {isMyTurn && (
                                                    <button onClick={handleDismissCard} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transform hover:-translate-y-0.5 transition-all">
                                                        ЗАКРЫТЬ
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            /* Standard Interaction (Current Player Only) */
                                            isMyTurn ? (
                                                me.cash >= ((state.currentCard.downPayment ?? state.currentCard.cost) || 0) ? (
                                                    <div className="flex gap-2 w-full">
                                                        <button onClick={handleBuy} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 transition-all">
                                                            {state.currentCard.mandatory ? 'ОПЛАТИТЬ' : 'КУПИТЬ'}
                                                        </button>
                                                        {!state.currentCard.mandatory && (
                                                            <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transform hover:-translate-y-0.5 transition-all">
                                                                ПАС
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2 w-full animate-in slide-in-from-bottom duration-300">
                                                        <div className="bg-red-900/40 border border-red-500/50 p-2 rounded-lg text-center">
                                                            <div className="text-red-400 font-bold text-xs uppercase tracking-widest">Недостаточно средств</div>
                                                            <div className="text-white font-mono text-sm">
                                                                Нужно еще: <span className="font-bold">${(((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash).toLocaleString()}</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const deficit = ((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash;
                                                                    const loanAmount = Math.ceil(deficit / 1000) * 1000;
                                                                    handleLoan(loanAmount);
                                                                }}
                                                                disabled={(me.loanDebt || 0) + (((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash) > 38000}
                                                                className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-yellow-900/20 flex flex-col items-center justify-center gap-1"
                                                            >
                                                                <span>🏦 Взять кредит</span>
                                                                {((me.loanDebt || 0) + (((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash) > 38000) && <span className="text-[9px] text-red-200">(Лимит)</span>}
                                                            </button>
                                                            <button
                                                                onClick={() => setShowBank(true)}
                                                                className={`bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 ${me.isFastTrack ? 'hidden' : ''}`}
                                                            >
                                                                🤝 Попросить
                                                            </button>
                                                        </div>

                                                        <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs mt-1">
                                                            Отказаться
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-full text-center text-slate-500 text-sm animate-pulse bg-slate-900/50 p-3 rounded-xl border border-slate-800">⏳ Ожидание игрока...</div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Charity Overlay */}
                    {state.phase === 'CHARITY_CHOICE' && isMyTurn && !isAnimating && (
                        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                            <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative text-center">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500"></div>
                                <div className="text-5xl mb-4">❤️</div>
                                <h2 className="text-xl font-bold text-white mb-2">Благотворительность</h2>
                                <p className="text-slate-400 text-sm mb-6">
                                    Пожертвуйте {me.isFastTrack ? '$100,000' : '10% от общего дохода'}, чтобы получить возможность выбирать {me.isFastTrack ? '1, 2 или 3' : '1 или 2'} кубика на следующие 3 хода.
                                </p>

                                <div className="flex gap-2 w-full">
                                    <button onClick={() => socket.emit('donate_charity', { roomId })} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-pink-900/20 transform hover:-translate-y-0.5 transition-all">
                                        Пожертвовать
                                    </button>
                                    <button onClick={() => socket.emit('skip_charity', { roomId })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transform hover:-translate-y-0.5 transition-all">
                                        Отказаться
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Opportunity Choice Overlay */}
                    {state.phase === 'OPPORTUNITY_CHOICE' && !isAnimating && (
                        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                            {isMyTurn ? (
                                <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative text-center">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600"></div>
                                    <div className="text-5xl mb-4">⚡</div>
                                    <h2 className="text-xl font-bold text-white mb-2">Возможность</h2>
                                    <p className="text-slate-400 text-sm mb-6">Выберите тип сделки:</p>

                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })} className="flex-1 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-4 rounded-2xl text-sm shadow-xl shadow-green-900/40 relative overflow-hidden group transform hover:-translate-y-1 transition-all">
                                            <div className="relative z-10">Малая</div>
                                            <div className="text-[10px] opacity-70 relative z-10">До $5,000</div>
                                            {(state.deckCounts?.small) && (
                                                <div className="text-[10px] bg-black/20 text-white/90 font-mono mt-1 mx-auto w-fit px-2 py-0.5 rounded relative z-10">
                                                    {state.deckCounts.small.remaining}/{state.deckCounts.small.total}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </button>

                                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="flex-1 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl text-sm shadow-xl shadow-purple-900/40 relative overflow-hidden group transform hover:-translate-y-1 transition-all">
                                            <div className="relative z-10">Крупная</div>
                                            <div className="text-[10px] opacity-70 relative z-10">$6,000+</div>
                                            {(state.deckCounts?.big) && (
                                                <div className="text-[10px] bg-black/20 text-white/90 font-mono mt-1 mx-auto w-fit px-2 py-0.5 rounded relative z-10">
                                                    {state.deckCounts.big.remaining}/{state.deckCounts.big.total}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[#1e293b] w-full max-w-xs p-6 rounded-3xl border border-slate-700 shadow-2xl text-center">
                                    <h2 className="text-xl font-bold text-white mb-2">⚡ Возможность</h2>
                                    <p className="text-slate-400 text-sm">Игрок выбирает сделку...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DOWNSIZED DECISION OVERLAY */}
                    {state.phase === 'DOWNSIZED_DECISION' && !isAnimating && (
                        <div className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                            {isMyTurn ? (
                                <div className="bg-[#1e293b] w-full max-w-md p-8 rounded-3xl border border-red-500/30 shadow-2xl relative text-center">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                                    <div className="text-6xl mb-6">📉</div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Увольнение!</h2>
                                    <p className="text-slate-400 text-sm mb-6 px-4">
                                        Вы потеряли работу. Что будете делать?
                                    </p>

                                    <div className="flex flex-col gap-3 w-full">
                                        {/* Option 1: Pay 1 Month & Skip 2 */}
                                        <button
                                            onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_1M' })}
                                            disabled={me.cash < me.expenses * 1}
                                            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl border border-slate-700 flex items-center justify-between px-6 group transition-all"
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm group-hover:text-blue-400 transition-colors">Оплатить 1 мес. и Пропустить</span>
                                                <span className="text-[10px] text-slate-500">Пропуск 2 ходов</span>
                                            </div>
                                            <div className="text-red-400 font-mono font-bold">-${(me.expenses * 1).toLocaleString()}</div>
                                        </button>

                                        {/* Option 2: Pay 2 Months & No Skip */}
                                        <button
                                            onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_2M' })}
                                            disabled={me.cash < me.expenses * 2}
                                            className="w-full bg-gradient-to-r from-blue-900/50 to-indigo-900/50 hover:from-blue-800/50 hover:to-indigo-800/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl border border-blue-500/30 flex items-center justify-between px-6 group transition-all"
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm group-hover:text-cyan-400 transition-colors">Оплатить 2 мес. и Играть</span>
                                                <span className="text-[10px] text-slate-500">Без пропуска ходов</span>
                                            </div>
                                            <div className="text-red-400 font-mono font-bold">-${(me.expenses * 2).toLocaleString()}</div>
                                        </button>

                                        {/* Helper: Insufficient Funds Actions */}
                                        {((me.cash < me.expenses * 1)) && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <button
                                                    onClick={() => {
                                                        const deficit = (me.expenses * 1) - me.cash;
                                                        const loanAmount = Math.ceil(deficit / 1000) * 1000;
                                                        handleLoan(loanAmount);
                                                    }}
                                                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold py-3 rounded-xl"
                                                >
                                                    🏦 Взять кредит
                                                </button>
                                                <button
                                                    onClick={() => setShowBank(true)}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl"
                                                >
                                                    Попросить
                                                </button>
                                            </div>
                                        )}

                                        {/* Option 3: Bankruptcy */}
                                        <button
                                            onClick={() => {
                                                if (confirm('ВЫ УВЕРЕНЫ? Вы начнете заново с штрафом на кредиты.')) {
                                                    socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' });
                                                }
                                            }}
                                            className="w-full mt-2 text-red-500/70 hover:text-red-400 text-xs font-bold py-2 uppercase tracking-widest transition-colors"
                                        >
                                            Объявить банкротство
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[#1e293b] w-full max-w-xs p-6 rounded-3xl border border-slate-700 shadow-2xl text-center">
                                    <div className="text-4xl mb-4">📉</div>
                                    <h2 className="text-xl font-bold text-white mb-2">Увольнение</h2>
                                    <p className="text-slate-400 text-sm">Игрок принимает решение...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BABY ROLL OVERLAY */}
                    {state.phase === 'BABY_ROLL' && !isAnimating && (
                        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                            {isMyTurn ? (
                                <div className="text-center">
                                    <div className="text-6xl mb-6 animate-bounce">👶</div>
                                    <h2 className="text-2xl font-bold text-white mb-8 drop-shadow-lg">Рождение ребенка?</h2>
                                    <button
                                        onClick={() => handleRoll()}
                                        className="bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold py-6 px-12 rounded-full text-xl shadow-2xl shadow-pink-900/50 transform hover:scale-110 transition-all duration-300 ring-4 ring-pink-500/20"
                                    >
                                        Бросить кубик
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-[#1e293b] w-full max-w-xs p-6 rounded-3xl border border-slate-700 shadow-2xl text-center">
                                    <div className="text-4xl mb-4">👶</div>
                                    <h2 className="text-xl font-bold text-white mb-2">Ребенок</h2>
                                    <p className="text-slate-400 text-sm">Игрок бросает кубик...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>





                {/* RIGHT SIDEBAR (Redesigned) */}
                <div className="hidden lg:flex flex-col w-[380px] h-full border-l border-slate-800/50 bg-[#0f172a]/50 relative z-40 overflow-hidden shadow-xl shrink-0">

                    {/* 2. PLAYER STATUS (Debts/Income) */}
                    <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">

                        {/* Persistent Market Cards (Active Opportunities) */}
                        {state.activeMarketCards && state.activeMarketCards.length > 0 && (
                            <div className="mb-4 space-y-2 animate-in slide-in-from-left duration-300">
                                {state.activeMarketCards
                                    .filter((ac: any) => ac.expiresAt > Date.now())
                                    .map((ac: any) => (
                                        <div
                                            key={ac.id}
                                            onClick={() => setSquareInfo({
                                                type: 'MARKET',
                                                card: ac.card, // Pass full card logic to modal
                                                title: ac.card.title,
                                                description: ac.card.description
                                            })}
                                            className="bg-gradient-to-r from-emerald-900/80 to-emerald-800/80 p-3 rounded-xl border border-emerald-500/50 cursor-pointer hover:scale-105 transition-transform flex items-center justify-between shadow-lg"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                                    <span>🔥</span> Рынок Открыт
                                                </span>
                                                <span className="text-white text-xs font-medium truncate max-w-[120px]">
                                                    {ac.card.title}
                                                </span>
                                            </div>
                                            <div className="text-emerald-400 font-mono text-xs">
                                                {Math.ceil((ac.expiresAt - Date.now()) / 1000)}s
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Placeholder for other player status elements if needed */}
                        </div>
                    </div>

                    {/* 1. STATUS CARD (Player + Timer) */}
                    <div className="p-4 pb-0 shrink-0">
                        <div className="bg-gradient-to-br from-[#151b2b] to-[#0f172a] rounded-2xl p-5 border border-slate-800/80 shadow-lg flex items-center justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500"></div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${timeLeft < 15 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                    Ход игрока
                                </div>
                                <div className="text-lg font-bold text-white tracking-wide truncate max-w-[180px]">{currentPlayer.name}</div>
                            </div>
                            <div className={`text-4xl font-mono font-black tracking-tight ${timeLeft < 15 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-slate-200'} `}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    {/* 2. ACTIONS PANEL */}
                    <div className="p-4 shrink-0">

                        {/* 1.5. PLAYERS LIST (New for Desktop) */}
                        <div className="p-4 pb-0 shrink-0">
                            <div className="bg-[#1e293b]/50 rounded-2xl p-4 border border-slate-700/50 shadow-lg flex flex-col gap-2 relative overflow-hidden">
                                <h3 className="text-slate-500 text-[10px] uppercase tracking-[0.25em] font-black mb-2 flex items-center gap-2">
                                    <span className="text-blue-400">👥</span> ИГРОКИ ({state.players.length})
                                </h3>
                                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                    {state.players.map((p: any) => {
                                        const isActive = p.id === currentPlayer.id;
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedPlayerForMenu(p)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 cursor-pointer hover:border-slate-500/50 hover:bg-slate-800/80 ${isActive ? 'bg-slate-800 border-green-500/30' : 'bg-slate-900/30 border-transparent opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className="relative">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${isActive ? 'border-green-400' : 'border-slate-600'} ${getAvatarColor(p.id)}`}>
                                                        {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover rounded-full" /> : p.token}
                                                    </div>
                                                    {isActive && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>{p.name}</div>
                                                    <div className="text-[10px] font-mono text-slate-500">$ {p.cash?.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>


                        <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-5 border border-slate-700/50 shadow-2xl relative">
                            <h3 className="text-slate-400 text-[10px] uppercase tracking-[0.25em] font-black mb-4 flex items-center gap-2">
                                <span className="text-yellow-400">⚡</span> ДЕЙСТВИЯ
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {/* Roll Logic */}
                                {me.charityTurns > 0 && isMyTurn && state.phase === 'ROLL' && !hasRolled ? (
                                    <div className="flex gap-2 h-28">
                                        <button onClick={() => handleRoll(1)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                            <span className="text-2xl">🎲</span>
                                            <span>1</span>
                                        </button>
                                        <button onClick={() => handleRoll(2)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                            <span className="text-2xl">🎲🎲</span>
                                            <span>2</span>
                                        </button>
                                        {me.isFastTrack && (
                                            <button onClick={() => handleRoll(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                                <span className="text-2xl">🎲×3</span>
                                                <span>3</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleRoll()}
                                        disabled={!isMyTurn || (state.phase !== 'ROLL' && state.phase !== 'BABY_ROLL') || !!state.currentCard || hasRolled}
                                        className={`h-28 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group
                                        ${isMyTurn && (state.phase === 'ROLL' || state.phase === 'BABY_ROLL') && !state.currentCard && !hasRolled
                                                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50 text-white shadow-lg shadow-emerald-900/30'
                                                : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'}`}
                                    >
                                        {hasRolled ? (
                                            <div className="flex flex-col items-center animate-in zoom-in">
                                                <span className="text-4xl font-black">{diceValue}</span>
                                                <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Выпало</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-4xl group-hover:rotate-12 transition-transform">🎲</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">БРОСОК</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                <button
                                    onClick={handleEndTurn}
                                    disabled={!isMyTurn || ((state.phase === 'ROLL' || state.phase === 'BABY_ROLL') && !state.currentCard && !hasRolled) || isAnimating || state.phase === 'BABY_ROLL'}
                                    className={`h-28 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group
                                    ${isMyTurn && (state.phase !== 'ROLL' && state.phase !== 'BABY_ROLL' || !!state.currentCard || hasRolled) && !isAnimating && state.phase !== 'BABY_ROLL'
                                            ? 'bg-blue-600 hover:bg-blue-500 border-blue-400/50 text-white shadow-lg shadow-blue-900/30'
                                            : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'}`}
                                >
                                    <span className="text-4xl group-hover:translate-x-1 transition-transform">➡</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">ДАЛЕЕ</span>
                                </button>
                            </div>

                            <button onClick={() => setShowBank(!showBank)} className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-colors">
                                <span>🏦</span> Открыть Банк
                            </button>

                            {me.canEnterFastTrack && isMyTurn && (
                                <button
                                    onClick={() => setShowFastTrackModal(true)}
                                    className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold text-xs uppercase animate-pulse hover:scale-105 transition-transform"
                                >
                                    🚀 Выйти на Fast Track
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 3. CHAT (Fills Space) */}
                    <div className="flex-1 min-h-0 px-4 pb-2 flex flex-col">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 ml-1">Чат и События</div>
                        <TextChat
                            roomId={roomId}
                            socket={socket}
                            messages={state.chat || []}
                            currentUser={me}
                            className="w-full h-full shadow-inner rounded-2xl border border-slate-800/50"
                        />
                    </div>

                    {/* 4. MENU BUTTON */}
                    <div className="p-4 pt-2 shrink-0">
                        <button
                            onClick={() => setShowMenuModal(true)}
                            className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold uppercase tracking-[0.2em] text-xs transition-colors shadow-lg flex items-center justify-center gap-3"
                        >
                            <span>⚙️</span> МЕНЮ
                        </button>
                    </div>

                </div>

            </div>

            {/* 📱 MOBILE CONTROLS (Floating Bottom Bar) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 z-50 flex gap-3 pb-8">
                {/* Roll Logic */}
                {me.charityTurns > 0 && isMyTurn && state.phase === 'ROLL' && !hasRolled ? (
                    <div className="flex gap-2 flex-1 h-16">
                        <button onClick={() => handleRoll(1)} className="flex-1 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                            <span className="text-xl">🎲</span>
                            <span>1</span>
                        </button>
                        <button onClick={() => handleRoll(2)} className="flex-1 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                            <span className="text-xl">🎲🎲</span>
                            <span>2</span>
                        </button>
                        {me.isFastTrack && (
                            <button onClick={() => handleRoll(3)} className="flex-1 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                <span className="text-xl">🎲×3</span>
                                <span>3</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => handleRoll()}
                        disabled={!isMyTurn || (state.phase !== 'ROLL' && state.phase !== 'BABY_ROLL') || !!state.currentCard || hasRolled}
                        className={`flex-1 h-16 rounded-xl border flex items-center justify-center gap-2 transition-all shadow-lg
                            ${isMyTurn && (state.phase === 'ROLL' || state.phase === 'BABY_ROLL') && !state.currentCard && !hasRolled
                                ? 'bg-emerald-600 active:bg-emerald-500 border-emerald-400/50 text-white shadow-emerald-900/30'
                                : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'}`}
                    >
                        {hasRolled ? (
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black">{diceValue}</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Выпало</span>
                            </div>
                        ) : (
                            <>
                                <span className="text-2xl">🎲</span>
                                <span className="text-sm font-black uppercase tracking-widest">БРОСОК</span>
                            </>
                        )}
                    </button>
                )}

                <button
                    onClick={handleEndTurn}
                    disabled={!isMyTurn || ((state.phase === 'ROLL' || state.phase === 'BABY_ROLL') && !state.currentCard && !hasRolled) || isAnimating || state.phase === 'BABY_ROLL'}
                    className={`flex-1 h-16 rounded-xl border flex items-center justify-center gap-2 transition-all shadow-lg
                        ${isMyTurn && (state.phase !== 'ROLL' && state.phase !== 'BABY_ROLL' || !!state.currentCard || hasRolled) && !isAnimating && state.phase !== 'BABY_ROLL'
                            ? 'bg-blue-600 active:bg-blue-500 border-blue-400/50 text-white shadow-blue-900/30'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'}`}
                >
                    <span className="text-2xl">➡</span>
                    <span className="text-sm font-black uppercase tracking-widest">ДАЛЕЕ</span>
                </button>

                {/* Fast Track Button (Mobile) */}
                {me.canEnterFastTrack && isMyTurn && (
                    <button
                        onClick={() => setShowFastTrackModal(true)}
                        className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-lg animate-pulse"
                    >
                        🚀
                    </button>
                )}

                {/* BANK BUTTON (Mobile) */}
                <button
                    onClick={() => setShowBank(true)}
                    className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-2xl transition-colors"
                >
                    🏦
                </button>

                {/* MENU TOGGLE */}
                <button
                    onClick={() => setShowMobileMenu(true)}
                    className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-2xl"
                >
                    🍔
                </button>
            </div>
        </div>
    );


}
