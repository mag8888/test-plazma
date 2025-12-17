'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { useEffect, useState } from 'react';
import { Calendar, Users, ArrowRight, Clock } from 'lucide-react';

export default function SchedulePage() {
    const { webApp } = useTelegram();
    const [games, setGames] = useState<any[]>([]);

    // Mock Data loading
    useEffect(() => {
        const fetchGames = async () => {
            try {
                const res = await fetch('/api/games');
                if (res.ok) {
                    const data = await res.json();

                    // Transform backend model to UI model if needed
                    // Backend: { startTime (ISO), price, maxPlayers, participants: [], hostId: { username... } }
                    const formatted = data.map((g: any) => {
                        const dateObj = new Date(g.startTime);
                        const time = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const date = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

                        return {
                            id: g._id,
                            time,
                            date, // e.g. "25 ноября"
                            master: g.hostId?.username || g.hostId?.first_name || 'Master',
                            players: g.participants?.length || 0,
                            max: g.maxPlayers,
                            price: g.price
                        };
                    });
                    setGames(formatted);
                }
            } catch (e) {
                console.error("Failed to fetch schedule", e);
            }
        };

        fetchGames();
    }, []);

    const joinGame = (id: number) => {
        if (webApp) {
            webApp.HapticFeedback.impactOccurred('medium');
            webApp.showAlert(`Запрос на игру #${id} отправлен!`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 space-y-4 pt-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="text-blue-500" />
                Расписание
            </h1>

            <div className="space-y-3">
                {games.map(game => (
                    <div key={game.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2 text-blue-400 font-bold mb-1">
                                    <Clock size={16} />
                                    {game.time} <span className="text-xs font-normal opacity-70">(МСК)</span>
                                </div>
                                <div className="text-lg font-bold">{game.date}</div>
                            </div>
                            <div className="bg-slate-900 px-3 py-1 rounded-lg text-sm font-mono border border-slate-700">
                                ${game.price}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                            <span>👑 {game.master}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> {game.players}/{game.max}</span>
                        </div>

                        <button
                            onClick={() => joinGame(game.id)}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                        >
                            Записаться <ArrowRight size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
