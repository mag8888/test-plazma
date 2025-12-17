
import { useState } from 'react';
import { useTelegram } from '../../components/TelegramProvider';
import { X, CheckCircle, Wallet, Ticket } from 'lucide-react';
import clsx from 'clsx';

interface JoinGameModalProps {
    game: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function JoinGameModal({ game, onClose, onSuccess }: JoinGameModalProps) {
    const { webApp, user } = useTelegram();
    const [loading, setLoading] = useState(false);

    // Calculate spots from game object passed props
    // WARNING: game object in SchedulePage might be transformed. 
    // We need logic. 
    // BUT checking spots is better done on backend or from fresh data.
    // Let's assume UI just shows buttons if backend accepts.
    // Or we rely on `game.freeSpots` if we added it.
    // SchedulePage only calculates `game.players`.
    // It doesn't break down Free/Paid. 
    // We should probably fetch fresh data OR just try blindly.
    // Showing buttons "Join Free" and "Join Paid" is good.

    const handleJoin = async (type: 'PROMO' | 'PAID') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/games/${game.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    type: type
                })
            });
            const data = await res.json();

            if (res.ok) {
                webApp?.HapticFeedback.notificationOccurred('success');
                webApp?.showAlert(`Вы успешно записаны! (${type === 'PROMO' ? 'Free' : 'Paid'})`);
                onSuccess();
                onClose();
            } else {
                webApp?.HapticFeedback.notificationOccurred('error');
                webApp?.showAlert(data.error || "Ошибка записи");
            }
        } catch (e) {
            console.error(e);
            webApp?.showAlert("Ошибка сети");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold">Запись на игру</h2>
                    <button onClick={onClose} className="p-2 bg-slate-700 rounded-full"><X size={20} /></button>
                </div>

                <p className="text-slate-400 text-sm mb-4">
                    Выберите тип участия. <br />
                    Платное участие гарантирует место.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => handleJoin('PROMO')}
                        disabled={loading}
                        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 p-4 rounded-xl flex items-center justify-between group transition-all active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-600 rounded-lg text-green-400 group-hover:text-green-300">
                                <Ticket size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold">Promo (Бесплатно)</div>
                                <div className="text-xs text-slate-400">Ограниченное кол-во</div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleJoin('PAID')}
                        disabled={loading}
                        className="w-full bg-blue-900/40 hover:bg-blue-900/60 border border-blue-500/30 disabled:opacity-50 p-4 rounded-xl flex items-center justify-between group transition-all active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-800 rounded-lg text-blue-300">
                                <Wallet size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-blue-200">Paid (${game.price})</div>
                                <div className="text-xs text-blue-400/70">Списание с баланса</div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
