import { X, User, Calendar, Trophy, Users, Gamepad2, Award } from 'lucide-react';

interface AdminUserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export function AdminUserProfileModal({ isOpen, onClose, user }: AdminUserProfileModalProps) {
    if (!isOpen || !user) return null;

    const username = user.username || user.telegram_id || 'Unknown';
    const profileUrl = user.username ? `https://t.me/${user.username}` : '#';

    // Referrer Logic
    let referrerName = 'None';
    let referrerUrl = '#';

    if (user.referrer) {
        if (typeof user.referrer === 'string') {
            referrerName = user.referrer;
            // Try to guess it's a username if it starts with @, else fetch? Just display for now.
            referrerUrl = `https://t.me/${user.referrer}`;
        } else if (user.referrer.username) {
            referrerName = user.referrer.username;
            referrerUrl = `https://t.me/${user.referrer.username}`;
        } else if (user.referrer.telegram_id) {
            referrerName = String(user.referrer.telegram_id);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#121826] rounded-2xl border border-slate-700 w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden">

                {/* Close Button */}
                <div className="absolute top-3 right-3 z-10">
                    <button onClick={onClose} className="p-2 rounded-full bg-black/20 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Header */}
                <div className="pt-8 pb-6 px-6 bg-gradient-to-b from-indigo-900/40 to-transparent flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500/50 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 text-3xl overflow-hidden relative">
                        {user.photo_url ? (
                            <img src={user.photo_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white">👤</span>
                        )}
                    </div>
                    <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xl font-bold text-white mb-1 hover:text-blue-400 transition-colors flex items-center gap-1 group"
                    >
                        @{username}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm ml-1">↗</span>
                    </a>

                    {user.referrer && (
                        <div className="flex items-center gap-1 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20 mt-2">
                            <span>Invited by</span>
                            <a href={referrerUrl} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline hover:text-indigo-200">
                                @{referrerName}
                            </a>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 space-y-4">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-400 mb-1">Played</span>
                            <div className="text-base font-bold text-white flex items-center gap-1">
                                <Gamepad2 size={14} className="text-purple-400" />
                                {user.gamesPlayed || 0}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-400 mb-1">Referrals</span>
                            <div className="text-base font-bold text-white flex items-center gap-1">
                                <Users size={14} className="text-blue-400" />
                                {user.referralsCount || 0}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-400 mb-1">Rating</span>
                            <div className="text-base font-bold text-white flex items-center gap-1">
                                <Trophy size={14} className="text-amber-400" />
                                {user.rating || 0}
                            </div>
                        </div>
                    </div>

                    {/* Matrix Info */}
                    <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Award size={14} /> Avatars Owned
                            </span>
                            <span className="text-sm font-bold text-white">{user.avatarCounts?.total || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar size={14} /> Joined
                            </span>
                            <span className="text-xs text-slate-300">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
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
                            <span className="font-mono font-bold text-green-400">${user.greenBalance || 0}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                                <span className="text-sm text-yellow-100">Yellow Balance</span>
                            </div>
                            <span className="font-mono font-bold text-yellow-400">${user.yellowBalance || 0}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-900/20 to-red-800/10 border border-red-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                <span className="text-sm text-red-100">Red Balance</span>
                            </div>
                            <span className="font-mono font-bold text-red-400">${user.balanceRed || 0}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
