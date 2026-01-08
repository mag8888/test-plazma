'use client';

import { useTelegram } from '../../components/TelegramProvider';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, DollarSign, BookOpen, Presentation, ChevronRight, LogOut } from 'lucide-react';
import { RulesModal } from '../game/RulesModal';
import PresentationModal from './PresentationModal';

import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function HomePage() {
    const router = useRouter();
    const { webApp, user, isReady } = useTelegram();
    const t = useTranslations('Home');
    const common = useTranslations('Common');

    // Redirect if not logged in
    useEffect(() => {
        if (isReady && !user) {
            router.replace('/');
        }
    }, [isReady, user, router]);

    const [showRules, setShowRules] = useState(false);
    const [showPresentation, setShowPresentation] = useState(false);

    const handleHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
        webApp?.HapticFeedback.impactOccurred(style);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 p-6 flex flex-col min-h-screen pb-24">

                {/* Header Actions */}
                <div className="absolute top-4 right-4 z-50">
                    <LanguageSwitcher />
                </div>

                {/* Greeting */}
                <div className="mt-8 mb-8 animate-in slide-in-from-top-4 duration-700">
                    <h1 className="text-3xl font-black tracking-tight text-white mb-1">
                        {t('welcome').split('MONEO')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{user?.first_name || 'Гость'}</span>!
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mb-3">{t('ready_to_multiply')}</p>

                    {/* Logout / Exit Button */}
                    <button
                        onClick={() => {
                            if (confirm(common('cancel') + '?')) {
                                // Unified Logout Logic for both Browser and Telegram
                                localStorage.clear();
                                localStorage.removeItem('moneo_auth_code'); // Explicitly clear magic link code
                                localStorage.setItem('moneo_is_logged_out', 'true');
                                window.location.href = '/'; // Hard redirect to Splash
                            }
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-400/80 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors border border-red-500/20"
                    >
                        <LogOut size={12} />
                        {common('back')}
                    </button>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-6">

                    {/* MAIN CTA: PLAY */}
                    <Link
                        href="/lobby"
                        onClick={() => handleHaptic('heavy')}
                        className="group relative w-full bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-700 p-1 rounded-[2rem] shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-10px_rgba(79,70,229,0.7)] transition-all duration-300 active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        <div className="relative bg-slate-900/40 backdrop-blur-sm rounded-[1.8rem] p-6 h-40 flex flex-col items-center justify-center border border-white/10 overflow-hidden">
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shine"></div>

                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                                <Zap size={32} className="text-white fill-white" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white group-hover:text-blue-200 transition-colors">{t('start')}</h2>
                            <div className="flex items-center gap-1 text-[10px] bg-black/30 px-3 py-1 rounded-full mt-2 text-blue-200/80 font-mono uppercase tracking-widest border border-white/5">
                                {t('enter_lobby')} <ChevronRight size={10} />
                            </div>
                        </div>
                    </Link>

                    {/* PRESENTATION BUTTON */}
                    <button
                        onClick={() => {
                            handleHaptic('medium');
                            setShowPresentation(true);
                        }}
                        className="w-full bg-gradient-to-r from-amber-900/40 to-orange-900/40 p-[1px] rounded-2xl group active:scale-[0.98] transition-transform"
                    >
                        <div className="bg-[#1e1b15]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white group-hover:scale-110 transition-transform">
                                <Presentation size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-amber-100 group-hover:text-white transition-colors">{t('presentation')}</h3>
                                <p className="text-xs text-amber-200/50 uppercase tracking-wider font-bold">{t('learn_about_game')}</p>
                            </div>
                            <div className="ml-auto text-amber-500/50 group-hover:translate-x-1 transition-transform">
                                <ChevronRight />
                            </div>
                        </div>
                    </button>

                    {/* TUTORIAL BUTTON */}
                    <button
                        onClick={() => {
                            handleHaptic('medium');
                            router.push('/lobby?tutorial=true');
                        }}
                        className="w-full bg-gradient-to-r from-emerald-900/40 to-teal-900/40 p-[1px] rounded-2xl group active:scale-[0.98] transition-transform"
                    >
                        <div className="bg-[#0f2e1b]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white group-hover:scale-110 transition-transform">
                                <BookOpen size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-emerald-100 group-hover:text-white transition-colors">{t('tutorial')}</h3>
                                <p className="text-xs text-emerald-200/50 uppercase tracking-wider font-bold">{t('take_tutorial')}</p>
                            </div>
                            <div className="ml-auto text-emerald-500/50 group-hover:translate-x-1 transition-transform">
                                <ChevronRight />
                            </div>
                        </div>
                    </button>

                    {/* Secondary Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* EARN */}
                        <Link
                            href="/earn"
                            onClick={() => handleHaptic('light')}
                            className="bg-slate-800/40 hover:bg-slate-700/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group"
                        >
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <DollarSign size={20} />
                            </div>
                            <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">{t('income')}</span>
                        </Link>

                        {/* RULES */}
                        <button
                            onClick={() => {
                                handleHaptic('light');
                                setShowRules(true);
                            }}
                            className="bg-slate-800/40 hover:bg-slate-700/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group"
                        >
                            <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-black transition-colors">
                                <BookOpen size={20} />
                            </div>
                            <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">{t('rules')}</span>
                        </button>
                    </div>

                </div>
            </div>

            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
            {showPresentation && <PresentationModal onClose={() => setShowPresentation(false)} />}
        </div>
    );
}
