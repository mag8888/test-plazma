
import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { getGameServiceUrl } from '../../lib/config';

interface BabyRollViewProperties {
    roomId: string;
    isMyTurn: boolean;
    socket: any;
}

export const BabyRollView = ({ roomId, isMyTurn, socket }: BabyRollViewProperties) => {
    // Auto-Roll Logic
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (!isMyTurn) return; // Don't run effect if not my turn (optional optimization)

        if (timeLeft <= 0) {
            // Auto Roll
            fetch(`${getGameServiceUrl()}/api/rooms/${roomId}/baby/roll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).catch(e => socket.emit('roll_dice', { roomId }));
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, roomId, socket, isMyTurn]);

    if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse text-xs">👶 Ожидание броска...</div>;

    return (
        <div className="flex flex-col h-full w-full relative bg-slate-900 rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>
            <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-mono">
                AUTO: {timeLeft}s
            </div>
            <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-3 animate-bounce">👶</div>
                <h2 className="text-lg font-bold text-white mb-2">Пополнение в семье!</h2>
                <p className="text-slate-400 text-xs mb-6">Бросьте кубик чтобы узнать родился ли ребенок</p>
                <button
                    onClick={async () => {
                        try {
                            const res = await fetch(`${getGameServiceUrl()}/api/rooms/${roomId}/baby/roll`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            if (!res.ok) throw new Error('Failed to roll');
                        } catch (e) {
                            console.error(e);
                            socket.emit('roll_dice', { roomId });
                        }
                    }}
                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl text-sm uppercase shadow-lg active:scale-95 transition-all"
                >
                    🎲 Бросить кубик
                </button>
            </div>
        </div>
    );
};
