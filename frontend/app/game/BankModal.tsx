"use client";

import { useState, useEffect } from 'react';
import { socket } from '../socket';

interface BankModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: any; // Current Player State
    roomId: string;
    transactions: any[];
    players: any[]; // List of all players for transfer
    initialRecipientId?: string;
    isTutorial?: boolean;
}

import { TutorialTip } from './TutorialTip';

export const BankModal = ({ isOpen, onClose, player, roomId, transactions, players, initialRecipientId, isTutorial }: BankModalProps) => {
    const [amount, setAmount] = useState<number>(0);
    const [recipientId, setRecipientId] = useState<string>(initialRecipientId || '');
    const [transferAmount, setTransferAmount] = useState<number>(0);
    const [showExpenses, setShowExpenses] = useState(false);

    // React to changes in initialRecipientId when modal opens
    useEffect(() => {
        if (isOpen && initialRecipientId) {
            setRecipientId(initialRecipientId);
        } else if (isOpen && !initialRecipientId) {
            // Optional: Reset if opened without recipient? 
            // setRecipientId(''); 
        }
    }, [isOpen, initialRecipientId]);

    if (!isOpen) return null;

    // Dynamic Max Loan: Based on Cashflow (10% interest rule)
    const maxNewLoan = Math.max(0, Math.floor((player.cashflow || 0) / 100) * 1000);
    const currentLoan = player.loanDebt || 0;
    const availableLoan = maxNewLoan;

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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4 animate-in fade-in duration-300">
            <div className="bg-[#1e293b]/90 backdrop-blur-2xl w-full max-w-4xl rounded-3xl border border-slate-700/50 shadow-[0_0_50px_rgba(30,41,59,0.5)] flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[90vh] overflow-y-auto overflow-x-hidden md:overflow-hidden relative group custom-scrollbar">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                {/* Close Button Mobile */}
                {/* Close Button Mobile - Sticky to ensure visibility */}
                <button onClick={onClose} className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-white z-50 bg-slate-900/50 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm">
                    ✕
                </button>

                {/* LEFT PANEL: Bank Status & Loan */}
                <div className="w-full md:w-1/3 bg-slate-900/60 p-8 flex flex-col gap-6 border-r border-slate-700/50 relative md:overflow-y-auto custom-scrollbar shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-800/20 to-transparent pointer-events-none"></div>

                    <button onClick={onClose} className="hidden md:flex items-center gap-2 absolute top-6 left-6 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest z-10">
                        <span>←</span> Назад
                    </button>

                    <div className="mt-8 md:mt-8 relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🏦</span>
                                <h2 className="text-2xl font-black text-white tracking-wide uppercase">Банк</h2>
                            </div>
                            <button
                                onClick={() => socket.emit('request_state', { roomId })}
                                className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all active:rotate-180 duration-300"
                                title="Обновить баланс"
                            >
                                🔄
                            </button>
                        </div>
                        <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] bg-emerald-950/50 inline-block px-3 py-1 rounded-full border border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">Система активна</div>
                    </div>

                    <div className="relative z-10 p-5 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50">
                        <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                            Баланс
                            {isTutorial && <TutorialTip text="1. Ваш текущий баланс" position="top-full mt-2" arrow="top-[-6px] border-b-emerald-500 border-t-0" />}
                        </div>
                        <div className="text-4xl md:text-5xl font-mono font-bold text-emerald-400 tracking-tighter drop-shadow-lg break-all">${player.cash?.toLocaleString()}</div>
                    </div>

                    <div className="space-y-3 text-sm bg-slate-800/30 p-5 rounded-2xl border border-slate-700/30 relative z-10">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                            <span className="text-emerald-400 font-bold tracking-wide relative">
                                ↗ ДОХОД
                                {isTutorial && <TutorialTip text="2. Ваша зарплата" position="left-full ml-4" arrow="left-[-6px] border-r-emerald-500 border-l-0" />}
                            </span>
                            <span className="text-white font-mono text-lg">${player.income?.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                            <span className="text-slate-400 font-bold tracking-wide text-xs relative">
                                ПАССИВНЫЙ
                                {isTutorial && <TutorialTip text="5. Доход от активов" position="left-full ml-4" arrow="left-[-6px] border-r-emerald-500 border-l-0" />}
                            </span>
                            <span className="text-emerald-400 font-mono text-lg">+${(player.passiveIncome || 0).toLocaleString()}</span>
                        </div>

                        {/* Expenses Toggle */}
                        <div
                            onClick={() => setShowExpenses(!showExpenses)}
                            className="flex justify-between items-center cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors group select-none"
                        >
                            <span className="text-red-400 font-bold tracking-wide flex items-center gap-2 relative">
                                ↘ РАСХОДЫ
                                {isTutorial && <TutorialTip text="3. Ваши расходы" position="left-full ml-4" arrow="left-[-6px] border-r-emerald-500 border-l-0" />}
                                <span className={`text-[10px] text-slate-500 transition-transform duration-300 ${showExpenses ? 'rotate-180' : ''}`}>▼</span>
                            </span>
                            <span className="text-white font-mono text-lg underline decoration-dashed decoration-slate-600 underline-offset-4 group-hover:decoration-slate-400 transition-all">
                                ${player.expenses?.toLocaleString()}
                            </span>
                        </div>

                        {/* Expenses Breakdown */}
                        {showExpenses && (
                            <div className="mt-2 pl-3 py-2 text-xs text-slate-400 space-y-1.5 border-l-2 border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between">
                                    <span>Налоги и Жизнь:</span>
                                    <span className="font-mono text-slate-300">${(player.expenses - (player.liabilities?.reduce((sum: number, l: any) => sum + (l.expense || 0), 0) || 0) - ((player.childrenCount || 0) * (player.childCost || 0))).toLocaleString()}</span>
                                </div>
                                {(player.childrenCount || 0) > 0 && (
                                    <div className="flex justify-between text-yellow-500/80">
                                        <span>Дети ({player.childrenCount}):</span>
                                        <span className="font-mono">${(player.childrenCount * player.childCost).toLocaleString()}</span>
                                    </div>
                                )}
                                {player.liabilities?.map((l: any, i: number) => (
                                    l.expense > 0 && (
                                        <div key={i} className="flex justify-between text-red-400/80">
                                            <span>{l.name}:</span>
                                            <span className="font-mono">${l.expense.toLocaleString()}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-3 border-t border-slate-700/50 items-center">
                            <span className="text-yellow-400 font-black tracking-widest text-xs relative">
                                PAYDAY
                                {isTutorial && <TutorialTip text="4. Доходы минус расходы" position="bottom-full mb-2" arrow="bottom-[-6px] border-t-emerald-500 border-b-0" />}
                            </span>
                            <span className="text-white font-mono font-bold text-xl drop-shadow">${player.cashflow?.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 shadow-inner relative z-10 flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Текущий Кредит</span>
                            <span className="text-red-400 font-mono font-black text-xl">${currentLoan.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-xs">
                            <span className="text-slate-500">Лимит:</span>
                            <span className="text-slate-500 font-mono text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">+${availableLoan.toLocaleString()}</span>
                        </div>

                        <input
                            type="number"
                            step={1000}
                            min={0}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white mb-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono placeholder:text-slate-600 text-sm"
                            placeholder="Сумма (кратно 1000)"
                            value={amount || ''}
                            onChange={e => setAmount(Number(e.target.value))}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handleRepayLoan} className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2">
                                Погасить
                            </button>
                            {/* Disabled for Fast Track */}
                            {player.isFastTrack ? (
                                <button disabled className="bg-slate-700/50 text-slate-500 py-2 rounded-lg font-bold text-sm transition-colors cursor-not-allowed border border-slate-700">
                                    Кредит недоступен
                                </button>
                            ) : (
                                <button onClick={handleTakeLoan} className="bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-red-900/20">
                                    Взять
                                </button>
                            )}
                        </div>
                        {amount > 0 && amount % 1000 !== 0 && <div className="text-red-500 text-xs mt-2 text-center">Сумма должна быть кратна $1,000</div>}
                        {amount > availableLoan && !player.isFastTrack && <div className="text-red-500 text-xs mt-2 text-center">Превышен лимит по денежному потоку</div>}
                        {player.isFastTrack && <div className="text-yellow-500/80 text-[10px] mt-2 text-center bg-yellow-500/10 p-2 rounded border border-yellow-500/20">Банковские кредиты недоступны на Скоростной Дорожке</div>}
                    </div>
                </div>

                {/* RIGHT PANEL: Transfer & History */}
                <div className="w-full md:w-2/3 p-4 md:p-8 flex flex-col gap-6 md:overflow-y-auto flex-1 bg-slate-900/40 relative z-10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="text-blue-400">⚡</span> Операции
                        </h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">✕</button>
                    </div>

                    {/* Transfer Section */}
                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h4 className="text-slate-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-blue-300/80">
                            <span className="text-lg">💸</span> Перевод средств
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 relative z-10">
                            <select
                                className="bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all text-sm appearance-none"
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
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all text-sm font-mono placeholder:text-slate-600"
                                    placeholder="Сумма"
                                    value={transferAmount || ''}
                                    onChange={e => setTransferAmount(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 relative z-10">
                            <button onClick={() => { setTransferAmount(0); setRecipientId(''); }} className="px-5 py-2.5 rounded-xl border border-slate-600/50 text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Сбросить</button>
                            <button onClick={handleTransfer} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold shadow-lg shadow-blue-900/30 transition-all text-xs uppercase tracking-wider active:scale-95 flex items-center gap-2">
                                Выполнить <span className="opacity-70">➤</span>
                            </button>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40 flex-1 min-h-[200px] flex flex-col shadow-inner">
                        <h4 className="text-slate-300 font-bold mb-4 flex items-center gap-3 text-sm uppercase tracking-wider">
                            <span>🕒</span> История операций <span className="bg-slate-700/50 text-slate-300 text-[10px] px-2 py-0.5 rounded-full border border-slate-600/50">{myHistory.length}</span>
                        </h4>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {myHistory.length === 0 ? (
                                <div className="text-slate-500 text-center py-12 flex flex-col items-center gap-2">
                                    <span className="text-4xl opacity-20">📜</span>
                                    <span className="text-sm">История пуста</span>
                                </div>
                            ) : (
                                myHistory.map((t, i) => (
                                    <div key={i} className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:bg-slate-800/40 hover:border-slate-700/50 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner ${t.type === 'TRANSFER' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                                {t.type === 'TRANSFER' ? '💸' : '🏦'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 text-sm">
                                                    {t.type === 'TRANSFER' ? (t.from === player.name ? `Перевод игроку ${t.to}` : `Перевод от ${t.from}`) : t.description}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wide font-bold mt-0.5">
                                                    {t.from === player.name ? 'Списание' : 'Пополнение'} • {new Date(t.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-mono font-bold text-sm bg-slate-950/30 px-2 py-1 rounded-lg border border-slate-800 ${t.from === player.name ? 'text-red-400' : 'text-emerald-400'}`}>
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
