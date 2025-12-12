```
"use client";

import { useEffect, useState } from 'react';
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
}

import { BankModal } from './BankModal';

// ... (existing interfaces)

export default function GameBoard({ roomId, initialState }: BoardProps) {
    const [state, setState] = useState(initialState);
    const [showBank, setShowBank] = useState(false);

    // Mobile Drawer State
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileView, setMobileView] = useState<'stats' | 'players'>('stats');

    // Animation & Popup States
    const [showDice, setShowDice] = useState(false);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [pendingState, setPendingState] = useState<any>(null);
    const [squareInfo, setSquareInfo] = useState<any>(null);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(120);

    // Local state to track if player has rolled this turn
    const [hasRolled, setHasRolled] = useState(false);

    // Reset hasRolled when turn changes
    useEffect(() => {
        setHasRolled(false);
    }, [state.currentPlayerIndex]);

    const handleRoll = () => {
        socket.emit('roll_dice', { roomId });
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

    useEffect(() => {
        socket.on('dice_rolled', (data) => {
            setDiceValue(data.roll);
            setShowDice(true);
            setPendingState(data.state); // Store full state for later

            // Immediate: Update positions for animation ONLY (if we had separated position state, but we rely on full state for rendering board tokens...)
            // Workaround: We set state but maybe suppress modals via local flag?
            // Actually, existing code sets state inside timeout.
            // Let's adjust the timeouts to be more deliberate.

            // 1. Show Dice (Already happens)
            setTimeout(() => {
                setShowDice(false);

                // 2. Start Moving (Update State to trigger visualizer movement)
                setState(data.state);

                // 3. WAIT checks (Square Info & Modals)
                // calculated delay based on steps? For now fixed 1s after move starts + move duration?
                // The visualizer takes about 300ms/step? 
                // Let's add a robust delay before showing 'square info' or unlocking UI.

                setTimeout(() => {
                    // Find player to get position
                    const currentPlayer = data.state.players[data.state.currentPlayerIndex];
                    if (!currentPlayer) return;

                    const squareIndex = currentPlayer.position;
                    const board = data.state.board;
                    const square = board.find((s: any) => s.index === squareIndex);

                    if (square && !['roll_dice', 'end_turn'].includes(data.state.phase)) {
                        setSquareInfo(square);
                        setTimeout(() => setSquareInfo(null), 3000); // reduced from 3500
                    }
                }, 2000); // 2s Delay to allow piece to move before showing info/cards
            }, 2000); // 2s Dice spin
        });

        socket.on('state_updated', (data) => setState(data.state));
        socket.on('turn_ended', (data) => {
            setState(data.state);
            setSquareInfo(null);
        });
        socket.on('game_started', (data) => setState(data.state));

        return () => {
            socket.off('dice_rolled');
            socket.off('turn_ended');
            socket.off('state_updated');
            socket.off('game_started');
        };
    }, []);


    // Duplicates removed - these are now handled via engineRef or were redefined at the top level

    const handleLoan = (amount: number) => socket.emit('take_loan', { roomId, amount });
    const handleRepay = (amount: number) => socket.emit('repay_loan', { roomId, amount });
    const handleEndTurn = () => socket.emit('end_turn', { roomId });




    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return <div>Loading...</div>; // Safety check

    const isMyTurn = currentPlayer.id === socket.id;
    const me = state.players.find((p: any) => p.id === socket.id) || {};

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
        state.players.forEach((p: PlayerState) => {
            const currentDisplayPos = animatingPos[p.id] ?? p.position;
            if (currentDisplayPos !== p.position) {
                let nextPos = currentDisplayPos;
                const interval = setInterval(() => {
                    if (nextPos === p.position) {
                        clearInterval(interval);
                        return;
                    }
                    const max = p.isFastTrack ? 48 : 24;
                    nextPos = (nextPos + 1) % max;
                    setAnimatingPos(prev => ({ ...prev, [p.id]: nextPos }));
                }, 300);
                return () => clearInterval(interval);
            }
        });
    }, [state.players, animatingPos]);

    // Format MM:SS
    // Format MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${ m.toString().padStart(2, '0') }:${ s.toString().padStart(2, '0') } `;
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
                    </div>
                </div>
            )}

            {/* 📱 MOBILE MENU OVERLAY */}
            {showMobileMenu && (
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
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                            <span>🏠</span> Ваши Активы
                        </h3>
                        {me.assets?.length > 0 ? (
                            <div className="space-y-2">
                                {me.assets.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                                        <span className="text-slate-300 font-medium">{a.title}</span>
                                        <span className="font-mono text-green-400 font-bold bg-green-900/10 px-1.5 py-0.5 rounded ml-2">+${a.cashflow}</span>
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
                                <div key={p.id} className={`flex items - center gap - 3 p - 3 rounded - xl border transition - all ${ p.id === currentPlayer.id ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-slate-900/30 border-slate-800/50' } `}>
                                    <div className="text-lg bg-slate-950 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-800 shadow-inner">{p.token}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-200 truncate">{p.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">${p.cash?.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Spacer for bottom nav */}
                    <div className="h-20"></div>
                </div>
            )}

            {/* ⚡ OPPORTUNITY CHOICE MODAL */}
            {state.phase === 'OPPORTUNITY_CHOICE' && isMyTurn && (
                <div className="absolute inset-0 z-[95] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-[#1e293b] border border-slate-600 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-wide uppercase">Opportunity!</h2>
                        <p className="text-slate-400 mb-8">Choose the size of your deal.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => socket.emit('resolve_opportunity', { roomId, size: 'SMALL' })}
                                className="group relative p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-green-500 hover:bg-slate-700/50 transition-all duration-300"
                            >
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🐟</div>
                                <div className="text-lg font-bold text-green-400 mb-1">Small Deal</div>
                                <div className="text-xs text-slate-500 font-mono">Cost $0 - $5,000</div>
                            </button>

                            <button
                                onClick={() => socket.emit('resolve_opportunity', { roomId, size: 'BIG' })}
                                className="group relative p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:border-yellow-500 hover:bg-slate-700/50 transition-all duration-300"
                            >
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🐋</div>
                                <div className="text-lg font-bold text-yellow-400 mb-1">Big Deal</div>
                                <div className="text-xs text-slate-500 font-mono">Cost $6,000+</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ℹ️ SQUARE INFO POPUP */}
            {squareInfo && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[90] animate-in slide-in-from-top duration-500">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-2 min-w-[300px]">
                        <div className="text-4xl filter drop-shadow-md">
                            {['MARKET', 'OPPORTUNITY'].includes(squareInfo.type) ? '⚡' : '📍'}
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">{squareInfo.name}</h3>
                        <p className="text-slate-400 text-xs text-center max-w-[200px]">
                            You landed on {squareInfo.name}.
                        </p>
                    </div>
                </div>
            )}

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
                            <button onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 hover:border-green-500/30 transition-all text-left group">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Баланс 🏦</div>
                                <div className="font-mono text-xl text-green-400 font-bold tracking-tight shadow-green-900/20 drop-shadow-sm group-hover:scale-105 transition-transform origin-left">${me.cash?.toLocaleString()}</div>
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
                    <div className="bg-[#151b2b] rounded-2xl p-5 border border-slate-800 shadow-lg">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                            <span>🏠</span> Ваши Активы
                        </h3>
                        {me.assets?.length > 0 ? (
                            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                {me.assets.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                        <span className="text-slate-300 font-medium">{a.title}</span>
                                        <span className="font-mono text-green-400 font-bold bg-green-900/10 px-1.5 py-0.5 rounded ml-2">+${a.cashflow}</span>
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
                        <div className="flex items-center gap-2">
                            <span className="text-2xl bg-slate-800 w-8 h-8 flex items-center justify-center rounded-full border border-slate-700">{me.token}</span>
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-slate-200 text-sm">{me.name}</span>
                                <span className="font-mono text-green-400 text-xs font-bold">${me.cash?.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Turn</div>
                            <div className={`text - sm font - mono font - bold ${ timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-blue-400' } `}>
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
                        />

                        {/* Action Card Overlay */}
                        {state.currentCard && !showDice && (
                            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                                <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                    <div className="text-5xl mb-4 text-center">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>
                                    <h2 className="text-xl font-bold text-white mb-2 text-center">{state.currentCard.title}</h2>
                                    <p className="text-slate-400 text-sm mb-6 text-center">{state.currentCard.description}</p>

                                    {state.currentCard.cost && (
                                        <div className="bg-slate-900/50 p-3 rounded-xl mb-6 border border-slate-800 text-center">
                                            <div className="text-[10px] text-slate-500 uppercase">Цена</div>
                                            <div className="text-2xl font-mono text-white font-bold">${(state.currentCard.downPayment ?? state.currentCard.cost).toLocaleString()}</div>
                                            {state.currentCard.cashflow && <div className="text-green-400 text-xs mt-1">+${state.currentCard.cashflow}/мес</div>}
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 w-full">
                                        {isMyTurn ? (
                                            state.currentCard.type === 'MARKET' ? (
                                                <>
                                                    {/* BUY BUTTON or INSUFFICIENT FUNDS */}
                                                    {me.cash >= (state.currentCard.downPayment ?? state.currentCard.cost) ? (
                                                        <div className="flex gap-2 w-full">
                                                            <button onClick={handleBuy} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 transition-all">
                                                                КУПИТЬ
                                                            </button>
                                                            <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transform hover:-translate-y-0.5 transition-all">
                                                                ПАС
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 w-full animate-in slide-in-from-bottom duration-300">
                                                            <div className="bg-red-900/40 border border-red-500/50 p-2 rounded-lg text-center">
                                                                <div className="text-red-400 font-bold text-xs uppercase tracking-widest">Недостаточно средств</div>
                                                                <div className="text-white font-mono text-sm">
                                                                    Нужно еще: <span className="font-bold">${((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash).toLocaleString()}</span>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => handleLoan((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash)}
                                                                    disabled={(me.loanDebt || 0) + ((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash) > 38000}
                                                                    className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-yellow-900/20 flex flex-col items-center justify-center gap-1"
                                                                >
                                                                    <span>🏦 Взять кредит</span>
                                                                    {((me.loanDebt || 0) + ((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash) > 38000) && <span className="text-[9px] text-red-200">(Лимит)</span>}
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
                                                    )}
                                                </>
                                            ) : (
                                                <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg transform hover:-translate-y-0.5 transition-all">
                                                    OK
                                                </button>
                                            )
                                        ) : <div className="w-full text-center text-slate-500 text-sm animate-pulse bg-slate-900/50 p-3 rounded-xl border border-slate-800">⏳ Ожидание игрока...</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
                        <div className={`text - 4xl font - mono font - black tracking - tight ${ timeLeft < 15 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-slate-200' } `}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-[#151b2b] rounded-2xl p-5 border border-slate-800 shadow-lg">
                        <h3 className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-4 flex items-center gap-2">
                            <span className="text-yellow-500">⚡</span> Действия
                        </h3>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={handleRoll}
                                disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard || hasRolled}
                                className={`p - 4 rounded - xl border flex flex - col items - center gap - 2 group transition - all duration - 200
                                ${
    isMyTurn && state.phase === 'ROLL' && !state.currentCard && !hasRolled
        ? 'bg-gradient-to-b from-green-600 to-green-700 border-green-500 text-white shadow-xl shadow-green-900/40 hover:scale-[1.02] hover:shadow-green-900/60 cursor-pointer'
        : 'bg-slate-800/50 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
} `}
                            >
                                <span className="text-2xl filter drop-shadow-md group-hover:rotate-12 transition-transform duration-300">🎲</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">Бросок</span>
                            </button>
                            <button
                                onClick={handleEndTurn}
                                disabled={!isMyTurn || (state.phase === 'ROLL' && !state.currentCard && !hasRolled)}
                                className={`p - 4 rounded - xl border flex flex - col items - center gap - 2 group transition - all duration - 200
                                ${
    isMyTurn && (state.phase !== 'ROLL' || !!state.currentCard || hasRolled)
        ? 'bg-gradient-to-b from-blue-600 to-blue-700 border-blue-500 text-white shadow-xl shadow-blue-900/40 hover:scale-[1.02] hover:shadow-blue-900/60 cursor-pointer'
        : 'bg-slate-800/50 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
} `}
                            >
                                <span className="text-2xl filter drop-shadow-md group-hover:translate-x-1 transition-transform duration-300">➡</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">Далее</span>
                            </button>
                        </div>
                        <button onClick={() => setShowBank(!showBank)} className="w-full bg-slate-800/80 p-3 rounded-xl border border-slate-700 hover:bg-slate-700 hover:border-slate-500 flex items-center justify-center gap-3 group transition-all">
                            <span className="text-xl group-hover:scale-110 transition-transform">🏦</span>
                            <span className="text-[10px] text-slate-200 font-bold uppercase tracking-widest">Открыть Банк</span>
                        </button>
                    </div>

                    {/* Players Mini List (Moved to Right) */}
                    <div className="bg-[#151b2b] rounded-2xl p-5 border border-slate-800 shadow-lg flex-1 min-h-[200px] overflow-y-auto custom-scrollbar">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                            <span>👥</span> Игроки
                        </h3>
                        <div className="space-y-2">
                            {state.players.map((p: any) => (
                                <div key={p.id} className={`flex items - center gap - 3 p - 3 rounded - xl border transition - all ${ p.id === currentPlayer.id ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-900/10 scale-[1.02]' : 'bg-slate-900/30 border-slate-800/50' } `}>
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
                </div >

            </div>
            {/* End Main Grid */}

            {/* BABY NOTIFICATION OVERLAY */}
            {babyNotification && (
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
            )}

            {/* BOTTOM NAV MOBILE */}
            < div className="lg:hidden bg-[#0B0E14] border-t border-slate-800 p-2 pb-6 z-50" >
                <div className="max-w-md mx-auto flex justify-between items-center gap-2">
                    <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="flex flex-col items-center gap-1 p-2 w-16 text-slate-400">
                        <span className="text-xl">☰</span>
                        <span className="text-[9px]">Menu</span>
                    </button>
                    <button
                        onClick={handleRoll}
                        disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard}
                        className={`flex - 1 h - 14 rounded - xl flex items - center justify - center gap - 2 font - bold text - xs uppercase
                              ${ isMyTurn && state.phase === 'ROLL' && !state.currentCard ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-500 opacity-50' } `}
                    >
                        <span>🎲</span> ROLL
                    </button>
                    <button
                        onClick={handleEndTurn}
                        disabled={!isMyTurn || (state.phase === 'ROLL' && !state.currentCard)}
                        className={`flex - 1 h - 14 rounded - xl flex items - center justify - center gap - 2 font - bold text - xs uppercase
                              ${ isMyTurn && (state.phase !== 'ROLL' || !!state.currentCard) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 opacity-50' } `}
                    >
                        <span>➡</span> NEXT
                    </button>
                    <button
                        onClick={() => setShowBank(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-16"
                    >
                        <span className="text-xl">🏦</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">Банк</span>
                    </button>
                </div>
            </div >

            <BankModal isOpen={showBank} onClose={() => setShowBank(false)} player={me} roomId={roomId} transactions={state.transactions} players={state.players} />
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
        </div >
    );
}
