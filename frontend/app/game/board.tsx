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

    useEffect(() => {
        socket.on('dice_rolled', (data) => setState(data.state));
        socket.on('state_updated', (data) => setState(data.state));
        socket.on('turn_ended', (data) => setState(data.state));
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
    const isMyTurn = currentPlayer.id === socket.id;
    const me = state.players.find((p: any) => p.id === socket.id) || {};

    // Animation State
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

    return (
        <div className="h-screen bg-[#0f172a] text-white font-sans flex flex-col overflow-hidden relative">

            {/* MAIN CONTENT GRID */}
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[340px_1fr_300px] overflow-hidden">

                {/* LEFT SIDEBAR (Desktop) / MOBILE MENU DRAWER */}
                <div className={`
                    fixed inset-0 z-40 bg-[#0B0E14]/95 backdrop-blur-md transition-transform duration-300 transform 
                    lg:relative lg:transform-none lg:flex lg:flex-col lg:bg-[#0B0E14] lg:border-r lg:border-slate-800 lg:z-auto
                    ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    {/* Mobile Menu Header */}
                    <div className="lg:hidden p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button onClick={() => setMobileView('stats')} className={`px-4 py-2 rounded-md text-xs font-bold ${mobileView === 'stats' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'}`}>Статистика</button>
                            <button onClick={() => setMobileView('players')} className={`px-4 py-2 rounded-md text-xs font-bold ${mobileView === 'players' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'}`}>Игроки</button>
                        </div>
                        <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400">✕</button>
                    </div>

                    <div className="p-4 overflow-y-auto custom-scrollbar h-full flex flex-col gap-4">
                        {(!showMobileMenu || mobileView === 'stats') && (
                            <>
                                {/* Profile Card */}
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
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                            <div className="text-[10px] text-slate-500">Доход</div>
                                            <div className="font-mono text-green-400">${me.income?.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                            <div className="text-[10px] text-slate-500">Расходы</div>
                                            <div className="font-mono text-red-400">${me.expenses?.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
                                        <span className="text-blue-400 font-bold text-sm">PAYDAY</span>
                                        <span className="font-mono font-bold text-green-400">+${me.cashflow?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Assets Summary */}
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
                                            {p.id === currentPlayer.id && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* VISUALIZER & GAME AREA */}
                <div className="flex-1 relative bg-[#0f172a] overflow-hidden flex flex-col">
                    {/* Top Info Bar Mobile */}
                    <div className="lg:hidden flex justify-between items-center p-3 bg-[#0B0E14] border-b border-slate-800 z-10 shadow-md">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl bg-slate-800 w-8 h-8 flex items-center justify-center rounded-full border border-slate-700">{me.token}</span>
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-slate-200 text-sm">{me.name}</span>
                                <span className="font-mono text-green-400 text-xs font-bold">${me.cash?.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ход игрока</div>
                            <div className="text-xs font-bold text-blue-400 animate-pulse">{currentPlayer.name}</div>
                        </div>
                    </div>

                    {/* Board */}
                    <div className="flex-1 relative overflow-hidden p-2 lg:p-6">
                        <BoardVisualizer
                            board={state.board}
                            players={state.players}
                            animatingPos={animatingPos}
                            currentPlayerId={currentPlayer.id}
                        />

                        {/* Card Overlay */}
                        {state.currentCard && (
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

                                    <div className="flex gap-2">
                                        {isMyTurn ? (
                                            state.currentCard.type === 'MARKET' ? (
                                                <>
                                                    <button onClick={handleBuy} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-green-900/20">Купить</button>
                                                    <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm">Пас</button>
                                                </>
                                            ) : (
                                                <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm">OK</button>
                                            )
                                        ) : <div className="w-full text-center text-slate-500 text-sm animate-pulse">Ожидание игрока...</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR (Desktop Only for Actions History/Chat?) - Hidden on Mobile */}
                <div className="hidden lg:flex flex-col w-[300px] border-l border-slate-800 bg-[#0B0E14] p-4">
                    <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">События</h3>
                    <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800 p-2 overflow-y-auto font-mono text-xs space-y-2 custom-scrollbar">
                        {state.log?.slice().reverse().map((entry: string, i: number) => (
                            <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-1 last:border-0">{entry}</div>
                        ))}
                    </div>
                </div>

            </div>

            {/* BOTTOM NAVIGATION BAR (Mobile & Desktop) */}
            <div className="bg-[#0B0E14] border-t border-slate-800 p-2 pb-6 lg:pb-2 z-50">
                <div className="max-w-md mx-auto flex justify-between items-center gap-2">
                    {/* MENU */}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-16"
                    >
                        <span className="text-xl">☰</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">Меню</span>
                    </button>

                    {/* ROLL / ACTION */}
                    <button
                        onClick={handleRoll}
                        disabled={!isMyTurn || state.phase !== 'ROLL' || !!state.currentCard}
                        className={`flex-1 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all transform active:scale-95 shadow-lg
                            ${isMyTurn && state.phase === 'ROLL' && !state.currentCard
                                ? 'bg-gradient-to-tr from-green-600 to-emerald-500 text-white shadow-green-900/30 ring-2 ring-green-400/50 animate-pulse-slow'
                                : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'}`}
                    >
                        <span className="text-2xl">🎲</span>
                        <span className="text-xs font-bold uppercase">Ход</span>
                    </button>

                    {/* PASS / NEXT */}
                    <button
                        onClick={handleEndTurn}
                        disabled={!isMyTurn || state.phase === 'ROLL' && !state.currentCard} // Enable if ACTION phase
                        className={`flex-1 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all transform active:scale-95 shadow-lg
                            ${isMyTurn && state.phase !== 'ROLL' && !state.currentCard
                                ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-900/30 ring-2 ring-blue-400/50'
                                : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'}`}
                    >
                        <span className="text-2xl">➡</span>
                        <span className="text-xs font-bold uppercase">Далее</span>
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

            {/* MODALS */}
            <BankModal
                isOpen={showBank}
                onClose={() => setShowBank(false)}
                player={me}
                roomId={roomId}
                transactions={state.transactions || []}
                players={state.players}
            />

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
