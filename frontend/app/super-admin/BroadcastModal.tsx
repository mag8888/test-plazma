import { useState } from 'react';
import { getBackendUrl } from '../../lib/config';
import { X, Upload, Users, DollarSign, Award } from 'lucide-react';

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Category = 'all' | 'avatars' | 'balance' | 'custom';
type Step = 'input' | 'recipients' | 'sending';

interface Recipient {
    id: string;
    username: string;
    first_name: string;
    telegram_id: number;
}

export default function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
    const [step, setStep] = useState<Step>('input');
    const [text, setText] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [category, setCategory] = useState<Category>('all');
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [sending, setSending] = useState(false);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCategorySelect = async (selectedCategory: Category) => {
        setCategory(selectedCategory);

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/admin/broadcast/recipients?category=${selectedCategory}`, {
                headers: {
                    'x-admin-secret': localStorage.getItem('admin_secret') || ''
                }
            });
            const data = await response.json();

            if (data.success) {
                setRecipients(data.recipients);
                setStep('recipients');
            } else {
                alert('Ошибка загрузки получателей');
            }
        } catch (error) {
            console.error('Error fetching recipients:', error);
            alert('Ошибка загрузки получателей');
        }
    };

    const handleRemoveRecipient = (userId: string) => {
        setRecipients(recipients.filter(r => r.id !== userId));
    };

    const handleSend = async () => {
        if (recipients.length === 0) {
            alert('Список получателей пуст');
            return;
        }

        setStep('sending');
        setSending(true);

        try {
            const payload = {
                message: text,
                recipients: recipients.map(r => r.telegram_id)
            };

            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/admin/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': localStorage.getItem('admin_secret') || ''
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ Рассылка завершена!\n📤 Отправлено: ${result.sent}\n❌ Ошибок: ${result.failed}`);
                handleClose();
            } else {
                alert('Ошибка: ' + result.error);
                setStep('recipients');
            }
        } catch (error) {
            console.error('Broadcast error:', error);
            alert('Ошибка отправки');
            setStep('recipients');
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        setStep('input');
        setText('');
        setPhoto(null);
        setPhotoPreview('');
        setCategory('all');
        setRecipients([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
                    <h2 className="text-2xl font-bold">
                        {step === 'input' && '📢 Рассылка'}
                        {step === 'recipients' && `👥 Получатели (${recipients.length})`}
                        {step === 'sending' && '📤 Отправка...'}
                    </h2>
                    <button onClick={handleClose} disabled={sending} className="text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {step === 'input' && (
                    <div className="p-6 space-y-6">
                        {/* Text Input */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Текст сообщения *</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Введите текст для рассылки..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                            />
                        </div>

                        {/* Photo Upload */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Фото (опционально)</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                    <p className="text-sm text-slate-400">
                                        {photo ? photo.name : 'Нажмите для загрузки'}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                            </label>
                            {photoPreview && (
                                <div className="mt-4 relative">
                                    <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                                    <button
                                        onClick={() => {
                                            setPhoto(null);
                                            setPhotoPreview('');
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-bold mb-3">Получатели</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleCategorySelect('all')}
                                    disabled={!text.trim()}
                                    className="p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-slate-400 hover:border-blue-500 hover:text-blue-300 transition flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Users size={24} />
                                    <span className="font-bold text-sm">Всем</span>
                                </button>

                                <button
                                    onClick={() => handleCategorySelect('avatars')}
                                    disabled={!text.trim()}
                                    className="p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-slate-400 hover:border-purple-500 hover:text-purple-300 transition flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Award size={24} />
                                    <span className="font-bold text-sm">С аватарами</span>
                                </button>

                                <button
                                    onClick={() => handleCategorySelect('balance')}
                                    disabled={!text.trim()}
                                    className="p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-slate-400 hover:border-green-500 hover:text-green-300 transition flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DollarSign size={24} />
                                    <span className="font-bold text-sm">С балансом</span>
                                </button>

                                <button
                                    onClick={() => handleCategorySelect('custom')}
                                    disabled={!text.trim()}
                                    className="p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-slate-400 hover:border-orange-500 hover:text-orange-300 transition flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <span className="font-bold text-sm">Вручную</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'recipients' && (
                    <div className="p-6 space-y-4">
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                            <p className="text-blue-300 text-sm">
                                📊 Найдено получателей: <strong>{recipients.length}</strong>
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                                Вы можете удалить кого-то из списка, нажав на крестик
                            </p>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto space-y-2">
                            {recipients.map((recipient) => (
                                <div
                                    key={recipient.id}
                                    className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {recipient.first_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{recipient.first_name || 'Пользователь'}</div>
                                            <div className="text-xs text-slate-400">@{recipient.username || recipient.telegram_id}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRecipient(recipient.id)}
                                        className="w-8 h-8 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-full flex items-center justify-center transition"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep('input')}
                                className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition"
                            >
                                ← Назад
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={recipients.length === 0}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ✅ Отправить рассылку ({recipients.length})
                            </button>
                        </div>
                    </div>
                )}

                {step === 'sending' && (
                    <div className="p-12 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xl font-bold">Отправка...</p>
                        <p className="text-slate-400 text-sm mt-2">Это может занять некоторое время</p>
                    </div>
                )}
            </div>
        </div>
    );
}
