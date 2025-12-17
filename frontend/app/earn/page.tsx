'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { Copy, Gift, TrendingUp, Users } from 'lucide-react';

export default function EarnPage() {
    const { webApp, user } = useTelegram();
    const referralLink = `https://t.me/moneo_bot?start=${user?.id || '123'}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        if (webApp) {
            webApp.HapticFeedback.notificationOccurred('success');
            webApp.showAlert('Ссылка скопирована!');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pt-6 space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="text-green-400" />
                Партнерская программа
            </h1>

            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 text-center space-y-4">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                    <Gift size={32} className="text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-1">Пригласи друга</h2>
                    <p className="text-indigo-200 text-sm">Получи 10% от их оплат навсегда!</p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Твоя ссылка</label>
                <div
                    onClick={handleCopy}
                    className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center cursor-pointer active:bg-slate-700 transition"
                >
                    <span className="text-blue-400 font-mono truncate mr-2">{referralLink}</span>
                    <Copy size={20} className="text-slate-500" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <Users className="text-purple-400 mb-2" />
                    <div className="text-xl font-bold">12</div>
                    <div className="text-xs text-slate-400">Друзей</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <TrendingUp className="text-green-400 mb-2" />
                    <div className="text-xl font-bold">$40</div>
                    <div className="text-xs text-slate-400">Доход</div>
                </div>
            </div>
        </div>
    );
}
