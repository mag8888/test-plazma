import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface TransferCashModalProps {
    isOpen: boolean;
    onClose: () => void;
    target: { id: string; name: string; avatar?: string; photo_url?: string };
    maxCash: number;
    onTransfer: (amount: number) => void;
}

export const TransferCashModal = ({ isOpen, onClose, target, maxCash, onTransfer }: TransferCashModalProps) => {
    const [amount, setAmount] = useState('');

    const handleConfirm = () => {
        const val = Number(amount);
        if (val > 0 && val <= maxCash) {
            onTransfer(val);
        }
    };

    if (!isOpen || !target) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl p-6 relative flex flex-col gap-4">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                <div className="text-center">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wide">Перевод Денег</h2>
                    <p className="text-xs text-slate-400 mt-1">Отправьте деньги другому игроку</p>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between border border-slate-700/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border-2 border-slate-600">
                            Вы
                        </div>
                        <span className="text-xs font-bold text-slate-400">Ваш Баланс</span>
                        <span className="text-sm font-mono text-green-400 font-bold">${maxCash.toLocaleString()}</span>
                    </div>

                    <ChevronRight className="text-slate-600" />

                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden border-2 border-blue-500">
                            {(target.avatar || target.photo_url) ? (
                                <img src={target.avatar || target.photo_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold">{target.name?.[0]}</div>
                            )}
                        </div>
                        <span className="text-xs font-bold text-white max-w-[80px] truncate">{target.name}</span>
                        <span className="text-xs text-blue-400">Получатель</span>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase ml-1 mb-1 block">Сумма перевода</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-2xl font-mono font-bold text-center focus:border-blue-500 outline-none text-white placeholder:text-slate-700"
                        autoFocus
                    />
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!amount || Number(amount) <= 0 || Number(amount) > maxCash}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-wider"
                >
                    Отправить
                </button>
            </div>
        </div>
    );
};
