"use client";

import { useState } from 'react';
import { socket } from '../socket';

interface BankModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: any; // Current Player State
    roomId: string;
    transactions: any[];
    players: any[]; // List of all players for transfer
}

export const BankModal = ({ isOpen, onClose, player, roomId, transactions, players }: BankModalProps) => {
    const [amount, setAmount] = useState<number>(0);
    const [recipientId, setRecipientId] = useState<string>('');
    const [transferAmount, setTransferAmount] = useState<number>(0);

    if (!isOpen) return null;

    const maxLoan = 38000;
    const currentLoan = player.loanDebt || 0;
    const availableLoan = maxLoan - currentLoan; // Or however logic defines it

    // Filter transactions for this player (either from or to)
    const myHistory = transactions.filter(t => t.from === player.name || t.to === player.name);

    const handleTakeLoan = () => {
        if (amount <= 0) return;
        socket.emit('take_loan', { roomId, amount });
        setAmount(0);
    };

    const handleRepayLoan = () => {
        if (amount <= 0) return;
        socket.emit('repay_loan', { roomId, amount });
        setAmount(0);
    };

    const handleTransfer = () => {
        if (transferAmount <= 0 || !recipientId) return;
        socket.emit('transfer_funds', { roomId, toId: recipientId, amount: transferAmount });
        setTransferAmount(0);
        setRecipientId('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-4xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-auto">

                {/* Close Button Mobile */}
                <button onClick={onClose} className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-white">
                    ✕ Let's Close
                </button>

                {/* LEFT PANEL: Bank Status & Loan */}
                <div className="w-full md:w-1/3 bg-slate-900/50 p-6 flex flex-col gap-6 border-r border-slate-800 relative">
                    <button onClick={onClose} className="hidden md:block absolute top-4 left-4 text-slate-500 hover:text-white transition-colors text-sm">
                        ← Назад
                    </button>

                    <div className="mt-8 md:mt-4">
                        <h2 className="text-2xl font-bold text-white mb-1">🏦 Банк</h2>
                        <div className="text-green-400 text-xs uppercase tracking-widest bg-green-900/20 inline-block px-2 py-1 rounded border border-green-900/50">Активен</div>
                    </div>

                    <div>
                        <div className="text-5xl font-mono font-bold text-green-400 tracking-tight mb-2">${player.cash?.toLocaleString()}</div>
                        <div className="text-slate-500 text-sm">Доступно для операций</div>
                    </div>

                    <div className="space-y-2 text-sm bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between"><span className="text-green-400">↗ Доход:</span> <span className="text-white">${player.income?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-red-400">↘ Расходы:</span> <span className="text-white">${player.expenses?.toLocaleString()}</span></div>
                        <div className="flex justify-between pt-2 border-t border-slate-700"><span className="text-yellow-400 font-bold">PAYDAY:</span> <span className="text-white font-bold">${player.cashflow?.toLocaleString()}/мес</span></div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-400 text-sm">Кредит:</span>
                            <span className="text-red-400 font-mono font-bold">${currentLoan.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-xs">
                            <span className="text-slate-500">Макс:</span>
                            <span className="text-slate-500 font-mono">${maxLoan.toLocaleString()}</span>
                        </div>

                        <input
                            type="number"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mb-3 outline-none focus:border-blue-500"
                            placeholder="Сумма"
                            value={amount || ''}
                            onChange={e => setAmount(Number(e.target.value))}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleRepayLoan} className="bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-green-900/20">
                                Погасить
                            </button>
                            <button onClick={handleTakeLoan} className="bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-red-900/20">
                                Взять
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Transfer & History */}
                <div className="w-full md:w-2/3 p-6 flex flex-col gap-6 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Банковские операции</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors">✕</button>
                    </div>

                    {/* Transfer Section */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        <h4 className="text-slate-300 font-bold mb-4 flex items-center gap-2">Перевод средств</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <select
                                className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                                value={recipientId}
                                onChange={e => setRecipientId(e.target.value)}
                            >
                                <option value="">Выберите получателя</option>
                                {players.filter(p => p.id !== player.id).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <input
                                    type="number"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-blue-500"
                                    placeholder="Сумма"
                                    value={transferAmount || ''}
                                    onChange={e => setTransferAmount(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setTransferAmount(0); setRecipientId(''); }} className="px-6 py-2 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">Сбросить</button>
                            <button onClick={handleTransfer} className="px-8 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-all">Выполнить перевод ➤</button>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex-1 min-h-[200px]">
                        <h4 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
                            <span>🕒</span> История операций <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">{myHistory.length}</span>
                        </h4>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {myHistory.length === 0 ? (
                                <div className="text-slate-500 text-center py-8">Операций пока нет</div>
                            ) : (
                                myHistory.map((t, i) => (
                                    <div key={i} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${t.type === 'TRANSFER' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {t.type === 'TRANSFER' ? '💸' : '🏦'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200">
                                                    {t.type === 'TRANSFER' ? (t.from === player.name ? `Перевод игроку ${t.to}` : `Перевод от ${t.from}`) : t.description}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    {t.from === player.name ? 'Списание' : 'Пополнение'} • {new Date(t.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-mono font-bold text-lg ${t.from === player.name ? 'text-red-400' : 'text-green-400'}`}>
                                            {t.from === player.name ? '-' : '+'}${t.amount.toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
