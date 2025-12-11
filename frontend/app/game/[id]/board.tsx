"use client";

import { useEffect, useState } from 'react';
import { socket } from '../../socket';

interface BoardProps {
    roomId: string;
    initialState: any;
}

export default function GameBoard({ roomId, initialState }: BoardProps) {
    const [state, setState] = useState(initialState);
    const [lastRoll, setLastRoll] = useState<number | null>(null);

    const [showBank, setShowBank] = useState(false);

    useEffect(() => {
        socket.on('dice_rolled', (data) => {
            setLastRoll(data.roll);
            setState(data.state);
        });

        socket.on('state_updated', (data) => {
            setState(data.state);
        });

        socket.on('turn_ended', (data) => {
            setState(data.state);
        });

        return () => {
            socket.off('dice_rolled');
            socket.off('turn_ended');
            socket.off('state_updated');
        };
    }, []);

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

    const handleLoan = (amount: number) => {
        socket.emit('take_loan', { roomId, amount });
    }

    const handleRoll = () => {
        socket.emit('roll_dice', { roomId });
    };

    const handleEndTurn = () => {
        socket.emit('end_turn', { roomId });
    };

    const currentPlayer = state.players[state.currentPlayerIndex];
    const isMyTurn = currentPlayer.id === socket.id;

    return (
        <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
            {/* Left: Board Area */}
            <div className="flex-1 relative bg-slate-800 m-2 rounded-xl flex items-center justify-center border border-slate-700">
                <div className="absolute top-4 left-4 text-slate-400">
                    Room: {roomId} | Turn: {currentPlayer.name}
                </div>

                {/* Visual Board Mockup */}
                <div className="w-[600px] h-[600px] border-4 border-slate-600 rounded-full relative">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center">
                        <span className="text-2xl font-bold text-yellow-500">Fast Track</span>
                    </div>

                    {/* Render Players */}
                    {state.players.map((p: any, i: number) => {
                        // Math for circular position
                        const angle = (p.position / 24) * 360;
                        const radius = 250; // Half of 500 (inner ring)
                        const rad = (angle - 90) * (Math.PI / 180);
                        const x = Math.cos(rad) * radius + 300 - 16;
                        const y = Math.sin(rad) * radius + 300 - 16;

                        return (
                            <div
                                key={p.id}
                                className="absolute w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold"
                                style={{
                                    left: x,
                                    top: y,
                                    backgroundColor: ['red', 'blue', 'green', 'purple'][i % 4]
        <div className={`h-screen flex flex-col ${currentPlayer.isFastTrack ? 'bg-indigo-900' : 'bg-slate-900'} text-white`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-opacity-50 bg-black">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    Moneo Game <span className="text-xs px-2 py-1 rounded bg-slate-700">{roomId}</span>
                    {currentPlayer.isFastTrack && <span className="text-yellow-400 font-extrabold animate-pulse">🚀 FAST TRACK</span>}
                </h1>
                <div className="text-sm">
                    {state.phase === 'ROLL' && <span className="text-green-400 font-bold animate-bounce">Ваш ход! Бросайте кубик 🎲</span>}
                    {state.phase === 'ACTION' && <span className="text-blue-400">Действуйте...</span>}
                    {state.phase === 'END' && <span className="text-slate-400">Ожидание других...</span>}
                </div>
                <div className={`w-8 h-8 rounded-full bg-green-500`} title="Online" />
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Board Area */}
                <div className="flex-1 p-8 relative flex items-center justify-center">
                   {/* Simplified Board Visualization */}
                   <div className={`w-96 h-96 border-4 rounded-full flex items-center justify-center relative ${currentPlayer.isFastTrack ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)]' : 'border-slate-600'}`}>
                        {/* Player Marker */}
                        <div className="absolute top-0 -mt-4 bg-blue-500 px-3 py-1 rounded-full text-xs font-bold shadow-lg transform -translate-y-full">
                           Вы (Pos: {currentPlayer.position})
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-4">{state.board[currentPlayer.position]?.name || 'Square'}</h2>
                            {state.phase === 'ROLL' && (
                                <button 
                                    onClick={rollDice}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transform transition active:scale-95"
                                >
                                    Бросить кубик 🎲
                                </button>
                            )}
                        </div>
                   </div>
                </div>

                {/* Sidebar (HUD) */}
                <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col p-4 shadow-xl">
                    <h3 className="font-bold mb-4 text-lg border-b border-slate-700 pb-2">Финансы</h3>
                    
                    <div className="space-y-4 mb-6">
                        <div className="bg-slate-700/50 p-3 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-400">Наличные</span>
                                <span className="text-green-400 font-mono text-lg">${currentPlayer.cash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Денежный поток</span>
                                <span className="text-blue-400 font-mono text-lg">+${currentPlayer.cashflow.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                             <div className="flex justify-between border-b border-slate-700 pb-1">
                                 <span>Доходы (ЗП + Пассив):</span>
                                 <span className="text-green-300">${currentPlayer.income.toLocaleString()} (${currentPlayer.passiveIncome})</span>
                             </div>
                             <div className="flex justify-between border-b border-slate-700 pb-1">
                                 <span>Расходы:</span>
                                 <span className="text-red-300">-${currentPlayer.expenses.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between pt-1">
                                 <span>Кредиты (Долг):</span>
                                 <span className="text-red-400">-${currentPlayer.loanDebt.toLocaleString()}</span>
                             </div>
                        </div>

                         <div className="flex justify-between mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                             <span className="flex items-center gap-1">👶 Дети: {currentPlayer.childrenCount}/3</span>
                             <span>(-${currentPlayer.childrenCount * currentPlayer.childCost}/mo)</span>
                         </div>
                     </div>
                 </div>

                <div className="flex-1 overflow-y-auto">
                    <h3 className="font-bold mb-2">Лог игры</h3>
                    <ul className="text-sm space-y-1 text-slate-400">
                        {state.log.slice().reverse().map((msg: string, i: number) => (
                            <li key={i}>{msg}</li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 border-t border-slate-700 pt-6">
                    <button
                        onClick={() => setShowBank(!showBank)}
                        className="w-full mb-3 bg-blue-900/50 border border-blue-500 hover:bg-blue-900 py-2 rounded-lg"
                    >
                        🏦 Банк / Кредит
                    </button>

                    {showBank && (
                        <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-600">
                            <div className="flex gap-2">
                                <button onClick={() => handleLoan(1000)} className="flex-1 bg-green-700 py-2 rounded text-sm hover:bg-green-600">Взять $1k</button>
                                <button onClick={() => handleLoan(10000)} className="flex-1 bg-green-800 py-2 rounded text-sm hover:bg-green-700">Взять $10k</button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-center">Ставка: 10% в месяц</p>
                        </div>
                    )}

                    {isMyTurn ? (
                        <div className="space-y-3">
                            {state.phase === 'ROLL' && (
                                <button
                                    onClick={handleRoll}
                                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-xl text-xl transition-all"
                                >
                                    🎲 Бросить кубик
                                </button>
                            )}
                            {state.phase === 'ACTION' && (
                                <button
                                    onClick={handleEndTurn}
                                    className="w-full bg-slate-700 hover:bg-slate-600 font-bold py-4 rounded-xl text-xl"
                                >
                                    Завершить ход
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-4">
                            Ожидание хода {currentPlayer.name}...
                        </div>
                    )}
                </div>
            </div>
        </div>
                );
}
