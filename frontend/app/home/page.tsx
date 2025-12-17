'use client';

import { useTelegram } from '../../components/TelegramProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Shield, Zap, TrendingUp, DollarSign } from 'lucide-react';

export default function HomePage() {
    const { user, isReady } = useTelegram();
    const router = useRouter();

    // Use Context Data (or defaults/mocks while loading)
    // user might be null initially
    const balanceRed = user?.balanceRed || 0;
    const balanceGreen = user?.referralBalance || 0;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 space-y-6 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {user?.photoUrl ? (
                        <img src={user.photoUrl} className="w-12 h-12 rounded-full border-2 border-blue-500" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                            <User />
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{user?.firstName || user?.first_name || 'Гость'}</h1>
                        <span className="text-xs text-blue-400">Новичок</span>
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

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg">Быстрые действия</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href="/schedule"
                        onClick={() => webApp?.HapticFeedback.impactOccurred('medium')}
                        className="bg-blue-600 hover:bg-blue-500 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95"
                    >
                        <Zap size={24} className="text-white" />
                        <span className="font-bold">Играть</span>
                    </Link>
                    <Link
                        href="/earn"
                        onClick={() => webApp?.HapticFeedback.impactOccurred('light')}
                        className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex flex-col items-center gap-2 border border-slate-700 transition-all active:scale-95"
                    >
                        <DollarSign size={24} className="text-green-400" />
                        <span className="font-bold">Пополнить</span>
                    </Link>
                </div>
            </div>

            {/* Recent Activity Mock */}
            <div className="space-y-3">
                <h3 className="font-bold text-lg">История</h3>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center text-slate-500 text-sm">
                    Пока пусто...
                </div>
            </div>
        </div>
    );
}
