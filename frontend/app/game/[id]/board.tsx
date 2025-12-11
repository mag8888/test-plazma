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
            <div className="flex-1 flex pt-20"> {/* Added padding-top for header */}
                {/* Center: Board */}
                <div className="flex-1 relative flex items-center justify-center bg-[#0B0E14]">
                    {/* The Board Container */}
                    <div className="h-screen bg-[#0f172a] text-white flex overflow-hidden font-sans select-none">
                        {/* Left Sidebar: Bank & Stats */}
                        <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 z-20 shadow-xl">
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50 shadow-lg">
                                <h2 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4 flex justify-center">Баланс</h2>
                                <div className="text-4xl font-mono text-green-400 font-bold text-center mb-2">
                                    ${me.cash?.toLocaleString()}
                                </div>
                                <div className="flex justify-between text-sm py-2 border-t border-slate-700/50">
                                    <span className="text-slate-500">Доход</span>
                                    <span className="text-green-500">+${me.income?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-t border-slate-700/50">
                                    <span className="text-slate-500">Расход</span>
                                    <span className="text-red-500">-${me.expenses?.toLocaleString()}</span>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-lg mt-2 flex justify-between items-center border border-slate-700">
                                    <span className="text-blue-400 font-bold text-sm">Денежный поток</span>
                                    <span className="text-blue-400 font-mono font-bold">+${me.cashflow?.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50 flex-1">
                                <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4">Лог событий</h3>
                                <ul className="space-y-3 text-xs text-slate-300 font-mono max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {state.log.slice().reverse().map((msg: string, i: number) => (
                                        <li key={i} className="border-l-2 border-blue-500/30 pl-3 py-1 leading-relaxed opacity-80 hover:opacity-100 transition-opacity">
                                            {msg}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Center: Grid Board */}
                        <div className="flex-1 bg-[#0B0E14] relative flex items-center justify-center p-8 overflow-hidden">
                            {/* Board Container */}
                            <div className="w-[800px] h-[800px] grid grid-cols-9 grid-rows-9 gap-2 relative">
                                <BoardVisualizer
                                    board={state.board}
                                    players={state.players}
                                    animatingPos={animatingPos}
                                    currentPlayerId={socket.id}
                                />
                            </div>

                            {/* Card Overlay */}
                            {state.currentCard && (
                                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                                    <div className="bg-slate-800 p-8 rounded-2xl border border-yellow-500/50 shadow-2xl max-w-md w-full text-center">
                                        <div className="text-6xl mb-6">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>
                                        <h2 className="text-2xl font-bold text-yellow-400 mb-2">{state.currentCard.title}</h2>
                                        <p className="text-slate-300 mb-8">{state.currentCard.description}</p>

                                        {state.currentCard.cost && (
                                            <div className="bg-slate-900 p-4 rounded-xl mb-8 border border-slate-700">
                                                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Стоимость</div>
                                                <div className="text-3xl font-mono text-white font-bold">
                                                    ${(state.currentCard.downPayment ?? state.currentCard.cost).toLocaleString()}
                                                </div>
                                                {state.currentCard.cashflow && (
                                                    <div className="text-green-400 text-sm mt-1">+${state.currentCard.cashflow} поток</div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            {isMyTurn ? (
                                                <>
                                                    {state.currentCard.type === 'MARKET' && (
                                                        <button onClick={() => socket.emit('buy_asset', { roomId })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all">Купить</button>
                                                    )}
                                                    <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all">
                                                        {state.currentCard.type === 'MARKET' ? 'Отказаться' : 'OK'}
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-full text-slate-500 py-3 animate-pulse">Ожидание хода игрока...</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar: Controls */}
                        <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 z-20 shadow-xl">
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50">
                                <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4 text-center">Действия</h3>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-slate-900 p-3 rounded-xl flex flex-col items-center justify-center border border-slate-700 h-24">
                                        <span className="text-3xl mb-1">{lastRoll || '-'}</span>
                                        <span className="text-[10px] text-slate-500 uppercase">Последний бросок</span>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded-xl flex flex-col items-center justify-center border border-slate-700 h-24">
                                        <div className="text-xl">{me.token || '😮'}</div>
                                        <span className="text-[10px] text-slate-500 uppercase mt-1">Ваша фишка</span>
                                    </div>
                                </div>

                                {isMyTurn ? (
                                    <div className="space-y-3">
                                        {state.phase === 'ROLL' && (
                                            <button onClick={handleRoll} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                                <span>🎲</span> Бросить кубик
                                            </button>
                                        )}
                                        {state.phase === 'ACTION' && !state.currentCard && (
                                            <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
                                                Завершить ход
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 p-4 rounded-xl text-center border dashed border-slate-700">
                                        <span className="text-slate-400 text-sm animate-pulse">Ход: {currentPlayer.name}</span>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowBank(!showBank)}
                                    className="w-full mt-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 py-3 rounded-xl transition-colors font-medium text-sm"
                                >
                                    🏦 Взять кредит
                                </button>

                                {showBank && (
                                    <div className="mt-3 bg-slate-900 p-3 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleLoan(1000)} className="flex-1 bg-green-900/50 hover:bg-green-900 text-green-400 py-2 rounded text-xs transition-colors">+$1k</button>
                                            <button onClick={() => handleRepay(1000)} className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-400 py-2 rounded text-xs transition-colors">-$1k</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Players List */}
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50 flex-1">
                                <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4">Игроки</h3>
                                <div className="space-y-2">
                                    {state.players.map((p: any) => (
                                        <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.id === currentPlayer.id ? 'bg-slate-700 border border-slate-600' : ''}`}>
                                            <div className="text-lg">{p.token}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate text-slate-200">{p.name}</div>
                                                <div className="text-xs text-slate-500 truncate">${p.cash.toLocaleString()}</div>
                                            </div>
                                            {p.id === currentPlayer.id && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    );
}
                    ```
