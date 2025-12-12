"use client";

import { useEffect, useState } from 'react';
import { socket } from '../socket';
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
            setPendingState(data.state);

            setTimeout(() => {
                setShowDice(false);
                setState(data.state);

                setTimeout(() => {
                    // Find player to get position
                    const currentPlayer = data.state.players[data.state.currentPlayerIndex];
                    if (!currentPlayer) return;

                    const squareIndex = currentPlayer.position;
                    const board = data.state.board;
                    const square = board.find((s: any) => s.index === squareIndex);

                    if (square && !['roll_dice', 'end_turn'].includes(data.state.phase)) {
                        setSquareInfo(square);
                        setTimeout(() => setSquareInfo(null), 3500);
                    }
                }, 1000); // Wait for token move
            }, 2500);
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

    const handleLoan = (amount: number) => socket.emit('take_loan', { roomId, amount });
    const handleRepay = (amount: number) => socket.emit('repay_loan', { roomId, amount });
    const handleRoll = () => socket.emit('roll_dice', { roomId });
    const handleEndTurn = () => socket.emit('end_turn', { roomId });
    const handleBuy = () => socket.emit('buy_asset', { roomId });

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
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-screen bg-[#0f172a] text-white font-sans flex flex-col overflow-hidden relative">

            {/* 🎲 DICE OVERLAY */}
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
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[340px_1fr_300px] overflow-hidden">

                {/* LEFT SIDEBAR / MOBILE MENU */}
                <div className={`
                    fixed inset-0 z-50 bg-[#0B0E14]/95 backdrop-blur-md transition-transform duration-300 transform 
                    lg:relative lg:transform-none lg:flex lg:flex-col lg:bg-[#0B0E14] lg:border-r lg:border-slate-800 lg:z-auto
                    ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    {/* Mobile Header */}
                    <div className="lg:hidden p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button onClick={() => setMobileView('stats')} className={`px-4 py-2 rounded-md text-xs font-bold ${mobileView === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Stats</button>
                            <button onClick={() => setMobileView('players')} className={`px-4 py-2 rounded-md text-xs font-bold ${mobileView === 'players' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Players</button>
                        </div>
                        <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400">✕</button>
                    </div>

                    <div className="p-4 overflow-y-auto custom-scrollbar h-full flex flex-col gap-4">
                        {(!showMobileMenu || mobileView === 'stats') && (
                            <>
                                {/* Profile Card (Interactive Stats) */}
                                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">👷</span>
                                            <div>
                                                <span className="text-[10px] text-slate-500 uppercase">Профессия</span>
                                                <div className="font-bold text-slate-200 leading-tight">{me.professionName || 'Выбор...'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        {/* BALANCE (Click Open Bank) */}
                                        <button onClick={() => setShowBank(true)} className="bg-slate-900/50 p-2 rounded-lg border border-slate-800 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group">
                                            <div className="text-[10px] text-slate-500">Баланс 🏦</div>
                                            <div className="font-mono text-green-400 group-hover:scale-105 transition-transform">${me.cash?.toLocaleString()}</div>
                                        </button>

                                        {/* CREDIT (Click Open Bank - maybe Loan tab later [TODO], for now Bank) */}
                                        <button onClick={() => setShowBank(true)} className="bg-slate-900/50 p-2 rounded-lg border border-slate-800 hover:bg-slate-800 hover:border-slate-600 transition-all text-left group">
                                            <div className="text-[10px] text-slate-500">Кредит 💳</div>
                                            <div className="font-mono text-red-400 group-hover:scale-105 transition-transform">${me.loanDebt?.toLocaleString()}</div>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                            <div className="text-[10px] text-slate-500">Доход</div>
                                            <div className="font-mono text-slate-200">${me.income?.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                            <div className="text-[10px] text-slate-500">Расходы</div>
                                            <div className="font-mono text-slate-200">${me.expenses?.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
                                        <span className="text-blue-400 font-bold text-sm">PAYDAY</span>
                                        <span className="font-mono font-bold text-green-400">+${me.cashflow?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Assets */}
                                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg">
                                    <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Ваши Активы</h3>
                                    {me.assets?.length > 0 ? (
                                        <div className="space-y-2">
                                            {me.assets.map((a: any, i: number) => (
                                                <div key={i} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded-lg">
                                                    <span className="text-slate-300">{a.title}</span>
                                                    <span className="font-mono text-green-400">+${a.cashflow}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-xs text-slate-600 text-center py-2">Нет активов</div>}
                                </div>
                            </>
                        )}

                        {(!showMobileMenu || mobileView === 'players') && (
                            <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg flex-1">
                                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Игроки в комнате</h3>
                                <div className="space-y-2">
                                    {state.players.map((p: any) => (
                                        <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl border ${p.id === currentPlayer.id ? 'bg-slate-800 border-blue-500/50' : 'bg-slate-900/30 border-slate-800/50'}`}>
                                            <div className="text-xl bg-slate-900 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800">{p.token}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-slate-200 truncate">{p.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">${p.cash?.toLocaleString()}</div>
                                            </div>
                                            {p.id === currentPlayer.id && <div className="text-[10px] text-blue-400 animate-pulse font-bold">Acting</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER BOARD */}
                <div className="flex-1 relative bg-[#0f172a] overflow-hidden flex flex-col">
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
                            <div className={`text-sm font-mono font-bold ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden p-2 lg:p-6 flex items-center justify-center">
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
                                                                {/* QUICK LOAN BUTTON */}
                                                                <button
                                                                    onClick={() => handleLoan((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash)}
                                                                    disabled={(me.loanDebt || 0) + ((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash) > 38000}
                                                                    className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-yellow-900/20 flex flex-col items-center justify-center gap-1"
                                                                >
                                                                    <span>🏦 Взять кредит</span>
                                                                    {((me.loanDebt || 0) + ((state.currentCard.downPayment ?? state.currentCard.cost) - me.cash) > 38000) && <span className="text-[9px] text-red-200">(Лимит)</span>}
                                                                </button>

                                                                {/* ASK HELP / TRANSFER */}
                                                                <button
                                                                    onClick={() => setShowBank(true)}
                                                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                                                >
                                                                    🤝 Попросить
                                                                </button>
                                                            </div>

                                                            <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs mt-1">
                                                                Отказаться и завершить ход
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
                        )}
                            </div>
                </div>

                    {/* RIGHT SIDEBAR (Desktop) */}
                    <div className="hidden lg:flex flex-col w-[350px] border-l border-slate-800 bg-[#0B0E14] p-4 relative">

                        {/* TIMER COMPONENT */}
                        <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg mb-4 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Текущий ход</div>
                                <div className="text-sm font-bold text-slate-200">{currentPlayer.name}</div>
                            </div>
                            <div className={`text-4xl font-mono font-black ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Actions Panel */}
                        <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg mb-4">
                            <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                                <span className="text-yellow-500">⚡</span> Действия
                            </h3>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={handleRoll}
                                    disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard}
                                    className={`p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-1 group transition-all ${isMyTurn && state.phase === 'ROLL' && !state.currentCard ? 'bg-green-600 text-white shadow-lg shadow-green-900/30 hover:bg-green-500 cursor-pointer' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'}`}
                                >
                                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎲</span>
                                    <span className="text-[10px] font-bold">БРОСОК</span>
                                </button>
                                <button
                                    onClick={handleEndTurn}
                                    disabled={!isMyTurn || (state.phase === 'ROLL' && !state.currentCard)}
                                    className={`p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-1 group transition-all ${isMyTurn && (state.phase !== 'ROLL' || !!state.currentCard) ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 cursor-pointer' : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'}`}
                                >
                                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">➡</span>
                                    <span className="text-[10px] font-bold">ДАЛЕЕ</span>
                                </button>
                            </div>
                            <button onClick={() => setShowBank(!showBank)} className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center justify-center gap-2 group transition-all hover:border-slate-600">
                                <span className="text-xl group-hover:scale-110 transition-transform">🏦</span>
                                <span className="text-xs text-slate-300 font-bold uppercase">Открыть Банк</span>
                            </button>
                        </div>

                        <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">События</h3>
                        <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800 p-2 overflow-y-auto font-mono text-xs space-y-2 custom-scrollbar">
                            {state.log?.slice().reverse().map((entry: string, i: number) => (
                                <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-1 last:border-0">{entry}</div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* BOTTOM NAV MOBILE */}
                <div className="lg:hidden bg-[#0B0E14] border-t border-slate-800 p-2 pb-6 z-50">
                    <div className="max-w-md mx-auto flex justify-between items-center gap-2">
                        <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="flex flex-col items-center gap-1 p-2 w-16 text-slate-400">
                            <span className="text-xl">☰</span>
                            <span className="text-[9px]">Menu</span>
                        </button>
                        <button
                            onClick={handleRoll}
                            disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard}
                            className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase
                             ${isMyTurn && state.phase === 'ROLL' && !state.currentCard ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-500 opacity-50'}`}
                        >
                            <span>🎲</span> ROLL
                        </button>
                        <button
                            onClick={handleEndTurn}
                            disabled={!isMyTurn || (state.phase === 'ROLL' && !state.currentCard)}
                            className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase
                             ${isMyTurn && (state.phase !== 'ROLL' || !!state.currentCard) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 opacity-50'}`}
                        >
                            <span>➡</span> NEXT
                        </button>
                        {/* BANK */}
                        <button
                            onClick={() => setShowBank(true)}
                            className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-16"
                        >
                            <span className="text-xl">🏦</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider">Банк</span>
                        </button>
                    </div>
                </div>

                <BankModal isOpen={showBank} onClose={() => setShowBank(false)} player={me} roomId={roomId} transactions={state.transactions} players={state.players} />
                {state.winner && (
                    <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-1000 backdrop-blur-md">
                        <div className="text-8xl mb-8 animate-bounce">🏆</div>
                        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-6 tracking-tighter shadow-2xl">ПОБЕДА!</h2>
                        <div className="text-3xl text-white mb-12 font-light"><span className="font-bold text-yellow-400">{state.winner}</span> Выграл!</div>
                        <button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg">Играть снова</button>
                    </div>
                )}
            </div>
            );
}
