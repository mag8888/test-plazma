'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, CircleDollarSign, User, Gamepad2 } from 'lucide-react';
import { useTelegram } from './TelegramProvider';
import { clsx } from 'clsx'; // Simple class utility if installed, or just template strings

export const BottomNav = () => {
    const pathname = usePathname();
    const { webApp } = useTelegram();

    // If we are in the GAME BOARD, we typically HIDE the nav, or keep it?
    // Usually hide in active game to prevent accidental exit.
    if (pathname.includes('/game/board')) return null;

    const tabs = [
        { name: 'Главная', path: '/home', icon: Home },
        { name: 'Игры', path: '/schedule', icon: Calendar },
        { name: 'Заработок', path: '/earn', icon: CircleDollarSign },
        { name: 'Профиль', path: '/profile', icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-700 pb-safe pt-2 px-6 z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            onClick={() => {
                                // Haptic feedback
                                if (webApp?.HapticFeedback) {
                                    webApp.HapticFeedback.impactOccurred('light');
                                }
                            }}
                            className="flex flex-col items-center gap-1 p-2 min-w-[64px]"
                        >
                            <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-500/30 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                                {tab.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
