'use client';

import { useTelegram } from '../../components/TelegramProvider';
import Link from 'next/link';
import { useState } from 'react';
import { Zap, DollarSign, BookOpen } from 'lucide-react';
import { RulesModal } from '../game/RulesModal';

export default function HomePage() {
    const { webApp } = useTelegram();
    const [showRules, setShowRules] = useState(false);

    const handleHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
        if (webApp?.HapticFeedback) {
            webApp.HapticFeedback.impactOccurred(style);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 pt-10 flex flex-col justify-center space-y-4 pb-24">

            {/* Play Button - Main Action */}
            <Link
                href="/lobby"
                onClick={() => handleHaptic('medium')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/20 group"
            >
                <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                    <Zap size={40} className="text-white fill-white" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black uppercase tracking-wider">Играть</h2>
                    <p className="text-blue-100 text-sm font-medium opacity-80">Перейти в лобби</p>
                </div>
            </Link>

            <div className="grid grid-cols-2 gap-4">
                {/* Earn Button */}
                <Link
                    href="/earn"
                    onClick={() => handleHaptic('light')}
                    className="bg-slate-800 hover:bg-slate-700 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
                >
                    <div className="bg-green-500/10 p-3 rounded-xl text-green-400 mb-1">
                        <DollarSign size={28} />
                    </div>
                    <span className="font-bold text-lg">Доход</span>
                </Link>

                {/* Rules Button */}
                <button
                    onClick={() => {
                        handleHaptic('light');
                        setShowRules(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
                >
                    <div className="bg-yellow-500/10 p-3 rounded-xl text-yellow-400 mb-1">
                        <BookOpen size={28} />
                    </div>
                    <span className="font-bold text-lg">Правила</span>
                </button>
            </div>

            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        </div>
    );
}
