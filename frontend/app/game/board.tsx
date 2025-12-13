"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';
import confetti from 'canvas-confetti';
import { BoardVisualizer } from './BoardVisualizer';

interface BoardProps {
    roomId: string;
    initialState: any;
}

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
    professionName?: string;
    isBankrupted?: boolean;
}

import { BankModal } from './BankModal';
import { TransferModal } from './TransferModal';
import { RulesModal } from './RulesModal';

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

export default function GameBoard({ roomId, initialState }: BoardProps) {
    const router = useRouter();
    const [state, setState] = useState(initialState);
    const [showBank, setShowBank] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [transferAssetItem, setTransferAssetItem] = useState<{ item: any, index: number } | null>(null);
    const [stockQty, setStockQty] = useState(1);

    // Mobile Drawer State
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileView, setMobileView] = useState<'stats' | 'players'>('stats');

    // Animation & Popup States
    const [showDice, setShowDice] = useState(false);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [mlmMessage, setMlmMessage] = useState<string | null>(null);
    const [pendingState, setPendingState] = useState<any | null>(null);
    const [squareInfo, setSquareInfo] = useState<any>(null);
    const [babyNotification, setBabyNotification] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(120);

    // Local state to track if player has rolled this turn
    const [hasRolled, setHasRolled] = useState(false);

    // Reset hasRolled when turn changes
    useEffect(() => {
        setHasRolled(false);
    }, [state.currentPlayerIndex]);

    useEffect(() => {
        if (state.lastEvent?.type === 'BABY_BORN') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FF69B4', '#87CEEB', '#FFD700', '#ffffff']
            });
            setBabyNotification(`👶 Поздравляем! В семье ${state.lastEvent.payload?.player} пополнение!`);
            setTimeout(() => setBabyNotification(null), 5000);
        } else if (state.lastEvent?.type === 'LOTTERY_WIN') {
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
        }
    }, [state.lastEvent]);

    const handleRoll = (diceCount?: number) => {
        socket.emit('roll_dice', { roomId, diceCount });
        setHasRolled(true);
    };

    const handleBuy = () => {
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
            setShowDice(true);
            setIsAnimating(true);
            // setPendingState(data.state); // Unused

            const DICE_DURATION = 2000;
            const BUFFER = 500;

            // Calculate total movement time based on roll
            const moveDuration = (data.roll || 0) * 500; // MOVE_PER_STEP matched with interval

            // 1. Show Dice for 2s
            setTimeout(() => {
                setShowDice(false);
                isRollingRef.current = false;

                // 2. Start Moving AFTER a slight delay to let Dice fade out
                setTimeout(() => {
                    setState(data.state);
                }, 500);

                // 3. Wait for movement to finish before showing popup
                setTimeout(() => {
                    const currentPlayer = data.state.players[data.state.currentPlayerIndex];
                    if (!currentPlayer) return;

                    const squareIndex = currentPlayer.position;
                    const board = data.state.board;
                    const square = board.find((s: any) => s.index === squareIndex);

                    // Show popup only if phase allows
                    if (square && !['roll_dice'].includes(data.state.phase)) {
                        if (!['EXPENSE', 'MARKET', 'CHARITY', 'DEAL'].includes(square.type)) {
                            setSquareInfo(square);
                        }
                    }
                    setIsAnimating(false);
                }, moveDuration + BUFFER);
            }, DICE_DURATION);
        });

        socket.on('state_updated', (data) => {
            // Only apply update if we are NOT currently animating a dice roll.
            // This prevents the token from moving "underneath" the dice overlay.
            if (!isRollingRef.current) {
                setState(data.state);
            } else {
                console.log('Skipped state_updated due to active dice roll');
            }
        });

        socket.on('turn_ended', (data) => {
            // Always apply turn ended (force sync)
            isRollingRef.current = false;
            setState(data.state);
            setSquareInfo(null);
        });

        socket.on('game_started', (data) => {
            isRollingRef.current = false;
            setState(data.state);
        });

        return () => {
            socket.off('dice_rolled');
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

    const handleLoan = (amount: number) => socket.emit('take_loan', { roomId, amount });
    const handleRepay = (amount: number) => socket.emit('repay_loan', { roomId, amount });
    const handleEndTurn = () => socket.emit('end_turn', { roomId });

    const handleTransferAsset = (toId: string, quantity?: number) => {
        if (!transferAssetItem) return;
        socket.emit('transfer_asset', { roomId, toPlayerId: toId, assetIndex: transferAssetItem.index, quantity });
        setTransferAssetItem(null);
    };

    const handleDismissCard = () => {
        socket.emit('dismiss_card', { roomId });
    };

    const handleExit = () => {
        socket.emit('leave_room', { roomId });
        router.push('/lobby');
    };

    const me = state.players.find((p: any) => p.id === socket.id) || initialState.players[0];
    const isMyTurn = state.players[state.currentPlayerIndex]?.id === me?.id;
    const currentTurnPlayer = state.players[state.currentPlayerIndex];
    const currentPlayer = currentTurnPlayer; // Alias for existing code

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
        <div className="h-screen bg-[#0f172a] text-white font-sans flex flex-col overflow-hidden relative">

            {showDice && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center animate-bounce">
                        <div className="text-9xl filter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-spin-slow">🎲</div>
                        {diceValue && (
                            <div className="mt-8 text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 animate-pulse">
                                {diceValue}
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
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Меню</h2>
                            <button onClick={() => setShowMobileMenu(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">✕</button>
                        </div>

                        {/* Profile Section */}
                        <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
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
                                        <div key={i} className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 font-medium">{a.title}</span>
                                                <span className="font-mono text-green-400 font-bold text-[10px]">+${a.cashflow}</span>
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
                                    <div key={p.id} className={`flex items - center gap - 3 p - 3 rounded - xl border transition - all ${p.id === currentPlayer.id ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-slate-900/30 border-slate-800/50'} `}>
                                        <div className="text-lg bg-slate-950 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-800 shadow-inner">{p.token}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-200 truncate">{p.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">${p.cash?.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rules Button in Menu */}
                        <button
                            onClick={() => setShowRules(true)}
                            className="w-full py-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold uppercase tracking-widest text-sm hover:bg-violet-500/20 active:bg-violet-500/30 transition-all flex items-center justify-center gap-3"
                        >
                            <span>📜</span> Правила
                        </button>

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

                            <button onClick={() => setSquareInfo(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95">
                                Закрыть
                            </button>
                        </div>
                    </div>
                )
            }

            {/* MAIN GRID */}
            <div className="flex-1 w-full max-w-[1920px] mx-auto p-2 lg:p-4 grid grid-cols-1 lg:grid-cols-[380px_1fr_300px] gap-2 lg:gap-4 h-[calc(100vh-80px)] lg:h-screen lg:max-h-screen overflow-hidden">

                {/* LEFT SIDEBAR - PLAYER INFO */}
                <div className="hidden lg:flex flex-col gap-4 h-full overflow-hidden">
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
                                    <div key={i} className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-300 font-medium">{a.title}</span>
                                            <span className="font-mono text-green-400 font-bold bg-green-900/10 px-1.5 py-0.5 rounded">+${a.cashflow}</span>
                                        </div>
                                        <button
                                            onClick={() => setTransferAssetItem({ item: a, index: i })}
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

                {/* CENTER BOARD */}
                <div className="flex-1 relative bg-[#0f172a] overflow-hidden flex flex-col rounded-3xl border border-slate-800/50 shadow-2xl">
                    {/* Mobile Top Bar */}
                    <div className="lg:hidden flex justify-between items-center p-3 bg-[#0B0E14] border-b border-slate-800 z-10 shadow-md">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl bg-slate-800 w-9 h-9 flex items-center justify-center rounded-full border border-slate-700 shadow-sm">{me.token}</span>
                            <div className="flex flex-col leading-tight">
                                <span className="font-bold text-slate-200 text-sm truncate max-w-[100px]">{me.name}</span>
                                <span className="font-mono text-green-400 text-xs font-bold relative flex items-center gap-1">
                                    ${me.cash?.toLocaleString()}
                                    <CashChangeIndicator currentCash={me.cash} />
                                </span>
                            </div>
                        </div>

                        {/* Income Stats Mobile */}
                        <div className="flex items-center gap-3 mx-2">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-0.5">Пассив</span>
                                <span className="font-mono text-xs text-blue-400 font-bold">+${(me.passiveIncome || 0).toLocaleString()}</span>
                            </div>
                            <div className="h-6 w-px bg-slate-800"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-0.5">Net</span>
                                <span className="font-mono text-xs text-green-400 font-bold">+${(me.cashflow || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="text-center min-w-[50px]">
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Turn</div>
                            <div className={`text-sm font-mono font-bold ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden p-0 flex items-center justify-center">
                        <BoardVisualizer
                            board={state.board}
                            players={state.players}
                            animatingPos={animatingPos}
                            currentPlayerId={currentPlayer.id}
                            onSquareClick={(sq: any) => setSquareInfo(sq)} // Re-using squareInfo state for click popup
                        />

                        {/* Action Card Overlay */}
                        {state.currentCard && !showDice && !isAnimating && (
                            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                                <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                    <div className="text-5xl mb-4 text-center">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>
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
                                            <div className="text-[10px] text-slate-500 uppercase">Цена</div>
                                            <div className="text-2xl font-mono text-white font-bold">${(state.currentCard.downPayment ?? state.currentCard.cost).toLocaleString()}</div>
                                            {state.currentCard.cashflow && <div className="text-green-400 text-xs mt-1">+${state.currentCard.cashflow}/мес</div>}
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
                                                    {isMyTurn && (
                                                        <button
                                                            onClick={handleBuyStock}
                                                            disabled={me.cash < (state.currentCard.cost || 0) * stockQty}
                                                            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 flex flex-col items-center"
                                                        >
                                                            <span className="text-sm">КУПИТЬ</span>
                                                            <span className="text-[10px] opacity-70">-${((state.currentCard.cost || 0) * stockQty).toLocaleString()}</span>
                                                        </button>
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
                                                                onClick={() => handleLoan(((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash)}
                                                                disabled={(me.loanDebt || 0) + (((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash) > 38000}
                                                                className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-yellow-900/20 flex flex-col items-center justify-center gap-1"
                                                            >
                                                                <span>🏦 Взять кредит</span>
                                                                {((me.loanDebt || 0) + (((state.currentCard.downPayment ?? state.currentCard.cost) || 0) - me.cash) > 38000) && <span className="text-[9px] text-red-200">(Лимит)</span>}
                                                            </button>
                                                            <button
                                                                onClick={() => setShowBank(true)}
                                                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
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
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </button>

                                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="flex-1 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl text-sm shadow-xl shadow-purple-900/40 relative overflow-hidden group transform hover:-translate-y-1 transition-all">
                                            <div className="relative z-10">Крупная</div>
                                            <div className="text-[10px] opacity-70 relative z-10">$6,000+</div>
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
                </div>

                {/* RIGHT SIDEBAR (Desktop) */}
                <div className="hidden lg:flex flex-col w-[300px] border-l border-slate-800/0 p-0 relative overflow-y-auto custom-scrollbar gap-4">

                    {/* TIMER COMPONENT */}
                    <div className="bg-gradient-to-br from-[#151b2b] to-[#0f172a] rounded-2xl p-5 border border-slate-800/80 shadow-lg flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">Ход игрока</div>
                            <div className="text-lg font-bold text-white tracking-wide">{currentPlayer.name}</div>
                        </div>
                        <div className={`text - 4xl font - mono font - black tracking - tight ${timeLeft < 15 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-slate-200'} `}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-5 border border-slate-700/50 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <h3 className="text-slate-400 text-[10px] uppercase tracking-[0.25em] font-black mb-5 flex items-center gap-2 relative z-10">
                            <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">⚡</span> ДЕЙСТВИЯ
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                            {me.charityTurns > 0 && isMyTurn && state.phase === 'ROLL' && !hasRolled ? (
                                <div className="h-[100px] rounded-2xl border border-slate-700/50 bg-slate-800/40 p-2 flex flex-col gap-1 shadow-inner">
                                    <div className="flex-1 flex gap-1">
                                        <button onClick={() => handleRoll(1)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex flex-col items-center justify-center shadow-lg transition-all active:scale-95">
                                            <span className="text-xl">🎲</span>
                                            <span className="text-[8px] font-bold">1</span>
                                        </button>
                                        <button onClick={() => handleRoll(2)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex flex-col items-center justify-center shadow-lg transition-all active:scale-95">
                                            <span className="text-xl">🎲🎲</span>
                                            <span className="text-[8px] font-bold">2</span>
                                        </button>
                                        {me.isFastTrack && (
                                            <button onClick={() => handleRoll(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex flex-col items-center justify-center shadow-lg transition-all active:scale-95">
                                                <span className="text-xl">🎲 x3</span>
                                                <span className="text-[8px] font-bold">3</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-[8px] text-center text-pink-400 font-bold uppercase tracking-wider">Charity Bonus ({me.charityTurns})</div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleRoll()}
                                    disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard || hasRolled}
                                    className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden
                                    ${isMyTurn && state.phase === 'ROLL' && !state.currentCard && !hasRolled
                                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-1 active:scale-95 active:translate-y-0 cursor-pointer'
                                            : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed contrast-50 grayscale'
                                        } `}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                    {hasRolled ? (
                                        <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                            <span className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{diceValue}</span>
                                            <span className="text-[8px] text-emerald-200 uppercase tracking-wider font-bold">Выпало</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className={`text-3xl filter drop-shadow-xl transition-transform duration-500 ${!hasRolled && isMyTurn ? 'group-hover:rotate-[360deg]' : ''}`}>🎲</span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">Бросок</span>
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={handleEndTurn}
                                disabled={!isMyTurn || (state.phase === 'ROLL' && !state.currentCard && !hasRolled) || isAnimating}
                                className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden
                                ${isMyTurn && (state.phase !== 'ROLL' || !!state.currentCard || hasRolled) && !isAnimating
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400/50 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1 active:scale-95 active:translate-y-0 cursor-pointer'
                                        : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed contrast-50 grayscale'
                                    } `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                <span className="text-3xl filter drop-shadow-xl group-hover:translate-x-1 transition-transform duration-300">➡</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">Далее</span>
                            </button>
                        </div>
                        <button onClick={() => setShowBank(!showBank)} className="w-full bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-500 hover:shadow-lg hover:shadow-blue-900/20 flex items-center justify-center gap-3 transition-all duration-300 group/bank active:scale-95">
                            <span className="text-xl group-hover/bank:scale-110 group-hover/bank:rotate-12 transition-transform duration-300">🏦</span>
                            <span className="text-[10px] text-slate-300 group-hover:text-white font-bold uppercase tracking-[0.15em]">Открыть Банк</span>
                        </button>
                    </div>

                    {/* Players Mini List (Moved to Right) */}
                    <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-5 border border-slate-700/50 shadow-lg flex-1 min-h-[200px] overflow-y-auto custom-scrollbar relative">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2 sticky top-0 bg-[#1e293b]/95 backdrop-blur-md py-2 z-10 w-full">
                            <span>👥</span> Игроки
                        </h3>
                        <div className="space-y-3 pb-2">
                            {state.players.map((p: any) => (
                                <div key={p.id} className={`flex items - center gap - 3 p - 3 rounded - 2xl border transition - all duration - 300 group ${p.id === currentPlayer.id ? 'bg-slate-800/90 border-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/60'} `}>
                                    <div className="text-lg bg-slate-950 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-800 shadow-inner">{p.token}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-200 truncate">{p.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">${p.cash?.toLocaleString()}</div>
                                    </div>
                                    {p.id === currentPlayer.id && <div className="text-[8px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Ходит</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 flex items-center gap-2">
                        <span>📝</span> Лог событий
                    </h3>
                    <div className="flex-1 bg-[#0f172a]/50 rounded-xl border border-slate-800/50 p-3 overflow-y-auto font-mono text-[9px] space-y-2 custom-scrollbar min-h-[150px]">
                        {state.log?.slice().reverse().map((entry: string, i: number) => (
                            <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-2 last:border-0 leading-relaxed">
                                <span className="text-slate-600 mr-2">#{state.log.length - i}</span>
                                {entry}
                            </div>
                        ))}
                    </div>

                    {/* Rules Button */}
                    <button
                        onClick={() => setShowRules(true)}
                        className="mt-auto w-full py-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold uppercase tracking-widest text-xs hover:bg-violet-500/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <span className="group-hover:scale-110 transition-transform">📜</span> Правила
                    </button>

                    {/* Exit Button */}
                    <button
                        onClick={handleExit}
                        className="mt-3 w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase tracking-widest text-xs hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">🚪</span> Выход
                    </button>
                </div >

            </div>
            {/* End Main Grid */}

            {/* BABY NOTIFICATION OVERLAY */}
            {
                babyNotification && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl animate-in zoom-in-50 duration-500 flex flex-col items-center gap-4">
                            <div className="text-6xl animate-bounce">👶</div>
                            <div className="text-3xl font-black text-white text-center drop-shadow-lg leading-tight">
                                {babyNotification}
                            </div>
                            <div className="text-white/80 text-xl font-bold bg-green-500/20 px-4 py-2 rounded-xl mt-2 border border-green-500/50">
                                +$5,000 Подарок!
                            </div>
                        </div>
                    </div>
                )
            }

            {/* BOTTOM NAV MOBILE */}
            <div className="lg:hidden bg-[#0B0E14]/90 backdrop-blur-xl border-t border-slate-800/50 p-3 pb-8 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="max-w-md mx-auto flex justify-between items-center gap-3">
                    <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="flex flex-col items-center gap-1 p-2 w-14 text-slate-400 hover:text-white transition-colors">
                        <span className="text-xl">☰</span>
                        <span className="text-[9px] font-bold tracking-wider">МЕНЮ</span>
                    </button>

                    <button
                        onClick={() => handleRoll()}
                        disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard || hasRolled}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg transition-all relative overflow-hidden group
                              ${isMyTurn && state.phase === 'ROLL' && !state.currentCard && !hasRolled
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-900/40 hover:-translate-y-0.5 active:scale-95'
                                : 'bg-slate-800/50 text-slate-500 opacity-50 cursor-not-allowed border border-slate-700/50'}`}
                    >
                        <span className="text-lg filter drop-shadow-md group-active:rotate-12 transition-transform">🎲</span> Бросок
                    </button>

                    <button
                        onClick={handleEndTurn}
                        disabled={!isMyTurn || (state.phase === 'ROLL' && !state.currentCard && !hasRolled) || isAnimating}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg transition-all relative overflow-hidden group
                              ${isMyTurn && (state.phase !== 'ROLL' || !!state.currentCard || hasRolled) && !isAnimating
                                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-900/40 hover:-translate-y-0.5 active:scale-95'
                                : 'bg-slate-800/50 text-slate-500 opacity-50 cursor-not-allowed border border-slate-700/50'}`}
                    >
                        <span className="text-lg filter drop-shadow-md group-active:translate-x-1 transition-transform">➡</span> Далее
                    </button>

                    <button
                        onClick={() => setShowBank(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-white transition-all w-14"
                    >
                        <span className="text-xl">🏦</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">Банк</span>
                    </button>
                </div>
            </div>

            <BankModal isOpen={showBank} onClose={() => setShowBank(false)} player={me} roomId={roomId} transactions={state.transactions} players={state.players} />
            <TransferModal
                isOpen={!!transferAssetItem}
                onClose={() => setTransferAssetItem(null)}
                asset={transferAssetItem?.item}
                players={state.players}
                myId={me.id}
                onTransfer={handleTransferAsset}
            />
            {
                state.winner && (
                    <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-1000 backdrop-blur-md">
                        <div className="text-8xl mb-8 animate-bounce">🏆</div>
                        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-6 tracking-tighter shadow-2xl">ПОБЕДА!</h2>
                        <div className="text-3xl text-white mb-12 font-light"><span className="font-bold text-yellow-400">{state.winner}</span> Выграл!</div>
                        <button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg">Играть снова</button>
                    </div>
                )
            }
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        </div >
    );
}
