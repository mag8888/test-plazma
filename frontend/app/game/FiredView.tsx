
import React, { useState } from 'react';

interface FiredViewProps {
    roomId: string;
    me: any;
    isMyTurn: boolean;
    socket: any;
}

export const FiredView = ({ roomId, me, isMyTurn, socket }: FiredViewProps) => {
    const [step, setStep] = useState<'CHOICE' | 'RESULT'>('CHOICE');
    const [choice, setChoice] = useState<{ type: string, label: string } | null>(null);

    // If not my turn, simply show waiting inline (or return null to show nothing? existing behavior showed modal).
    // Let's keep it inline but visually distinct.
    if (!isMyTurn) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500/80 animate-pulse bg-slate-900/40 rounded-2xl border border-slate-800/50 p-4">
                <div className="text-4xl mb-2 grayscale opacity-50">🤒</div>
                <div className="text-center">
                    <h2 className="text-sm font-bold text-slate-300 mb-1">Заболел</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest opacity-70">Другой игрок принимает решение...</p>
                </div>
            </div>
        );
    }

    const handleChoice = (type: 'PAY_1M' | 'PAY_2M' | 'BANKRUPT') => {
        if (type === 'BANKRUPT') {
            if (confirm('Вы уверены, что хотите объявить банкротство? Это сбросит ваши активы.')) {
                socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' });
            }
            return;
        }

        const is2M = type === 'PAY_2M';
        setChoice({
            type,
            label: is2M
                ? 'Вы оплатили расходы за 2 месяца. Вы продолжаете игру!'
                : 'Вы оплатили расходы за 1 месяц. Вы пропускаете 2 хода.'
        });
        setStep('RESULT');
    };

    const confirmPayment = () => {
        if (choice) {
            socket.emit('decision_downsized', { roomId, choice: choice.type });
        }
    };

    if (step === 'RESULT') {
        return (
            <div className="flex flex-col h-full w-full relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg animate-in fade-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-3">✅</div>
                    <h2 className="text-lg font-bold text-white mb-2">Оплата прошла</h2>
                    <p className="text-slate-300 text-xs mb-6 px-2">{choice?.label}</p>
                    <button onClick={confirmPayment} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform">
                        Продолжить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full relative bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg animate-in fade-in duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🤒</div>
                    <h2 className="text-lg font-bold text-white leading-tight">Заболел!</h2>
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Непредвиденные расходы</p>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl mb-4 text-center border border-white/5 mx-2">
                    <p className="text-slate-300 text-[11px] leading-snug">
                        Вам необходимо оплатить расходы для продолжения игры.
                    </p>
                </div>

                <div className="flex flex-col gap-2 mt-auto w-full">
                    <button
                        onClick={() => handleChoice('PAY_1M')}
                        disabled={(me?.cash || 0) < (me?.expenses || 0)}
                        className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded-xl flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-600 hover:border-slate-500 active:scale-[0.98]"
                    >
                        <div className="text-left">
                            <div className="text-slate-200 text-[10px] font-bold uppercase">1 Месяц</div>
                            <div className="text-slate-400 text-[9px]">Пропуск 2 ходов</div>
                        </div>
                        <span className="text-red-400 font-mono font-bold text-xs group-hover:text-red-300">-${(me?.expenses || 0).toLocaleString()}</span>
                    </button>

                    <button
                        onClick={() => handleChoice('PAY_2M')}
                        disabled={(me?.cash || 0) < (me?.expenses || 0) * 2}
                        className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded-xl flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-600 hover:border-slate-500 active:scale-[0.98]"
                    >
                        <div className="text-left">
                            <div className="text-slate-200 text-[10px] font-bold uppercase">2 Месяца</div>
                            <div className="text-slate-400 text-[9px]">Продолжить игру</div>
                        </div>
                        <span className="text-red-400 font-mono font-bold text-xs group-hover:text-red-300">-${((me?.expenses || 0) * 2).toLocaleString()}</span>
                    </button>

                    <button onClick={() => handleChoice('BANKRUPT')} className="text-red-500/50 text-[9px] mt-2 uppercase hover:text-red-400 transition-colors py-1">
                        Объявить банкротство
                    </button>
                </div>
            </div>
        </div>
    );
};
