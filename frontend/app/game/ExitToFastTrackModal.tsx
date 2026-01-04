import React from 'react';

interface ExitToFastTrackModalProps {
    onClose: () => void;
    player: {
        name?: string;
        cash: number;
        passiveIncome: number;
        loanDebt: number;
        expenses: number;
    };
    onConfirm?: () => void; // Optional future action
}

export const ExitToFastTrackModal: React.FC<ExitToFastTrackModalProps> = ({ onClose, player, onConfirm }) => {
    // Guard: Prevent crash if player is undefined
    if (!player) return null;

    // Requirements
    const reqLoan = player.loanDebt <= 0;
    // Backend Rule: Passive Income >= 10,000 (User Request)
    const reqPassive = player.passiveIncome >= 10000;
    const reqCash = player.cash >= 200000;

    // Check if debt is negative (should trigger 0 check visually) or exactly 0
    // Actually loanDebt is usually positive if debt exists.

    const allReady = reqLoan && reqPassive && reqCash;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-6 text-center">
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">Выход на Большой Трек</h2>
                    <div className="text-xs text-white/50">{player.name || 'Unknown Player'}</div>
                    <p className="text-pink-100 text-sm mt-1">Выполните условия для победы в крысиных бегах</p>
                </div>

                <div className="p-6 space-y-4">

                    {/* Requirement 1: Loan */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${reqLoan ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${reqLoan ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {reqLoan ? '✅' : '🏦'}
                            </div>
                            <div>
                                <div className="font-bold text-slate-200">Погасить кредит</div>
                                <div className="text-xs text-slate-500">Текущий долг: <span className="font-mono text-white">${player.loanDebt.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div className={`font-bold ${reqLoan ? 'text-green-400' : 'text-red-400'}`}>
                            {reqLoan ? 'Готово' : `-${player.loanDebt.toLocaleString()}`}
                        </div>
                    </div>

                    {/* Requirement 2: Passive Income */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${reqPassive ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${reqPassive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {reqPassive ? '✅' : '📈'}
                            </div>
                            <div>
                                <div className="font-bold text-slate-200">Пассивный доход</div>
                                <div className="text-xs text-slate-500">Цель: $10,000</div>
                            </div>
                        </div>
                        <div className={`font-bold ${reqPassive ? 'text-green-400' : 'text-red-400'}`}>
                            ${player.passiveIncome.toLocaleString()}
                        </div>
                    </div>

                    {/* Requirement 3: Cash */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${reqCash ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${reqCash ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {reqCash ? '✅' : '💰'}
                            </div>
                            <div>
                                <div className="font-bold text-slate-200">Накопить деньги</div>
                                <div className="text-xs text-slate-500">Цель: $200,000</div>
                            </div>
                        </div>
                        <div className={`font-bold ${reqCash ? 'text-green-400' : 'text-red-400'}`}>
                            ${player.cash.toLocaleString()}
                        </div>
                    </div>

                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0">
                    <button
                        disabled={!allReady}
                        onClick={allReady ? onConfirm : undefined}
                        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all
                            ${allReady
                                ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20 active:scale-[0.98]'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                    >
                        {allReady ? 'ВЫЙТИ НА БОЛЬШОЙ ТРЕК 🚀' : 'Условия не выполнены'}
                    </button>
                    {!allReady && (
                        <button onClick={onClose} className="w-full mt-3 py-2 text-slate-500 hover:text-white text-sm font-medium">
                            Закрыть
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
