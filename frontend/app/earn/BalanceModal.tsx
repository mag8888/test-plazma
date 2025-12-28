import { useState } from 'react';
import { X, Wallet, ArrowUpRight, ArrowDownLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { useTelegram } from '../../components/TelegramProvider';
import { partnershipApi } from '../../lib/partnershipApi';

interface BalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    tariff: string; // 'GUEST', 'PLAYER', 'MASTER', 'PARTNER'
    onTopUp: () => void;
}

export function BalanceModal({ isOpen, onClose, balance, tariff, onTopUp }: BalanceModalProps) {
    const { webApp } = useTelegram();
    const [activeTab, setActiveTab] = useState<'topup' | 'withdraw'>('topup');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (!webApp?.initData) return;
        setIsSyncing(true);
        try {
            const res = await partnershipApi.syncLegacyBalance(webApp.initData);
            if (res.success && res.synced > 0) {
                if (webApp) webApp.showAlert(`Успешно синхронизировано: $${res.synced}`);
                window.location.reload(); // Reload to refresh all data
            } else if (res.success && res.synced === 0) {
                if (webApp) webApp.showAlert('Нет средств для синхронизации');
            } else {
                if (webApp) webApp.showAlert('Ошибка синхронизации: ' + (res.error || 'Unknown'));
            }
        } catch (e) {
            console.error(e);
            if (webApp) webApp.showAlert('Ошибка сети');
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isOpen) return null;

    // Commission Logic
    // Guest: 70% comm (30% payout)
    // Player/Basic: 50% comm
    // Master/Advanced: 40% comm (60% payout)
    // Partner/Premium: 20% comm (80% payout)
    let commissionRate = 0.7; // Default Guest

    // Map Backend Types to UI Logic
    if (tariff === 'PLAYER' || tariff === 'BASIC') commissionRate = 0.5;
    if (tariff === 'MASTER' || tariff === 'ADVANCED') commissionRate = 0.4;
    // Partner/Premium: 20% comm (80% payout)
    if (tariff === 'PARTNER' || tariff === 'PREMIUM') commissionRate = 0.2;

    const payoutRate = 1 - commissionRate;

    // Calculate Payout
    const amountNum = parseFloat(withdrawAmount) || 0;
    const payoutAmount = amountNum * payoutRate;
    const commissionAmount = amountNum * commissionRate;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Wallet className="text-green-400" size={20} />
                        Управление балансом
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-slate-800">
                    <button
                        onClick={() => setActiveTab('topup')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'topup' ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        <ArrowDownLeft size={16} /> Пополнить
                    </button>
                    <button
                        onClick={() => setActiveTab('withdraw')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'withdraw' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        <ArrowUpRight size={16} /> Вывести
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">

                    <div className="text-center mb-6 relative">
                        {/* Debug Sync Button */}
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="absolute -top-2 right-0 p-2 text-slate-500 hover:text-blue-400 transition-colors"
                            title="Синхронизировать старый баланс"
                        >
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        </button>

                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Зеленый Баланс</div>
                        <div className="text-4xl font-black text-green-400">${balance.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 mt-1 px-4">
                            Доступно для покупки аватаров, подписок и вывода средств.
                        </div>
                    </div>

                    {activeTab === 'topup' ? (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl text-center">
                                <p className="text-green-200 text-sm mb-3">
                                    Пополните баланс через администратора для покупки аватаров и участия в программе.
                                </p>
                                <button
                                    onClick={onTopUp}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    Написать в поддержку
                                    <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">

                            {/* Tariff Info */}
                            <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-xl border border-slate-700">
                                <div className="text-xs text-slate-400">Ваш тариф:</div>
                                <div className={`text-xs font-bold px-2 py-0.5 rounded border ${tariff === 'PARTNER' || tariff === 'PREMIUM' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' :
                                    tariff === 'MASTER' || tariff === 'ADVANCED' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' :
                                        tariff === 'PLAYER' || tariff === 'BASIC' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30' :
                                            'bg-slate-600 text-slate-300 border-slate-500'
                                    }`}>
                                    {tariff === 'BASIC' ? 'PLAYER' :
                                        tariff === 'ADVANCED' ? 'MASTER' :
                                            tariff === 'PREMIUM' ? 'PARTNER' :
                                                (tariff || 'GUEST')}
                                </div>
                            </div>

                            {/* Withdrawal Form */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Сумма вывода</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:border-indigo-500 outline-none transition-colors"
                                    />
                                    <button
                                        onClick={() => setWithdrawAmount(balance.toString())}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-blue-400 px-2 py-1 rounded hover:bg-slate-700 transition"
                                    >
                                        МАКС
                                    </button>
                                </div>
                            </div>

                            {/* Calculation Breakdown */}
                            {amountNum > 0 && (
                                <div className="bg-slate-900/50 p-4 rounded-xl space-y-2 border border-slate-700/50">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Сумма вывода:</span>
                                        <span className="text-white font-bold">${amountNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400">Комиссия MONEO ({(commissionRate * 100).toFixed(0)}%):</span>
                                            {tariff === 'GUEST' && <span className="text-[9px] text-red-400">Повысьте тариф для снижения</span>}
                                        </div>
                                        <span className="text-red-400 font-bold">-${commissionAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-slate-700"></div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">Вы получите:</span>
                                        <span className="text-green-400 font-bold">${payoutAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Action */}
                            <button
                                disabled={amountNum <= 0 || amountNum > balance}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all"
                            >
                                {amountNum > balance ? 'Недостаточно средств' : 'Запросить вывод'}
                            </button>

                            <div className="flex items-start gap-2 text-[10px] text-slate-500 bg-slate-800/50 p-3 rounded-lg">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <div>
                                    Вывод средств обрабатывается в ручном режиме администратором. Обычно занимает от 15 минут до 24 часов.
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
