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

export default function GameBoard({ roomId, initialState }: BoardProps) {
    const [state, setState] = useState(initialState);
    const [showBank, setShowBank] = useState(false);

    useEffect(() => {
        socket.on('dice_rolled', (data) => {
            setState(data.state);
        });

        socket.on('state_updated', (data) => {
            setState(data.state);
        });

        socket.on('turn_ended', (data) => {
            setState(data.state);
        });

        socket.on('game_started', (data) => {
            setState(data.state);
        });

        return () => {
            socket.off('dice_rolled');
            socket.off('turn_ended');
            socket.off('state_updated');
            socket.off('game_started');
        };
    }, []);

    const handleLoan = (amount: number) => {
        socket.emit('take_loan', { roomId, amount });
    }

    const handleRepay = (amount: number) => {
        socket.emit('repay_loan', { roomId, amount });
    }

    const handleRoll = () => {
        socket.emit('roll_dice', { roomId });
    };

    const handleEndTurn = () => {
        socket.emit('end_turn', { roomId });
    };

    const currentPlayer = state.players[state.currentPlayerIndex];
    const isMyTurn = currentPlayer.id === socket.id;
    const me = state.players.find((p: any) => p.id === socket.id) || {};

    // Animation State
    const [animatingPos, setAnimatingPos] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!state.players) return;
        // Sync animatingPos with real pos if not animating
        const newPosMap: Record<string, number> = {};
        state.players.forEach((p: any) => {
            if (animatingPos[p.id] === undefined) {
                newPosMap[p.id] = p.position;
            } else {
                newPosMap[p.id] = animatingPos[p.id];
            }
        });
        setAnimatingPos(prev => ({ ...prev, ...newPosMap }));
    }, [state.players]);

    // Handle Dice Roll Animation
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

                    setAnimatingPos(prev => ({
                        ...prev,
                        [p.id]: nextPos
                    }));
                }, 300);
                return () => clearInterval(interval);
            }
        });
    }, [state.players, animatingPos]);

    // Mobile Tabs State
    const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'actions'>('board');

    return (
        <div className="h-screen bg-[#0f172a] text-white font-sans flex flex-col lg:grid lg:grid-cols-[340px_1fr_300px] overflow-hidden">

            {/* MOBILE TABS HEADER */}
            <div className="lg:hidden flex bg-[#0B0E14] border-b border-slate-800 p-2 gap-2 z-50">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'stats' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500'}`}
                >
                    Stats
                </button>
                <button
                    onClick={() => setActiveTab('board')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'board' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500'}`}
                >
                    Board
                </button>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'actions' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500'}`}
                >
                    Actions
                </button>
            </div>

            {/* LEFT SIDEBAR: Stats & Bank */}
            <div className={`${activeTab === 'stats' ? 'flex' : 'hidden'} lg:flex flex-col gap-4 p-4 border-r border-slate-800 bg-[#0B0E14] overflow-y-auto custom-scrollbar h-full lg:h-auto`}>

                {/* Bank Card */}
                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">👷</span>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider leading-none">Профессия</span>
                                <span className="font-bold text-slate-200 leading-tight">{me.professionName || 'Безработный'}</span>
                            </div>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">Активен</span>
                    </div>

                    <div className="flex justify-between items-center mb-4 pt-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🏦</span>
                            <span className="font-bold text-slate-200">Банк</span>
                        </div>
                    </div>
                    <div className="text-center mb-6">
                        <div className="text-4xl font-bold text-green-400 mb-1 tracking-tight">${me.cash?.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Доступно</div>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded-lg">
                            <span className="text-slate-400 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Доход:</span>
                            <span className="font-mono font-bold text-slate-200">${me.income?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded-lg">
                            <span className="text-slate-400 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Расходы:</span>
                            <span className="font-mono font-bold text-slate-200">${me.expenses?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-700/50 mt-2">
                            <span className="text-slate-200 flex items-center gap-2"><span className="text-blue-400 text-lg">💎</span> Чистый доход:</span>
                            <span className="font-mono font-bold text-green-400 text-lg">+${me.cashflow?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Credit Card */}
                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg">
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">💳 Кредит:</span>
                            <span className="font-mono font-bold text-red-400 text-lg">${me.loanDebt?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Макс. кредит:</span>
                            <span className="font-mono text-slate-400">$38 000</span>
                        </div>
                    </div>
                </div>

                {/* Deal Counters */}
                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg flex-1">
                    <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Статистика</h3>
                    {[
                        { label: 'Малая сделка', count: '0/0' },
                        { label: 'Большие сделки', count: '0/0' },
                        { label: 'Расходы', count: '0/0' },
                        { label: 'Рынок', count: '0/0' }
                    ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 hover:border-slate-700/50 transition-colors">
                            <span className="text-slate-300 font-medium text-sm">{item.label}</span>
                            <span className="font-mono font-bold text-slate-500">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER: Board */}
            <div className={`${activeTab === 'board' ? 'flex' : 'hidden'} lg:flex relative bg-[#0f172a] items-center justify-center p-4 flex-1 overflow-hidden`}>
                <BoardVisualizer
                    board={state.board}
                    players={state.players}
                    animatingPos={animatingPos}
                    currentPlayerId={currentPlayer.id}
                />

                {state.currentCard && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-2xl max-w-md w-full text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                            <div className="text-6xl mb-6 bg-slate-800/50 w-24 h-24 mx-auto rounded-full flex items-center justify-center border border-slate-700">
                                {state.currentCard.type === 'MARKET' ? '🏠' : '💸'}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">{state.currentCard.title}</h2>
                            <p className="text-slate-400 mb-8 text-sm leading-relaxed">{state.currentCard.description}</p>

                            {state.currentCard.cost && (
                                <div className="bg-slate-900/50 p-4 rounded-2xl mb-8 border border-slate-800">
                                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Стоимость</div>
                                    <div className="text-3xl font-mono font-bold text-white mb-1">
                                        ${(state.currentCard.downPayment ?? state.currentCard.cost).toLocaleString()}
                                    </div>
                                    {state.currentCard.cashflow && (
                                        <div className="text-green-400 text-sm font-bold flex items-center justify-center gap-1">
                                            <span className="text-xs bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                +${state.currentCard.cashflow}/мес
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3">
                                {isMyTurn ? (
                                    state.currentCard.type === 'MARKET' ? (
                                        <>
                                            <button onClick={() => socket.emit('buy_asset', { roomId })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-green-900/20 hover:shadow-green-500/20">Купить</button>
                                            <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all border border-slate-600">Отказаться</button>
                                        </>
                                    ) : (
                                        <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all border border-slate-600">OK</button>
                                    )
                                ) : <div className="w-full text-slate-500 py-3 bg-slate-900/50 rounded-xl text-sm animate-pulse">Ожидание хода игрока...</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR: Actions & Players */}
            <div className={`${activeTab === 'actions' ? 'flex' : 'hidden'} lg:flex flex-col gap-4 p-4 border-l border-slate-800 bg-[#0B0E14] overflow-y-auto custom-scrollbar h-full lg:h-auto`}>

                {/* Actions Panel */}
                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 shadow-lg">
                    <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                        <span className="text-yellow-500">⚡</span> Действия
                    </h3>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <button onClick={() => setShowBank(!showBank)} className="bg-slate-800 p-2 rounded-xl border border-slate-700 hover:bg-slate-700 flex flex-col items-center gap-1 group transition-all hover:border-slate-600">
                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏦</span>
                            <span className="text-[10px] text-slate-400 font-bold">Банк</span>
                        </button>
                        <button
                            onClick={handleRoll}
                            disabled={!isMyTurn || state.phase !== 'ROLL'}
                            className={`bg-slate-800 p-2 rounded-xl border border-slate-700 hover:bg-slate-700 flex flex-col items-center gap-1 group transition-all ${isMyTurn && state.phase === 'ROLL' ? 'ring-1 ring-green-500 bg-green-500/10' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎲</span>
                            <span className="text-[10px] text-slate-400 font-bold">Бросок</span>
                        </button>
                        <button
                            onClick={handleEndTurn}
                            disabled={!isMyTurn || state.phase === 'ROLL'}
                            className={`bg-slate-800 p-2 rounded-xl border border-slate-700 hover:bg-slate-700 flex flex-col items-center gap-1 group transition-all ${isMyTurn && state.phase !== 'ROLL' ? 'ring-1 ring-blue-500 bg-blue-500/10' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">➡</span>
                            <span className="text-[10px] text-slate-400 font-bold">Далее</span>
                        </button>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center group cursor-pointer hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-xl group-hover:scale-110 transition-transform">💼</span>
                            <span className="text-sm text-slate-300 font-bold">Активы</span>
                        </div>
                        <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-green-900/50">$0</span>
                    </div>
                </div>

                {/* Players List */}
                <div className="bg-[#151b2b] rounded-2xl p-4 border border-slate-800 flex-1 flex flex-col shadow-lg">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">👥 Игроки</h3>
                        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">{state.players.length}/8</span>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                        {state.players.map((p: any) => (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${p.id === currentPlayer.id ? 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10 relative overflow-hidden' : 'bg-slate-900/30 border-slate-800/50 opacity-60'}`}>
                                {p.id === currentPlayer.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                <div className="text-2xl bg-slate-900 w-10 h-10 flex items-center justify-center rounded-lg border border-slate-800">{p.token}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-200 truncate">{p.name}</div>
                                    <div className="text-xs text-slate-500 font-mono">${p.cash.toLocaleString()}</div>
                                </div>
                                {p.id === currentPlayer.id && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>}
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Winner Overlay */}
            {state.winner && (
                <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-1000 backdrop-blur-md">
                    <div className="text-8xl mb-8 animate-bounce">🏆</div>
                    <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-6 tracking-tighter shadow-2xl">ПОБЕДА!</h2>
                    <div className="text-3xl text-white mb-12 font-light"><span className="font-bold text-yellow-400">{state.winner}</span> вышел на Фаст-Трек!</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-full text-xl shadow-[0_0_50px_rgba(22,163,74,0.6)] transition-all transform hover:scale-105"
                    >
                        Играть снова
                    </button>
                </div>
            )}
        </div>
    );
}
