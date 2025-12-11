"use client";

import { useEffect, useState } from 'react';
import { socket } from '../../socket';
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

    // Board Configuration
    // Rat Race: 24 Squares (Inner Loop)
    const RAT_RACE_LAYOUT = [
        // Bottom Row (Right to Left)
        { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 }, { x: 0, y: 5 },
        // Left Column (Bottom to Top)
        { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 },
        // Top Row (Left to Right)
        { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
        // Right Column (Top to Bottom)
        { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }
    ];
    // This is just a rough shape, need to map exactly to 24 indices for logic. 
    // Actually, let's use a function to generate coords on a relative 100x100 grid or similar.

    // Animation State
    const [animatingPos, setAnimatingPos] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!state.players) return;
        // Sync animatingPos with real pos if not animating
        const newPosMap: Record<string, number> = {};
        state.players.forEach((p: any) => {
            // If we don't have a record, set it. If we do, keep it (animation hook handles updates)
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
        // This effect will trigger whenever state.players changes.
        // We need to compare the current player's position in `state` with their `animatingPos`.
        state.players.forEach((p: PlayerState) => {
            const currentDisplayPos = animatingPos[p.id] ?? p.position;
            if (currentDisplayPos !== p.position) {
                // Animate
                let nextPos = currentDisplayPos;
                const interval = setInterval(() => {
                    if (nextPos === p.position) {
                        clearInterval(interval);
                        return;
                    }
                    // Handle Wrap (24 squares for Rat Race)
                    const max = p.isFastTrack ? 48 : 24;
                    nextPos = (nextPos + 1) % max;

                    setAnimatingPos(prev => ({
                        ...prev,
                        [p.id]: nextPos
                    }));
                }, 300); // Speed of movement
                return () => clearInterval(interval); // Cleanup on unmount or re-render
            }
        });
    }, [state.players, animatingPos]); // Depend on animatingPos to re-evaluate if animation is needed

    const getBoardCoordinates = (index: number, isFastTrack: boolean) => {
        // Custom coordinates to match the image style (Square loops)
        if (!isFastTrack) {
            // Inner Loop (24 squares)
            // Let's define a 7x7 grid logic (indices 0..23)
            // 0..6 (Bottom), 7..11 (Left), 12..17 (Top), 18..23 (Right)
            const width = 600;
            const height = 600;
            const padding = 100;
            const innerSize = 400; // 400x400 box

            // Simple Box Path
            // 0-6: Bottom Edge (Right to Left)
            if (index <= 6) return { x: 500 - (index * 66), y: 500 };
            // 7-11: Left Edge (Bottom to Top)
            if (index <= 12) return { x: 100, y: 500 - ((index - 6) * 66) };
            // ... This is tedious. Let's use CSS grid or pre-calc.
        }
        return { x: 0, y: 0 };
    }

    // New Render Logic
    return (
        <div className="h-screen bg-slate-900 flex text-white overflow-hidden font-sans">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 border-b border-slate-700 flex justify-between items-center bg-black/40 backdrop-blur-sm z-30">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    MONEO <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">{roomId}</span>
                    {me.isFastTrack && <span className="text-yellow-400 font-extrabold animate-pulse ml-2 text-sm border border-yellow-500 px-2 py-0.5 rounded-full">🚀 FAST TRACK</span>}
                </h1>
                <div className="text-sm font-medium">
                    {state.phase === 'ROLL' && isMyTurn && <span className="text-green-400 animate-pulse">🎲 Ваш ход!</span>}
                    {state.phase === 'ROLL' && !isMyTurn && <span className="text-slate-400">Ход: {currentPlayer.name}</span>}
                    {state.phase === 'ACTION' && <span className="text-blue-400">Действие...</span>}
                    {state.phase === 'END' && <span className="text-slate-400">Завершение хода</span>}
                </div>
                <div className={`w-3 h-3 rounded-full ${socket.connected ? 'bg-green-500' : 'bg-red-500'}`} title={socket.connected ? "Online" : "Offline"} />
            </div>

            {/* Main Content Area (Board + Sidebar) */}
            <div className="flex-1 flex pt-20 relative">
                {/* Header (Absolute) */}
                <div className="absolute top-0 left-0 right-0 h-20 px-8 border-b border-slate-700 flex justify-between items-center bg-slate-900/90 backdrop-blur-md z-30">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">MONEO</span>
                        <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">{roomId}</span>
                        {me.isFastTrack && <span className="text-yellow-400 font-extrabold animate-pulse ml-4 text-sm border border-yellow-500/50 bg-yellow-900/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]">🚀 FAST TRACK</span>}
                    </h1>

                    <div className="text-lg font-medium flex items-center gap-4">
                        {state.phase === 'ROLL' && isMyTurn && <span className="text-green-400 animate-pulse font-bold flex items-center gap-2">🎲 Ваш ход!</span>}
                        {state.phase === 'ROLL' && !isMyTurn && <span className="text-slate-400">Ход: <span className="text-white">{currentPlayer.name}</span></span>}
                        {state.phase === 'ACTION' && <span className="text-blue-400">Действие...</span>}
                        {state.phase === 'END' && <span className="text-slate-500">Завершение...</span>}

                        <div className={`w-3 h-3 rounded-full shadow-lg ${socket.connected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500'}`} title={socket.connected ? "Online" : "Offline"} />
                    </div>
                </div>

                {/* Center: Board */}
                <div className="flex-1 relative flex items-center justify-center bg-[#0B0E14] overflow-hidden">
                    {/* The Board Container */}
                    <div className="relative w-[800px] h-[800px] bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl p-4">
                        {/* Custom Board Implementation */}
                        <BoardVisualizer
                            board={state.board}
                            players={state.players}
                            animatingPos={animatingPos}
                            currentPlayerId={currentPlayer.id}
                        />

                        {/* Center Hub */}
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="text-center p-8 bg-slate-900/95 rounded-3xl backdrop-blur-xl border border-slate-700 shadow-2xl max-w-xs pointer-events-auto transform transition-all hover:scale-105">
                                <h2 className="text-3xl font-bold mb-2 text-slate-200">{state.board[currentPlayer.position]?.name || 'Start'}</h2>
                                <p className="text-slate-500 text-sm mb-6 uppercase tracking-wider font-bold">{state.board[currentPlayer.position]?.type}</p>

                                {isMyTurn && state.phase === 'ROLL' && (
                                    <button
                                        onClick={handleRoll}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-12 rounded-full text-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/30"
                                    >
                                        Бросить 🎲
                                    </button>
                                )}
                                {isMyTurn && state.phase === 'ACTION' && !state.currentCard && (
                                    <button
                                        onClick={handleEndTurn}
                                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-full shadow-lg border border-slate-600"
                                    >
                                        Завершить ход
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card Popup Overlay */}
                    {state.currentCard && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-slate-800 p-8 rounded-2xl border border-yellow-500/50 shadow-2xl max-w-md w-full text-center">
                                <div className="text-6xl mb-6">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>
                                <h2 className="text-2xl font-bold text-yellow-400 mb-2">{state.currentCard.title}</h2>
                                <p className="text-slate-300 mb-8 leading-relaxed">{state.currentCard.description}</p>

                                {state.currentCard.cost && (
                                    <div className="bg-slate-900 p-4 rounded-xl mb-8 border border-slate-700">
                                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                                            {state.currentCard.downPayment ? 'Первый взнос' : 'Стоимость'}
                                        </div>
                                        <div className="text-3xl font-mono text-white font-bold">
                                            ${(state.currentCard.downPayment ?? state.currentCard.cost).toLocaleString()}
                                        </div>
                                        {state.currentCard.cashflow && (
                                            <div className="text-green-400 text-sm mt-1 font-mono font-bold">+${state.currentCard.cashflow} поток</div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    {isMyTurn ? (
                                        <>
                                            {state.currentCard.type === 'MARKET' ? (
                                                <>
                                                    <button onClick={() => socket.emit('buy_asset', { roomId })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20">Купить</button>
                                                    <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all border border-slate-600">Отказаться</button>
                                                </>
                                            ) : (
                                                <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all border border-slate-600">OK</button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="w-full text-slate-500 py-3 animate-pulse bg-slate-900 rounded-xl">Ожидание хода игрока...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Controls */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 z-20 shadow-xl">
                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50">
                        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4 text-center">Статус</h3>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-900 p-3 rounded-xl flex flex-col items-center justify-center border border-slate-700 h-24">
                                <span className="text-4xl font-bold text-slate-200">{state.lastRoll || '-'}</span>
                                <span className="text-[10px] text-slate-500 uppercase mt-1">Кубик</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl flex flex-col items-center justify-center border border-slate-700 h-24 relative overflow-hidden">
                                <div className="text-3xl">{me.token || '😮'}</div>
                                <span className="text-[10px] text-slate-500 uppercase mt-1">Вы</span>
                                <div className="absolute -bottom-4 -right-4 text-6xl opacity-5 grayscale pointer-events-none">{me.token}</div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowBank(!showBank)}
                            className="w-full mt-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 py-3 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        >
                            🏦 Банк
                        </button>

                        {showBank && (
                            <div className="mt-3 bg-slate-900 p-3 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                <div className="text-xs text-center text-slate-500 mb-3">
                                    Кредит: <span className="text-red-400 font-mono">${me.loanDebt?.toLocaleString()}</span> (10%)
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleLoan(1000)} className="bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 border border-emerald-800 py-2 rounded-lg text-xs font-bold transition-colors">+$1,000</button>
                                    <button onClick={() => handleLoan(10000)} className="bg-emerald-900/30 hover:bg-emerald-800 text-emerald-400 border border-emerald-800 py-2 rounded-lg text-xs font-bold transition-colors">+$10,000</button>
                                    <button onClick={() => handleRepay(1000)} className="bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-900 py-2 rounded-lg text-xs font-bold transition-colors col-span-2">Погасить $1,000</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Players List */}
                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50 flex-1 flex flex-col">
                        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4">Игроки онлайн</h3>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {state.players.map((p: any) => (
                                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${p.id === currentPlayer.id ? 'bg-slate-700/80 border-slate-500 shadow-lg' : 'bg-slate-900/50 border-slate-800'}`}>
                                    <div className="text-2xl">{p.token}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold truncate text-slate-200 flex justify-between">
                                            {p.name}
                                            {p.id === currentPlayer.id && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2 self-center"></span>}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate font-mono">${p.cash.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
