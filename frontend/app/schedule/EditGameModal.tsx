
import { useState } from 'react';
import { useTelegram } from '../../components/TelegramProvider';
import { X, Save, Clock, Users } from 'lucide-react';

interface EditGameModalProps {
    game: any;
    onClose: () => void;
    onUpdate: () => void;
}

export default function EditGameModal({ game, onClose, onUpdate }: EditGameModalProps) {
    const { webApp } = useTelegram();
    const [loading, setLoading] = useState(false);
    // Parse time to local input format if needed, but managing Date objects is safer
    // game.time is "HH:MM", game.date is "DD Month"
    // We need real ISO from backend usually, but here we might just edit Time part or Max Players.

    // For simplicity: Let's assume we send new "Time" (HH:MM) and convert it to Date on backend? 
    // NO, Backend `PUT` expects `startTime` as Date ISO.
    // The frontend `game` object we have in `SchedulePage` is transformed (stringified). 
    // We need the original ISO string or we need to reconstruct it.
    // Let's reconstruct or assume we only edit "Max Players" for now? 
    // User wants "Edit". Time is crucial.

    // Let's ask user to pick Time (MSK).
    const [timeVal, setTimeVal] = useState(game.time.split(' ')[0]); // Get 16:00 from "16:00"
    const [maxPlayers, setMaxPlayers] = useState(game.max);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Construct new Date ISO
            // We need the original date. `game.date` is "19 декабря". Hard to parse back to year.
            // WORKAROUND: Pass the raw `startTime` ISO from parent component.
            // For now, let's assume we can't change Date (Day), only Time.
            // We need to fetch the game or have raw data. 
            // I will update SchedulePage to pass raw iso.

            // Assuming `game.rawIso` exists (will add it).
            const originalDate = new Date(game.rawIso);
            const [h, m] = timeVal.split(':').map(Number);

            // Construct new date with SAME Day but NEW Time (MSK interpreted).
            // Logic: User inputs 18:00 (MSK).
            // We need to create a Date that represents 18:00 MSK today/that day.
            // 18:00 MSK = 15:00 UTC.
            // So we take original Day (UTC), set UTC hours to h-3.

            const newDate = new Date(originalDate);
            // This is tricky because originalDate is in Browser Time (or UTC).
            // Let's use UTC methods.
            // If original stored 16:00 MSK, it is 13:00 UTC.
            const year = originalDate.getUTCFullYear();
            const month = originalDate.getUTCMonth();
            const day = originalDate.getUTCDate();

            // New UTC Hour = Input Hour (MSK) - 3.
            const utcHour = h - 3;

            const finalDate = new Date(Date.UTC(year, month, day, utcHour, m));

            const res = await fetch(`/api/games/${game.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    startTime: finalDate.toISOString(),
                    maxPlayers: Number(maxPlayers)
                })
            });

            if (res.ok) {
                webApp?.showAlert('✅ Игра обновлена!');
                onUpdate();
                onClose();
            } else {
                webApp?.showAlert('❌ Ошибка обновления');
            }

        } catch (e) {
            console.error(e);
            webApp?.showAlert('Ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-6 border border-slate-700 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Редактирование</h2>
                    <button onClick={onClose} className="p-2 bg-slate-700 rounded-full"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                            <Clock size={14} /> Время (МСК)
                        </label>
                        <input
                            type="time"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-lg font-mono focus:border-blue-500 outline-none"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-lg font-mono focus:border-blue-500 outline-none"
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            min={2}
                            max={100}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        {loading ? 'Сохранение...' : 'Сохранить'} <Save size={18} />
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-3">Изменение времени автоматически уведомит участников (soon)</p>
                </div>
            </div>
        </div>
    );
}
