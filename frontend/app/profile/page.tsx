'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { User, Shield, TrendingUp, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const { user } = useTelegram();

    // Default values if user is loading or null
    const balanceRed = user?.balanceRed || 0;
    const balanceGreen = user?.referralBalance || 0;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 space-y-6 pt-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {user?.photoUrl ? (
                        <img src={user.photoUrl} className="w-16 h-16 rounded-full border-2 border-blue-500" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                            <User size={32} />
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-xl leading-tight">{user?.firstName || user?.first_name || 'Гость'}</h1>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">Новичок</span>
                        </div>
                    </div>
                </div>
                <button className="bg-slate-800 p-2 rounded-full border border-slate-700">
                    <Shield size={20} className="text-slate-400" />
                </button>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign size={40} /></div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Игровой счет</p>
                    <h2 className="text-2xl font-black text-red-400 mt-1">${balanceRed}</h2>
                </div>
                <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 p-4 rounded-2xl border border-blue-800/50 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp size={40} /></div>
                    <p className="text-blue-200/70 text-xs font-medium uppercase tracking-wider">Реальный счет</p>
                    <h2 className="text-2xl font-black text-green-400 mt-1">${balanceGreen}</h2>
                </div>
            </div>

            {/* History Section */}
            <div className="space-y-3">
                <h3 className="font-bold text-lg">История операций</h3>
                <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500 text-sm border border-slate-800">
                    <div className="mb-2 text-2xl opacity-30">🧾</div>
                    История пока пуста...
                </div>
            </div>
        </div>
    );
}
