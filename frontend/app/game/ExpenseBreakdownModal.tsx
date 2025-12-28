import React from 'react';
import { createPortal } from 'react-dom';

interface ExpenseBreakdownModalProps {
    breakdown: {
        taxes: number;
        homeMortgage: number;
        schoolLoanPayment: number;
        carLoanPayment: number;
        creditCardPayment: number;
        retailPayment: number;
        otherExpenses: number;
        childExpenses: number;
        bankLoanPayment: number;
        liabilityExpenses?: number;
    } | undefined;
    totalExpenses: number;
    onClose: () => void;
}

export const ExpenseBreakdownModal: React.FC<ExpenseBreakdownModalProps> = ({ breakdown, totalExpenses, onClose }) => {
    if (!breakdown) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1e2330] rounded-3xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl relative overflow-hidden">

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    📉 Структура расходов
                </h2>

                <div className="space-y-3 mb-6 font-mono text-sm">
                    {breakdown.taxes > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Налоги</span>
                            <span className="text-red-400">-${breakdown.taxes.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.homeMortgage > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Ипотека</span>
                            <span className="text-red-400">-${breakdown.homeMortgage.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.schoolLoanPayment > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Учеба</span>
                            <span className="text-red-400">-${breakdown.schoolLoanPayment.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.carLoanPayment > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Автокредит</span>
                            <span className="text-red-400">-${breakdown.carLoanPayment.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.creditCardPayment > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Кредитка</span>
                            <span className="text-red-400">-${breakdown.creditCardPayment.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.retailPayment > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Магазины</span>
                            <span className="text-red-400">-${breakdown.retailPayment.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.otherExpenses > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Прочие</span>
                            <span className="text-red-400">-${breakdown.otherExpenses.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.childExpenses > 0 && (
                        <div className="flex justify-between items-center text-yellow-300">
                            <span>Дети</span>
                            <span className="text-red-400">-${breakdown.childExpenses.toLocaleString()}</span>
                        </div>
                    )}
                    {breakdown.bankLoanPayment > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Кредит банка (10%)</span>
                            <span className="text-red-400">-${breakdown.bankLoanPayment.toLocaleString()}</span>
                        </div>
                    )}
                    {(breakdown.liabilityExpenses || 0) > 0 && (
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Расходы активов</span>
                            <span className="text-red-400">-${breakdown.liabilityExpenses?.toLocaleString()}</span>
                        </div>
                    )}

                    <div className="h-px bg-slate-700 my-2"></div>

                    <div className="flex justify-between items-center font-bold text-lg">
                        <span className="text-slate-400 uppercase text-xs tracking-wider">Итого</span>
                        <span className="text-red-500">-${totalExpenses.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                    Закрыть
                </button>
            </div>
        </div>,
        document.body
    );
};
