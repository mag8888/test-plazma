
interface ReadyModalProps {
    token: string;
    dream: string;
    initialName: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export function ReadyModal({ token, dream, initialName, onConfirm, onCancel }: ReadyModalProps) {
    const [name, setName] = React.useState(initialName);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] p-8 rounded-3xl max-w-md w-full border border-slate-700 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>

                <h2 className="text-2xl font-black text-white mb-6 text-center">Вы готовы? 🚀</h2>

                <div className="space-y-6">
                    {/* Token & Dream Preview */}
                    <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl shadow-lg border border-white/10">
                            {token}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Ваша Мечта</div>
                            <div className="text-indigo-300 font-bold truncate">{dream}</div>
                        </div>
                    </div>

                    {/* Name Edit */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Ваше Имя в игре</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-green-500 rounded-xl px-4 py-3 text-white outline-none transition-all font-bold text-lg"
                            placeholder="Введите имя..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => onConfirm(name)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            ПОГНАЛИ!
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full mt-3 text-slate-500 hover:text-white py-2 text-sm font-bold transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
