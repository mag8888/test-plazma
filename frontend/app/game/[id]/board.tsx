"use client";

import { useEffect, useState } from 'react';
import { socket } from '../../socket';

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

    return (
        <div className={`h-screen flex flex-col ${me.isFastTrack ? 'bg-indigo-900' : 'bg-slate-900'} text-white`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-black/40 backdrop-blur-sm">
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

            <div className="flex-1 flex overflow-hidden">
                {/* Board Area */}
                <div className="flex-1 p-8 relative flex items-center justify-center bg-[url('/file.svg')] bg-opacity-5 bg-center bg-no-repeat">

                    {/* Central Board Circle */}
                    <div className={`relative w-[500px] h-[500px] rounded-full border-8 flex items-center justify-center transition-all duration-1000 ${me.isFastTrack ? 'border-yellow-500 shadow-[0_0_100px_rgba(234,179,8,0.3)]' : 'border-slate-700 shadow-2xl'}`}>

                        {/* Center Hub */}
                        <div className="text-center z-10 p-8 bg-slate-900/90 rounded-3xl backdrop-blur border border-slate-700 shadow-xl max-w-xs">
                            <h2 className="text-3xl font-bold mb-2 text-slate-200">{state.board[currentPlayer.position]?.name || 'Start'}</h2>
                            <p className="text-slate-500 text-sm mb-6 uppercase tracking-wider font-bold">{state.board[currentPlayer.position]?.type}</p>

                            {isMyTurn && state.phase === 'ROLL' && (
                                <button
                                    onClick={handleRoll}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 px-10 rounded-full text-xl shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Бросить 🎲
                                </button>
                            )}
                            {isMyTurn && state.phase === 'ACTION' && !state.currentCard && (
                                <button
                                    onClick={handleEndTurn}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-full shadow-lg"
                                >
                                    Завершить ход
                                </button>
                            )}
                        </div>

                        {/* Players on Board (Simplified Rendering) */}
                        {state.players.map((p: PlayerState, i: number) => {
                            // Calculate position on circle
                            const totalSquares = p.isFastTrack ? 48 : 24;
                            const angle = (p.position / totalSquares) * 360 - 90; // Start at top
                            const radius = 250 + (i * 5); // Slight offset to prevent overlap
                            const rad = angle * (Math.PI / 180);
                            const x = Math.cos(rad) * 250; // Just on border
                            const y = Math.sin(rad) * 250;

                            return (
                                <div
                                    key={p.id}
                                    className={`absolute w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold transition-all duration-500 z-20 tooltip`}
                                    style={{
                                        transform: `translate(${x}px, ${y}px)`,
                                        backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6'][i % 4]
                                    }}
                                    title={`${p.name} (Pos: ${p.position})`}
                                >
                                    {p.name.charAt(0)}
                                </div>
                            );
                        })}
                    </div>

                    {/* Card Popup Overlay */}
                    {state.currentCard && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                            <div className="bg-slate-800 p-8 rounded-2xl border-2 border-yellow-500 max-w-lg w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100 transition-all">
                                <div className="text-5xl mb-4">{
                                    state.currentCard.type === 'MARKET' ? '📈' :
                                        state.currentCard.type === 'EXPENSE' ? '💸' : '📄'
                                }</div>
                                <h3 className="text-3xl font-bold text-yellow-400 mb-4">{state.currentCard.title}</h3>
                                <p className="text-slate-300 text-lg mb-8 leading-relaxed">{state.currentCard.description}</p>

                                {state.currentCard.cost && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
                                        <div className="text-sm text-red-300 uppercase tracking-widest mb-1">Сумма к оплате</div>
                                        <div className="text-4xl text-red-500 font-mono font-bold">-${state.currentCard.cost.toLocaleString()}</div>
                                    </div>
                                )}

                                {isMyTurn ? (
                                    <button
                                        onClick={handleEndTurn}
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl text-xl shadow-lg transition-transform active:scale-95"
                                    >
                                        OK, ПОНЯТНО
                                    </button>
                                ) : (
                                    <div className="text-slate-500 animate-pulse">Ожидание решения игрока...</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar (HUD) */}
                <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col shadow-2xl z-20">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="font-bold mb-4 text-lg flex justify-between items-center text-slate-200">
                            Финансы
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{me.name}</span>
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-400 text-sm">Наличные</span>
                                    <span className="text-green-400 font-mono text-2xl font-bold tracking-tight">${me.cash?.toLocaleString() || 0}</span>
                                </div>
                                <div className="h-px bg-slate-600 mb-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-xs uppercase">Денежный поток</span>
                                    <span className="text-blue-400 font-mono text-lg font-bold">+${me.cashflow?.toLocaleString() || 0}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm bg-slate-900/20 p-4 rounded-xl">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Доходы</span>
                                    <span className="text-green-300 font-medium">${me.income?.toLocaleString()}</span>
                                </div>
                                <div className="pl-4 text-xs text-slate-600 flex justify-between">
                                    <span>Зарплата</span>
                                    <span>{me.salary}</span>
                                </div>
                                <div className="pl-4 text-xs text-slate-600 flex justify-between">
                                    <span>Пассивный</span>
                                    <span>{me.passiveIncome}</span>
                                </div>

                                <div className="flex justify-between pt-2 border-t border-slate-700/50 mt-2">
                                    <span className="text-slate-500">Расходы</span>
                                    <span className="text-red-300 font-medium">-${me.expenses?.toLocaleString()}</span>
                                </div>
                                <div className="pl-4 text-xs text-slate-600 flex justify-between">
                                    <span>Дети ({me.childrenCount}/3)</span>
                                    <span>-{me.childrenCount * me.childCost}</span>
                                </div>
                                <div className="pl-4 text-xs text-slate-600 flex justify-between">
                                    <span>Кредиты</span>
                                    <span>-{Number(me.loanDebt) * 0.1}</span> {/* Approx Interest */}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                        <button
                            onClick={() => setShowBank(!showBank)}
                            className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            🏦 Банк / Кредит
                        </button>

                        {showBank && (
                            <div className="mt-3 bg-slate-900 p-4 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                <div className="text-xs text-center text-slate-500 mb-3">
                                    Долг: <span className="text-red-400 font-mono">${me.loanDebt?.toLocaleString()}</span> | Ставка 10%
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleLoan(1000)} className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 py-2 rounded-lg text-xs font-bold transition-colors">Взять $1k</button>
                                    <button onClick={() => handleLoan(10000)} className="bg-emerald-900 hover:bg-emerald-800 text-emerald-100 py-2 rounded-lg text-xs font-bold transition-colors">Взять $10k</button>
                                    <button onClick={() => handleRepay(1000)} className="bg-red-900/50 hover:bg-red-900 text-red-200 py-2 rounded-lg text-xs font-bold transition-colors col-span-2 border border-red-900">Погасить $1k</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                        <h3 className="font-bold mb-3 text-xs uppercase tracking-widest text-slate-500">Лог событий</h3>
                        <ul className="text-xs space-y-2 text-slate-400 font-mono">
                            {state.log.slice().reverse().map((msg: string, i: number) => (
                                <li key={i} className="border-l-2 border-slate-700 pl-2 py-0.5">
                                    {msg}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
