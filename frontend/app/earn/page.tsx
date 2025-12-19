'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { Copy, Gift, TrendingUp, Users, Wallet, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { partnershipApi } from '../../lib/partnershipApi';
import { ProgramDescription } from './ProgramDescription';

export default function EarnPage() {
    const { webApp, user } = useTelegram();
    const [totalUsers, setTotalUsers] = useState(0);
    const [partnershipUser, setPartnershipUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [showRefillModal, setShowRefillModal] = useState(false);
    const [missingAmount, setMissingAmount] = useState(0);

    // Use username if available, else ID. Bot handle corrected to MONEO_game_bot
    const referralLink = `https://t.me/MONEO_game_bot?start=${user?.username || user?.id || 'unknown'}`;

    useEffect(() => {
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
                if (data.users) setTotalUsers(data.users);
            })
            .catch(err => console.error("Stats fetch error", err));

        if (user?.id) {
            // Login/Sync with Partnership Backend
            // We use user.id (Telegram ID) to get the internal DB User
            partnershipApi.login(user.id.toString(), user.username)
                .then(dbUser => {
                    setPartnershipUser(dbUser);
                })
                .catch(err => console.error("Partnership login error", err));
        }
    }, [user]);

    const handleBuy = async (tariff: string, price: number) => {
        if (!partnershipUser) return;
        if (isLoading) return;

        // 1. Check Green Balance
        const balance = partnershipUser.greenBalance || 0;
        if (balance < price) {
            setMissingAmount(price - balance);
            setShowRefillModal(true);
            return;
        }

        if (webApp) {
            webApp.HapticFeedback.impactOccurred('medium');
        }

        if (!confirm(`Купить тариф ${tariff} за $${price}?`)) return;

        setIsLoading(true);
        try {
            // 2. Buy Avatar
            const res = await partnershipApi.subscribe(partnershipUser._id, tariff, partnershipUser.referrer);
            if (res.success) {
                if (webApp) webApp.showAlert('Успешно! Аватар активирован.');
                else alert('Success!');

                // Refresh User Data
                const updatedUser = await partnershipApi.getStats(partnershipUser._id);
                setPartnershipUser({ ...partnershipUser, ...updatedUser }); // Update balances
            } else {
                if (webApp) webApp.showAlert(res.error || 'Ошибка покупки');
                else alert(res.error || 'Error');
            }
        } catch (e) {
            console.error(e);
            alert('Сбой сети');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        if (webApp) {
            webApp.HapticFeedback.notificationOccurred('success');
            webApp.showAlert('Ссылка скопирована!');
        }
    };

    const handleSupportTopUp = () => {
        window.open('https://t.me/Aurelia_8888?text=хочу пополнить счет Moneo', '_blank');
        setShowRefillModal(false);
    };

    const GOAL = 1000000;
    const progress = Math.min((totalUsers / GOAL) * 100, 100);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pt-6 space-y-6 pb-24 relative">

            {/* Header with Stats */}
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="text-green-400" />
                Партнерская программа
            </h1>

            {/* Total Participants Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-2xl border border-indigo-500/30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>

                <div className="relative z-10 text-center space-y-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 inline-block border border-white/10 shadow-lg">
                        <h2 className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-1">Всего участников</h2>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 drop-shadow-sm">
                            {totalUsers.toLocaleString()}
                        </div>
                    </div>

                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm shadow-lg ring-4 ring-white/5">
                        <Gift size={24} className="text-yellow-400" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-1">Пригласи друга</h2>
                        <div className="text-indigo-200 text-sm font-medium">Получай 50% бонус от их оплат навсегда!</div>
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <div className="flex items-center gap-1">
                                <Users size={14} className="text-slate-500" />
                                <span className="mr-1">Цель</span>
                            </div>
                            <span className="text-white">{GOAL.toLocaleString()}</span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribution Info */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-4">
                <h3 className="font-bold text-lg text-white">Распределение средств</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                        <span className="text-slate-300">В игре (призовой фонд)</span>
                        <span className="font-bold text-green-400">100%</span>
                    </div>

                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-4 mb-2">Доступно к выводу</div>

                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Тариф Игрок ($20/мес)</span>
                        <span className="font-bold text-white">50%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[50%]"></div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Тариф Мастер ($100/год)</span>
                        <span className="font-bold text-white">60%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[60%]"></div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-slate-400">Тариф Франчайзи ($1000)</span>
                            <span className="text-[10px] text-orange-400">Осталось 22 места (бессрочно)</span>
                        </div>
                        <span className="font-bold text-yellow-500">80%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 w-[80%]"></div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Твоя ссылка</label>
                <div
                    onClick={handleCopy}
                    className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center cursor-pointer active:bg-slate-700 transition group hover:border-blue-500/50"
                >
                    <span className="text-blue-400 font-mono text-sm break-all mr-2 opacity-80 group-hover:opacity-100 transition-opacity leading-tight">
                        {referralLink}
                    </span>
                    <Copy size={20} className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <Users className="text-purple-400 mb-2" />
                    <div className="text-xl font-bold">{user?.referralsCount || 0}</div>
                    <div className="text-xs text-slate-400">Друзей</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <TrendingUp className="text-red-500 mb-2" />
                    <div className="text-xl font-bold text-red-400">{user?.balanceRed || 0} RED</div>
                    <div className="text-xs text-slate-400">Доход (RED)</div>
                </div>
                {/* Green Balance Card */}
                <div
                    onClick={handleSupportTopUp}
                    className="bg-gradient-to-br from-green-900/50 to-slate-800 p-4 rounded-xl border border-green-500/30 col-span-2 cursor-pointer hover:bg-slate-700/50 transition-colors relative group active:scale-95"
                >
                    <div className="absolute top-3 right-3 text-green-500 group-hover:scale-110 transition-transform">
                        ↗
                    </div>
                    <Wallet className="text-green-400 mb-2" />
                    <div className="text-xl font-bold text-green-400">${partnershipUser?.greenBalance || 0}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        Зеленый баланс
                        <span className="text-[9px] bg-green-900/50 px-1.5 py-0.5 rounded text-green-300 border border-green-500/20">Пополнить</span>
                    </div>
                </div>
            </div>

            {/* Avatar Profiles */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-white">Аватары (Доходные модули)</h3>
                <div className="grid grid-cols-3 gap-3">
                    {/* Small */}
                    <div
                        onClick={() => handleBuy('PLAYER', 20)}
                        className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex flex-col items-center relative overflow-hidden group cursor-pointer active:scale-95 transition-transform hover:bg-slate-700/80"
                    >
                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-12 h-12 rounded-full bg-blue-900/50 flex items-center justify-center mb-2 border border-blue-500/30">
                            <Users size={20} className="text-blue-400" />
                        </div>
                        <div className="text-xs font-bold text-slate-300">Игрок</div>
                        <div className="text-lg font-bold text-white">$20</div>
                        <button disabled={isLoading} className="mt-2 w-full py-1 text-[10px] font-bold bg-blue-600 rounded hover:bg-blue-500 transition disabled:opacity-50 pointer-events-none">
                            Купить
                        </button>
                    </div>

                    {/* Medium */}
                    <div
                        onClick={() => handleBuy('MASTER', 100)}
                        className="bg-slate-800 rounded-xl p-3 border border-purple-500/30 flex flex-col items-center relative overflow-hidden group cursor-pointer active:scale-95 transition-transform hover:bg-slate-700/80"
                    >
                        <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center mb-2 border border-purple-500/30">
                            <Gift size={20} className="text-purple-400" />
                        </div>
                        <div className="text-xs font-bold text-purple-300">Мастер</div>
                        <div className="text-lg font-bold text-white">$100</div>
                        <button disabled={isLoading} className="mt-2 w-full py-1 text-[10px] font-bold bg-purple-600 rounded hover:bg-purple-500 transition disabled:opacity-50 pointer-events-none">
                            Купить
                        </button>
                    </div>

                    {/* Large */}
                    {/* Partner Card - Custom Video Background */}
                    <div
                        onClick={() => handleBuy('PARTNER', 1000)}
                        className="relative rounded-xl border border-yellow-500/50 overflow-hidden group cursor-pointer active:scale-95 transition-transform h-[220px] shadow-lg shadow-yellow-900/20"
                    >
                        {/* Video Background */}
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-[2000ms]"
                        >
                            <source src="https://res.cloudinary.com/drqtmkfka/video/upload/v1766124357/moneo_uploads/qgurgvxolnalqo6jh8b3.mp4" type="video/mp4" />
                        </video>

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10"></div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center z-20 w-full">
                            <div className="text-xs font-bold text-yellow-300 uppercase tracking-widest mb-0.5 drop-shadow-md">Партнер</div>
                            <div className="text-2xl font-black text-white mb-3 drop-shadow-md">$1000</div>
                            <button disabled={isLoading} className="w-full py-2 text-xs font-bold bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 pointer-events-none shadow-lg shadow-yellow-500/20">
                                Купить
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insufficient Funds Modal */}
            {showRefillModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowRefillModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <X />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center ring-4 ring-red-500/10">
                                <Wallet size={32} className="text-red-500" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">Недостаточно средств</h3>
                                <p className="text-slate-400 text-sm">
                                    Вам не хватает <span className="text-red-400 font-bold">${missingAmount}</span> для покупки этого аватара.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-3 w-full border border-slate-700/50 mt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Ваш баланс:</span>
                                    <span className="text-green-400 font-bold">${partnershipUser?.greenBalance || 0}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSupportTopUp}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all mt-2"
                            >
                                Пополнить баланс
                                <TrendingUp size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Program Description */}
            <ProgramDescription />

        </div>
    );
}
