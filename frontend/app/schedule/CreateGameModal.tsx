import { useState } from 'react';
import { useTelegram } from '../../components/TelegramProvider';
import { X, Save, Clock, Users, MessageSquare, DollarSign } from 'lucide-react';
import { getBackendUrl } from '../../lib/config';

interface CreateGameModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateGameModal({ onClose, onSuccess }: CreateGameModalProps) {
    const { webApp } = useTelegram();
    const [loading, setLoading] = useState(false);

    // Time (Default next hour)
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    const defaultTime = nextHour.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

    const [timeVal, setTimeVal] = useState(defaultTime);
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [promoSpots, setPromoSpots] = useState(2);
    const [price, setPrice] = useState(20);
    const [description, setDescription] = useState('');

    const handleCreate = async () => {
        if (!timeVal) return;
        setLoading(true);
        try {
            // Construct Date (Assume Today if time is future, else Tomorrow)
            // Or simplified: Users usually schedule for upcoming.
            // Let's take today's date in MSK and apply time.
            const now = new Date();
            const [h, m] = timeVal.split(':').map(Number);

            // Getting current MSK details is tricky in browser without libraries.
            // Simplified approach: Create date with local year/month/day and apply MSK offset (UTC+3)

            const utcHour = h - 3;
            // Handle day wrapping if needed? 
            // Better: Let user just pick time, we assume today/tomorrow.

            const targetDate = new Date();
            targetDate.setUTCHours(utcHour, m, 0, 0);

            // If target is in past, add 1 day
            if (targetDate < new Date()) {
                targetDate.setDate(targetDate.getDate() + 1);
            }

            const res = await fetch(`${getBackendUrl()}/api/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    startTime: targetDate.toISOString(),
                    maxPlayers: Number(maxPlayers),
                    promoSpots: Number(promoSpots),
                    description,
                    price: Number(price)
                })
            });

            if (res.ok) {
                webApp?.showAlert('✅ Игра создана!');
                onSuccess();
                onClose();
            } else {
                webApp?.showAlert('❌ Ошибка создания');
            }
        } catch (e) {
            console.error(e);
            webApp?.showAlert('Ошибка сети');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-[100] animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-slate-700">
                <h2 className="text-lg font-bold">Создать игру</h2>
                <button onClick={onClose} className="p-2 bg-slate-700 rounded-full"><X size={20} /></button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                <div className="space-y-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                            <DollarSign size={14} /> Цена (вход)
                        </label>
                        <input
                            type="number"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-lg font-mono focus:border-blue-500 outline-none"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
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
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:text-slate-500"
                    >
                        {loading ? 'Создание...' : <> <Save size={18} /> Создать Игру </>}
                    </button>
                </div>
            </div>
        </div>
    );
}
