import { useState } from 'react';
import { X, Upload, Users, DollarSign, Award } from 'lucide-react';

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Category = 'all' | 'avatars' | 'balance' | 'custom';

export default function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
    const [text, setText] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [category, setCategory] = useState<Category>('all');
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

    const handleSend = async () => {
        if (!text.trim()) {
            alert('Введите текст сообщения');
            return;
        }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('category', category);
            if (photo) {
                formData.append('photo', photo);
            }

            const response = await fetch('/api/broadcast', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ Рассылка завершена!\n📤 Отправлено: ${result.sent}\n❌ Ошибок: ${result.failed}`);
                onClose();
                setText('');
                setPhoto(null);
                setPhotoPreview('');
                setCategory('all');
            } else {
                alert('Ошибка: ' + result.error);
            }
        } catch (error) {
            console.error('Broadcast error:', error);
            alert('Ошибка отправки');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
                    <h2 className="text-2xl font-bold">📢 Рассылка</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Text Input */}
                    <div>
                        <label className="block text-sm font-bold mb-2">Текст сообщения *</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Введите текст для рассылки..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                            disabled={sending}
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
                                disabled={sending}
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
                                onClick={() => setCategory('all')}
                                disabled={sending}
                                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${category === 'all'
                                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Users size={24} />
                                <span className="font-bold text-sm">Всем</span>
                            </button>

                            <button
                                onClick={() => setCategory('avatars')}
                                disabled={sending}
                                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${category === 'avatars'
                                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Award size={24} />
                                <span className="font-bold text-sm">С аватарами</span>
                            </button>

                            <button
                                onClick={() => setCategory('balance')}
                                disabled={sending}
                                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${category === 'balance'
                                        ? 'border-green-500 bg-green-500/20 text-green-300'
                                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <DollarSign size={24} />
                                <span className="font-bold text-sm">С балансом</span>
                            </button>

                            <button
                                onClick={() => setCategory('custom')}
                                disabled={sending}
                                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${category === 'custom'
                                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                <span className="font-bold text-sm">Вручную</span>
                            </button>
                        </div>
                    </div>

                    {/* Send Button */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSend}
                            disabled={sending || !text.trim()}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? '📤 Отправка...' : '✅ Отправить рассылку'}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={sending}
                            className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition disabled:opacity-50"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
