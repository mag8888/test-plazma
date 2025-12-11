"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '../../socket';
import GameBoard from './board';

interface Player {
    id: string;
    name: string;
    isReady: boolean;
    dream?: string;
    token?: string;
}

interface Room {
    id: string;
    name: string;
    players: Player[];
    status: string;
    creatorId: string;
}

export default function GameRoom() {
    const params = useParams(); // params can be Promise in newer Next.js, but using hook directly usually works or await
    const roomId = params.id as string;
    const router = useRouter();

    const [room, setRoom] = useState<Room | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [dream, setDream] = useState('Остров');
    const [token, setToken] = useState<string>('🔴'); // Default

    useEffect(() => {
        if (!roomId) return;

        socket.emit('join_room', { roomId }, (response: any) => {
            if (response.success) {
                setRoom(response.room);
            } else {
                alert("Error joining room: " + response.error);
                router.push('/lobby');
            }
        });

        socket.on('room_state_updated', (updatedRoom: Room) => {
            console.log('Room updated:', updatedRoom);
            setRoom(updatedRoom);
            // Check if self is ready
            const me = updatedRoom.players.find((p: any) => p.id === socket.id);
            if (me) setIsReady(me.isReady);
        });

        socket.on('game_started', () => {
            alert("Game Started! (Logic pending)");
        });

        return () => {
            socket.emit('leave_room', { roomId });
            socket.off('room_state_updated');
            socket.off('game_started');
        };
    }, [roomId]);

    const toggleReady = () => {
        socket.emit('player_ready', { roomId, isReady: !isReady, dream, token }, (res: any) => {
            if (!res.success) alert(res.error);
        });
    };

    const startGame = () => {
        socket.emit('start_game', { roomId });
    };

    if (!room) return <div className="p-8 text-white">Loading room...</div>;

    if (room.status === 'playing') {
        return <GameBoard roomId={roomId} initialState={{
            roomId,
            players: room.players, // Initial mock, real state comes from socket event
            currentPlayerIndex: 0,
            currentTurnTime: 120,
            phase: 'ROLL',
            board: [],
            log: []
        }} />;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex justify-between">
                    <button onClick={() => router.push('/lobby')} className="text-slate-400">← Назад</button>
                    <h1 className="text-2xl font-bold">{room.name} <span className="text-sm font-normal text-slate-500">#{room.id}</span></h1>
                </header>

                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
                    <h2 className="text-xl mb-4">Игроки ({room.players.length}/4)</h2>
                    <div className="space-y-2">
                        {room.players.map(player => (
                            <div key={player.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-slate-500'}`} />
                                    <span>{player.token || '❔'} {player.name} {player.id === socket.id && '(Вы)'}</span>
                                </div>
                                <div className="text-sm text-slate-400">
                                    {player.dream || 'Без мечты'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="mb-3 font-bold">Ваша подготовка</h3>

                        {/* Token Selection */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm text-slate-400">Выберите фишку:</label>
                            <div className="flex flex-wrap gap-2">
                                {['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🎱'].map((t) => {
                                    const isTaken = room.players.some(p => p.token === t && p.id !== socket.id);
                                    const isSelected = token === t;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => !isReady && setToken(t)}
                                            disabled={isTaken || isReady}
                                            className={`w-10 h-10 text-2xl flex items-center justify-center rounded-full transition-all border-2
                                                ${isSelected ? 'border-yellow-400 bg-slate-700 scale-110 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-transparent bg-slate-900'}
                                                ${isTaken ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-slate-700 cursor-pointer'}
                                            `}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <label className="flex flex-col gap-2 mb-6">
                            <span className="text-sm text-slate-400">Мечта:</span>
                            <select
                                value={dream}
                                onChange={(e) => setDream(e.target.value)}
                                className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
                                disabled={isReady}
                            >
                                <option>Остров</option>
                                <option>Вилла</option>
                                <option>Яхта</option>
                                <option>Личный самолет</option>
                                <option>Парк развлечений</option>
                                <option>Космический туризм</option>
                            </select>
                        </label>

                        <button
                            onClick={toggleReady}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg
                                ${isReady
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-900/20'
                                    : 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
                                }`}
                        >
                            {isReady ? '✖ Не готов' : '✔ Готов к игре'}
                        </button>
                    </div>

                    {room.creatorId === socket.id && (
                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30 border border-blue-500/50"
                            disabled={!room.players.every(p => p.isReady) || room.players.length < 1}
                        >
                            🚀 Начать игру
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
