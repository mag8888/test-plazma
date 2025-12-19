import { useState, useEffect } from 'react';
import { X, User, Medal, Trophy, TrendingUp } from 'lucide-react';
import { partnershipApi } from '../../lib/partnershipApi';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        _id?: string; // Mongo ID
        telegramId?: number; // Telegram ID
        username?: string;
        firstName?: string;
        photoUrl?: string;
        wins?: number;
        balanceRed?: number;
        isMaster?: boolean;
    } | null;
}

export function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
    const [partnershipData, setPartnershipData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.telegramId) {
            setLoading(true);
            partnershipApi.getPublicProfile(user.telegramId)
                .then(data => setPartnershipData(data))
                .catch(() => setPartnershipData(null))
                .finally(() => setLoading(false));
        } else {
            setPartnershipData(null);
        }
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const name = user.firstName || user.username || 'Игрок';
    const tariff = partnershipData?.tariff || (user.isMaster ? 'MASTER' : 'GUEST');

    // Tariff Colors
    let tariffColor = 'text-slate-400 border-slate-600 bg-slate-800';
    if (tariff === 'PLAYER') tariffColor = 'text-blue-400 border-blue-500/50 bg-blue-900/20';
    if (tariff === 'MASTER') tariffColor = 'text-purple-400 border-purple-500/50 bg-purple-900/20';
    if (tariff === 'PARTNER') tariffColor = 'text-yellow-400 border-yellow-500/50 bg-yellow-900/20';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/90 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl overflow-hidden relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
                >
                    <X size={18} />
                </button>

                {/* Header Image / Pattern */}
                <div className="h-32 bg-gradient-to-b from-blue-900/40 to-slate-900 relative">
                    {/* Can add a background pattern here */}
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-8 -mt-16 relative z-10 flex flex-col items-center">

                    {/* Avatar Photo */}
                    <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shadow-xl mb-3">
                        {user.photoUrl ? (
                            <img src={user.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-slate-500" />
                        )}
                    </div>

                    {/* Name & ID */}
                    <h2 className="text-2xl font-bold text-white text-center mb-1">{name}</h2>
                    {user.username && <div className="text-blue-400 text-sm mb-4">@{user.username}</div>}

                    {/* Tariff Badge */}
                    <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-6 ${tariffColor}`}>
                        {tariff === 'MASTER' && <Medal size={14} />}
                        {tariff === 'PARTNER' && <Trophy size={14} />}
                        {tariff === 'PLAYER' && <User size={14} />}
                        {tariff}
                        {partnershipData?.level > 0 && <span className="opacity-70 ml-1">LVL {partnershipData.level}</span>}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Побед</div>
                            <div className="text-xl font-bold text-yellow-500 flex items-center gap-1">
                                <Trophy size={16} />
                                {user.wins || 0}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Игровой счет</div>
                            <div className="text-xl font-bold text-red-400 flex items-center gap-1">
                                <TrendingUp size={16} />
                                ${user.balanceRed || 0}
                            </div>
                        </div>
                        {/* Optional: Partners Count (if public) */}
                        {partnershipData && (
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center col-span-2">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Уровень Аватара</div>
                                <div className="text-white font-bold text-sm">
                                    {partnershipData.level} уровень ({partnershipData.partners} партнеров)
                                </div>
                                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                    {/* Visualize progress to lvl 5? 3, 9, 27, 81... */}
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        style={{ width: `${Math.min((partnershipData.level / 5) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
