
import { useState } from 'react';
import { useTelegram } from '../../components/TelegramProvider';
import { X, CheckCircle, Wallet, Ticket, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';

interface JoinGameModalProps {
    game: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function JoinGameModal({ game, onClose, onSuccess }: JoinGameModalProps) {
    const { webApp, user } = useTelegram();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'SELECT' | 'PROMO_LINK'>('SELECT');
    const [repostLink, setRepostLink] = useState('');

    const handleJoin = async (type: 'PROMO' | 'PAID', link?: string) => {
        if (type === 'PROMO' && !link) {
            setStep('PROMO_LINK');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/games/${game.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: webApp?.initData,
                    type: type,
                    repostLink: link
                })
            });
            const data = await res.json();

            if (res.ok) {
                webApp?.HapticFeedback.notificationOccurred('success');
                webApp?.showAlert(`Вы успешно записаны! (${type === 'PROMO' ? 'Заявка отправлена' : 'Оплачено'})`);
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

                {step === 'SELECT' ? (
                    <>
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
                                        <div className="text-xs text-slate-400">Нужен репост</div>
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
                    </>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-right duration-200">
                        <div className="bg-blue-500/10 p-4 rounded-xl text-sm text-blue-200 border border-blue-500/20">
                            Для бесплатного участия необходимо сделать репост анонса игры. <br />
                            <span className="text-xs opacity-70">Вы можете прикрепить ссылку сейчас или отправить её мастеру лично.</span>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Ссылка на репост (необязательно)</label>
                            <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-3 border border-slate-700 focus-within:border-blue-500 transition-colors">
                                <LinkIcon size={18} className="text-slate-500" />
                                <input
                                    type="text"
                                    className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
                                    placeholder="https://t.me/..."
                                    value={repostLink}
                                    onChange={(e) => setRepostLink(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('SELECT')}
                                className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-slate-300"
                            >
                                Назад
                            </button>
                            <button
                                onClick={() => handleJoin('PROMO', repostLink)}
                                disabled={loading}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20"
                            >
                                {repostLink.trim() ? 'Отправить' : 'Пропустить'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
