
import { useState, useEffect } from 'react';
import { useTelegram } from '../../components/TelegramProvider';
import { X, Save, Clock, Users, Trash2, Send, MessageSquare, AlertCircle, Check, Trophy, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface ManageGameModalProps {
    gameId: string;
    onClose: () => void;
    onUpdate: () => void;
}

export default function ManageGameModal({ gameId, onClose, onUpdate }: ManageGameModalProps) {
    const { webApp } = useTelegram();
    const [loading, setLoading] = useState(true);
    const [game, setGame] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'broadcast'>('settings');

    // Settings State
    const [timeVal, setTimeVal] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [promoSpots, setPromoSpots] = useState(2);
    const [description, setDescription] = useState('');

    // Broadcast State
    const [message, setMessage] = useState('');

    const [message, setMessage] = useState('');

    // Private Message State
    const [dmTarget, setDmTarget] = useState<any>(null);
    const [dmText, setDmText] = useState('');

    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userStats, setUserStats] = useState<any>(null);

    useEffect(() => {
        fetchGameDetails();
    }, [gameId]);

    const fetchGameDetails = async () => {
        try {
            const res = await fetch(`/api/games/${gameId}`);
            if (res.ok) {
                const data = await res.json();
                setGame(data);
                // Init settings
                const d = new Date(data.startTime);
                // Convert to MSK for display input? 
                // Browser calc: 
                const mskTime = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
                setTimeVal(mskTime);
                setMaxPlayers(data.maxPlayers);
                setPromoSpots(data.promoSpots || 2);
                setDescription(data.description || '');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            // Reconstruct Date similar to before
            const originalDate = new Date(game.startTime);
            const [h, m] = timeVal.split(':').map(Number);
            const year = originalDate.getUTCFullYear();
            const month = originalDate.getUTCMonth();
            const day = originalDate.getUTCDate();

            // MSK is UTC+3. Input h is MSK. UTC h = h - 3.
            const utcHour = h - 3;
            const finalDate = new Date(Date.UTC(year, month, day, utcHour, m));

            const res = await fetch(`/api/games/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    startTime: finalDate.toISOString(),
                    maxPlayers: Number(maxPlayers),
                    promoSpots: Number(promoSpots),
                    description: description
                })
            });

            if (res.ok) {
                webApp?.showAlert('✅ Настройки сохранены!');
                onUpdate();
            } else {
                webApp?.showAlert('❌ Ошибка сохранения');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleKick = async (userId: string, name: string) => {
        if (!confirm(`Исключить игрока ${name}?`)) return;

        try {
            const res = await fetch(`/api/games/${gameId}/players/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${webApp?.initData}`
                }
            });
            if (res.ok) {
                webApp?.showAlert(`🚫 ${name} исключен`);
                fetchGameDetails(); // Refresh list
                onUpdate();
            } else {
                webApp?.showAlert('Ошибка удаления');
            }
        } catch (e) { console.error(e); }
    };

    const handleConfirmPlayer = async (userId: string, name: string) => {
        if (!confirm(`Подтвердить участие ${name}?`)) return;

        try {
            const res = await fetch(`/api/games/${gameId}/players/${userId}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ initData: webApp?.initData })
            });
            if (res.ok) {
                webApp?.showAlert(`✅ ${name} подтвержден`);
                fetchGameDetails();
                onUpdate();
            } else {
                webApp?.showAlert('Ошибка подтверждения');
            }
        } catch (e) { console.error(e); }
    };

    const handleShowProfile = async (user: any) => {
        setSelectedUser(user);
        setUserStats(null);
        try {
            // Fetch stats
            const res = await fetch(`/api/users/${user._id}/stats`);
            if (res.ok) {
                const data = await res.json();
                setUserStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch stats");
        }
    };

    // Open DM Modal
    const handleOpenDM = (user: any) => {
        setDmTarget(user);
        setDmText('');
    };

    const handleSendPrivateMessage = async () => {
        if (!dmText.trim() || !dmTarget) return;

        try {
            const res = await fetch(`/api/games/${gameId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    targetUserId: dmTarget._id,
                    message: dmText
                })
            });
            if (res.ok) {
                webApp?.showAlert(`📨 Сообщение отправлено ${dmTarget.first_name}`);
                setDmTarget(null);
                setDmText('');
            } else {
                webApp?.showAlert('❌ Ошибка отправки');
            }
        } catch (e) {
            console.error(e);
            webApp?.showAlert('❌ Ошибка сети');
        }
    };

    const handleBroadcast = async () => {
        if (!message.trim()) return;
        if (!confirm('Отправить сообщение всем участникам?')) return;

        try {
            const res = await fetch(`/api/games/${gameId}/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    message: message
                })
            });
            if (res.ok) {
                const d = await res.json();
                webApp?.showAlert(`📨 Отправлено ${d.sent} участникам`);
                setMessage('');
            } else {
                webApp?.showAlert('Ошибка отправки');
            }
        } catch (e) { console.error(e); }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="animate-spin text-blue-500"><Clock /></div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-[100] animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-slate-700">
                <h2 className="text-lg font-bold">Управление игрой</h2>
                <button onClick={onClose} className="p-2 bg-slate-700 rounded-full"><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-2 bg-slate-900">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-colors", activeTab === 'settings' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400")}
                >
                    Настройки
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-colors", activeTab === 'users' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400")}
                >
                    Игроки ({game?.participants?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('broadcast')}
                    className={clsx("flex-1 py-2 rounded-lg text-sm font-bold transition-colors", activeTab === 'broadcast' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400")}
                >
                    Рассылка
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">

                {activeTab === 'settings' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Clock size={14} /> Время (МСК)
                            </label>
                            <input
                                type="time"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-lg font-mono focus:border-blue-500 outline-none"
                                value={timeVal}
                                onChange={(e) => setTimeVal(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Users size={14} /> Мест всего
                            </label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-lg font-mono focus:border-blue-500 outline-none"
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <Users size={14} /> Промо мест
                            </label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-lg font-mono focus:border-blue-500 outline-none"
                                value={promoSpots}
                                onChange={(e) => setPromoSpots(Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                                <MessageSquare size={14} /> Описание / Примечание
                            </label>
                            <textarea
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-24 resize-none"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Добавьте примечание для участников..."
                            />
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> Сохранить
                        </button>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                        {game?.participants?.length === 0 ? (
                            <div className="text-center text-slate-500 py-10">Нет участников</div>
                        ) : (
                            game?.participants?.map((p: any) => (
                                <div key={p.userId._id} className="bg-slate-800 rounded-xl p-3 flex justify-between items-center border border-slate-700">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
                                        onClick={() => handleShowProfile(p.userId)}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400 overflow-hidden">
                                            {p.userId.photo_url ? (
                                                <img src={p.userId.photo_url} className="w-full h-full object-cover" />
                                            ) : (
                                                p.userId.first_name?.[0]
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-blue-400 hover:underline">
                                                {p.userId.first_name} {p.userId.username && <span className="text-slate-500 font-normal">@{p.userId.username}</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{p.type === 'PAID' ? '💰 Paid' : '🎟 Free'}</span>
                                                {p.isVerified && <span className="text-green-500">✅ Verif</span>}
                                                {p.postLink && <span className="text-blue-500">🔗 Link</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Show Confirm button if Promo & Not Verified */}
                                        {p.type === 'PROMO' && !p.isVerified && (
                                            <button
                                                onClick={() => handleConfirmPlayer(p.userId._id, p.userId.first_name)}
                                                className="p-2 hover:bg-green-900/50 rounded-lg text-green-500 bg-green-900/20 border border-green-900/50"
                                                title="Подтвердить"
                                            >
                                                <Check size={18} />
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenDM(p.userId); }}
                                            className="p-2 hover:bg-slate-700 rounded-lg text-blue-400"
                                            title="Написать"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleKick(p.userId._id, p.userId.first_name)}
                                            className="p-2 hover:bg-red-900/50 rounded-lg text-red-500"
                                            title="Исключить"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'broadcast' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/50 flex gap-3 text-blue-200 text-sm">
                            <AlertCircle className="shrink-0" size={20} />
                            <p>Это сообщение будет отправлено каждому участнику игры в личку от имени бота.</p>
                        </div>

                        <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-base focus:border-blue-500 outline-none h-40 resize-none"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Введите текст объявления..."
                        />

                        <button
                            onClick={handleBroadcast}
                            disabled={!message.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <Send size={18} /> Отправить ({game?.participants?.length})
                        </button>
                    </div>
                )}

            </div>

            {/* Profile Modal Overlay */}
            {selectedUser && (
                <div className="absolute inset-0 bg-black/90 p-4 z-50 animate-in fade-in duration-200">
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold">Профиль игрока</h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-800 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="flex flex-col items-center gap-4 mb-8">
                            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-blue-500 flex items-center justify-center overflow-hidden">
                                {selectedUser.photo_url ? (
                                    <img src={selectedUser.photo_url} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl text-slate-500">{selectedUser.first_name?.[0]}</span>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white">{selectedUser.first_name}</h3>
                                {selectedUser.username && <p className="text-blue-400">@{selectedUser.username}</p>}
                                {userStats?.isMaster && <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold mt-2 inline-block">👑 Master</span>}
                            </div>
                        </div>

                        {userStats ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                                    <Trophy className="text-yellow-500 mb-2" size={24} />
                                    <div className="text-2xl font-bold text-white">{userStats.wins}</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Побед</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                                    <Calendar className="text-blue-500 mb-2" size={24} />
                                    <div className="text-2xl font-bold text-white">{userStats.gamesPlayed}</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Игр</div>
                                </div>
                                <div className="col-span-2 bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                    <span className="text-slate-400">В игре с:</span>
                                    <span className="font-bold">{new Date(userStats.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center py-10">
                                <Clock className="animate-spin text-blue-500" />
                            </div>
                        )}

                        <div className="mt-auto">
                            <button
                                onClick={() => handleOpenDM(selectedUser)}
                                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={18} /> Написать сообщение
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DM Modal Overlay */}
            {dmTarget && (
                <div className="absolute inset-0 bg-black/90 p-4 z-[60] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-white">Сообщение игроку</h3>
                            <button onClick={() => setDmTarget(null)} className="p-1 hover:bg-slate-700 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden text-sm font-bold">
                                {dmTarget.photo_url ? <img src={dmTarget.photo_url} className="w-full h-full object-cover" /> : dmTarget.first_name?.[0]}
                            </div>
                            <div className="font-bold">{dmTarget.first_name}</div>
                        </div>

                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-32 resize-none"
                            value={dmText}
                            onChange={(e) => setDmText(e.target.value)}
                            placeholder="Введите сообщение..."
                            autoFocus
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => setDmTarget(null)}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSendPrivateMessage}
                                disabled={!dmText.trim()}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Send size={16} /> Отправить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
