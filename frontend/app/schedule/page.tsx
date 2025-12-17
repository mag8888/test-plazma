'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { useEffect, useState } from 'react';
import { Calendar, Users, ArrowRight, Clock } from 'lucide-react';

export default function SchedulePage() {
    const { webApp, user } = useTelegram();
    const [games, setGames] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

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
                        // MSK Time
                        const mskTime = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
                        const mskDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' });
                        const localTime = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const isDifferent = mskTime !== localTime;

                        return {
                            id: g._id,
                            time: mskTime,
                            date: mskDate,
                            localTime: isDifferent ? localTime : null,
                            master: g.hostId?.username || g.hostId?.first_name || 'Master',
                            players: g.participants?.length || 0,
                            max: g.maxPlayers,
                            price: g.price,
                            hostId: g.hostId?._id || g.hostId,
                            rawIso: g.startTime
                        };
                    });
                    setGames(formatted);
                }
            } catch (e) {
                console.error("Failed to fetch schedule", e);
            }
        };

        fetchGames();
    }, [refreshKey]); // Refresh when key changes

    const joinGame = (id: number) => {
        if (webApp) {
            webApp.HapticFeedback.impactOccurred('medium');
            webApp.showAlert(`Запрос на игру #${id} отправлен!`);
        }
    };

    // Edit Logic
    const [editingGame, setEditingGame] = useState<any>(null);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 space-y-4 pt-6 pb-24">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="text-blue-500" />
                Расписание
            </h1>

            {editingGame && (
                <ManageGameModal
                    gameId={editingGame.id} // Pass only ID, it fetches full details
                    onClose={() => setEditingGame(null)}
                    onUpdate={() => setRefreshKey(k => k + 1)}
                />
            )}

            <div className="space-y-3">
                {games.map(game => (
                    <div key={game.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 text-blue-400 font-bold mb-1">
                                        <Clock size={16} />
                                        {game.time} <span className="text-xs font-normal opacity-70">(МСК)</span>
                                    </div>
                                    {game.localTime && (
                                        <div className="text-xs text-slate-500 mb-1">
                                            {game.localTime} (Ваше время)
                                        </div>
                                    )}
                                    <div className="text-lg font-bold">{game.date}</div>
                                </div>
                            </div>
                            <div className="bg-slate-900 px-3 py-1 rounded-lg text-sm font-mono border border-slate-700 h-fit">
                                ${game.price}
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                            <span>👑 {game.master}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> {game.players}/{game.max}</span>
                        </div>

                        {game.hostId === user?.id ? (
                            <button
                                onClick={() => setEditingGame(game)}
                                className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 border border-slate-600"
                            >
                                ⚙️ Редактировать
                            </button>
                        ) : (
                            <button
                                onClick={() => joinGame(game.id)}
                                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                            >
                                Записаться <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Lazy load modal to avoid hydration issues? No, generic import is fine.
// But we need to import it.
// Replace imports and component usage
import ManageGameModal from './ManageGameModal';

// ... Inside SchedulePage component ...
{
    editingGame && (
        <ManageGameModal
            gameId={editingGame.id} // Pass only ID, it fetches full details
            onClose={() => setEditingGame(null)}
            onUpdate={() => setRefreshKey(k => k + 1)}
        />
    )
}

