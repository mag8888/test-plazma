'use client';

import { useState, useEffect } from 'react';
import { X, User, Calendar, Trophy, Users, DollarSign, Gamepad2, Award } from 'lucide-react';
import { partnershipApi } from '../../lib/partnershipApi';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            loadProfile();
        }
    }, [isOpen, userId]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const data = await partnershipApi.getStats(userId);
            setProfile(data);
        } catch (e) {
            console.error("Failed to load profile", e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#121826] rounded-2xl border border-slate-700 w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden">

                {/* Header with Close */}
                <div className="absolute top-3 right-3 z-10">
                    <button onClick={onClose} className="p-2 rounded-full bg-black/20 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Header */}
                <div className="pt-8 pb-6 px-6 bg-gradient-to-b from-indigo-900/40 to-transparent flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500/50 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 text-3xl overflow-hidden relative">
                        {profile?.photoUrl ? (
                            <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white">👤</span>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">@{profile?.username || 'Username'}</h2>
                    {profile?.referrer && (
                        <div className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                            Invited by @{profile.referrer}
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 space-y-4">

                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                                    <span className="text-xs text-slate-400 mb-1">Games Played</span>
                                    <div className="text-lg font-bold text-white flex items-center gap-1">
                                        <Gamepad2 size={16} className="text-purple-400" />
                                        {profile.gamesPlayed || 0}
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                                    <span className="text-xs text-slate-400 mb-1">Rating Results</span>
                                    <div className="text-lg font-bold text-white flex items-center gap-1">
                                        <Trophy size={16} className="text-amber-400" />
                                        {profile.rating || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Matrix Info */}
                            <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Users size={14} /> Avatars Owned
                                    </span>
                                    <span className="text-sm font-bold text-white">{profile.avatarCount || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar size={14} /> Joined
                                    </span>
                                    <span className="text-xs text-slate-300">
                                        {new Date(profile.registrationDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Balances */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-900/20 to-green-800/10 border border-green-500/20">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                        <span className="text-sm text-green-100">Green Balance</span>
                                    </div>
                                    <span className="font-mono font-bold text-green-400">${profile.greenBalance || 0}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-500/20">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                                        <span className="text-sm text-yellow-100">Yellow Balance</span>
                                    </div>
                                    <span className="font-mono font-bold text-yellow-400">${profile.yellowBalance || 0}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-900/20 to-red-800/10 border border-red-500/20">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                        <span className="text-sm text-red-100">Red Balance</span>
                                    </div>
                                    <span className="font-mono font-bold text-red-400">${profile.balanceRed || 0}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
