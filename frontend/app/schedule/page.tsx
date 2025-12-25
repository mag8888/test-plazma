'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { useEffect, useState } from 'react';
import { Calendar, Users, ArrowRight, Clock, X } from 'lucide-react';
import clsx from 'clsx';
import ManageGameModal from './ManageGameModal';
import JoinGameModal from './JoinGameModal';
import ParticipantsModal from './ParticipantsModal';

import CreateGameModal from './CreateGameModal'; // Added import

export default function SchedulePage() {
    const { webApp, user } = useTelegram();
    const [games, setGames] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'upcoming' | 'history'>('upcoming');
    const [refreshKey, setRefreshKey] = useState(0);

    // Edit Logic
    const [editingGame, setEditingGame] = useState<any>(null);
    const [joiningGame, setJoiningGame] = useState<any>(null);
    const [showingParticipants, setShowingParticipants] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false); // Added State

    // Mock Data loading
    useEffect(() => {
        const fetchGames = async () => {
            try {
                console.log('🗓️ [Schedule] Fetching games...', { viewMode, hasUser: !!user, userId: user?.id });
                const endpoint = viewMode === 'history' ? '/api/games?type=history' : '/api/games';
                const res = await fetch(endpoint);
                console.log('🗓️ [Schedule] Response status:', res.status);
                if (res.ok) {
                    const data = await res.json();
                    console.log('🗓️ [Schedule] Games fetched:', data.length, 'games');

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
                            hostId: (g.hostId?._id || g.hostId)?.toString(),
                            hostTelegramId: g.hostId?.telegram_id,
                            rawIso: g.startTime,
                            isJoined: g.participants?.some((p: any) => (p.userId?._id || p.userId) === user?.id),
                            rawParticipants: g.participants // Pass full list for Modal
                        };
                    });
                    setGames(formatted);
                } else {
                    console.error('🗓️ [Schedule] Fetch failed with status:', res.status);
                }
            } catch (e) {
                console.error("🗓️ [Schedule] Failed to fetch schedule", e);
            }
        };

        fetchGames();
    }, [refreshKey, user, viewMode]);

    const handleCancel = async (gameId: string) => {
        if (!confirm("Вы уверены, что хотите отменить запись?")) return;
        try {
            const res = await fetch(`/api/games/${gameId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData: webApp?.initData })
            });
            if (res.ok) {
                webApp?.showAlert("Запись отменена");
                setRefreshKey(k => k + 1);
            } else {
                webApp?.showAlert("Ошибка отмены");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 space-y-4 pt-6 pb-24">
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="text-blue-500" />
                    {viewMode === 'history' ? 'История игр' : 'Расписание'}
                </div>

                {/* Create Game Button (Only for Masters/Admins) */}
                {user?.isMaster && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-green-600 hover:bg-green-500 text-white p-2 text-sm rounded-lg font-bold flex items-center gap-1 shadow-lg shadow-green-900/20"
                    >
                        + Создать
                    </button>
                )}
            </h1>

            <button
                onClick={() => setViewMode(v => v === 'upcoming' ? 'history' : 'upcoming')}
                className={`fixed top-6 right-4 p-2 rounded-xl border transition-all ${viewMode === 'history' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                style={{ right: '1rem', top: '1.5rem', display: user?.isMaster ? 'none' : 'block' }} // Hide duplicate toggle for master if we place create button there? adjust layout
            >
                <Clock size={24} />
            </button>
            {/* Better Layout for Header buttons */}
            <div className="fixed top-6 right-4 flex gap-2">
                <button
                    onClick={() => setViewMode(v => v === 'upcoming' ? 'history' : 'upcoming')}
                    className={`p-2 rounded-xl border transition-all ${viewMode === 'history' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                >
                    <Clock size={20} />
                </button>
            </div>


            {editingGame && (
                <ManageGameModal
                    gameId={editingGame.id}
                    onClose={() => setEditingGame(null)}
                    onUpdate={() => setRefreshKey(k => k + 1)}
                />
            )}

            {showCreateModal && (
                <CreateGameModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => setRefreshKey(k => k + 1)}
                />
            )}

            {joiningGame && (
                <JoinGameModal
                    game={joiningGame}
                    onClose={() => setJoiningGame(null)}
                    onSuccess={() => setRefreshKey(k => k + 1)}
                />
            )}

            {showingParticipants && (
                <ParticipantsModal
                    game={showingParticipants}
                    onClose={() => setShowingParticipants(null)}
                />
            )}

            <div className="space-y-3">
                {games.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <div className="text-lg font-bold mb-2">
                            {viewMode === 'history' ? 'История пуста' : 'Нет запланированных игр'}
                        </div>
                        <div className="text-sm">
                            {(user?.isMaster && viewMode === 'upcoming')
                                ? 'Нажмите "Создать", чтобы запланировать игру'
                                : (viewMode === 'history' ? 'Вы еще не участвовали в играх' : 'Загляните позже')
                            }
                        </div>
                        {user?.isMaster && viewMode === 'upcoming' && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 bg-slate-800 text-blue-400 border border-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-700 transition"
                            >
                                Создать игру
                            </button>
                        )}
                    </div>
                ) : (
                    games.map(game => (
                        <div
                            key={game.id}
                            onClick={() => setShowingParticipants(game)}
                            className="bg-slate-800 rounded-xl p-4 border border-slate-700 relative overflow-hidden active:bg-slate-700 transition-colors cursor-pointer"
                        >
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

                            <div onClick={(e) => e.stopPropagation()}>
                                {/* Stop Propagation to prevent opening modal when clicking action buttons */}
                                {(game.hostId === user?.id || (game.hostTelegramId && game.hostTelegramId === user?.telegram_id)) ? (
                                    <button
                                        onClick={() => setEditingGame(game)}
                                        className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 border border-slate-600"
                                    >
                                        ⚙️ Редактировать
                                    </button>
                                ) : game.isJoined ? (
                                    <button
                                        onClick={() => handleCancel(game.id)}
                                        className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                                    >
                                        <X size={18} /> Отменить запись
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setJoiningGame(game)}
                                        className={clsx(
                                            "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-95",
                                            game.players >= game.max ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
                                        )}
                                        disabled={game.players >= game.max}
                                    >
                                        {game.players >= game.max ? "Мест нет" : <>Записаться <ArrowRight size={18} /></>}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}



