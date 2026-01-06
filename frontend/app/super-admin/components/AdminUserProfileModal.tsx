import { X, User, Trophy, TrendingUp, Medal, ExternalLink, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { partnershipApi } from '../../../lib/partnershipApi';
import { useState, useEffect } from 'react';

interface AdminUserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onUserSelect?: (user: any) => void;
}

export function AdminUserProfileModal({ isOpen, onClose, user, onUserSelect }: AdminUserProfileModalProps) {
    // State for Referrals List
    const [isReferralsOpen, setIsReferralsOpen] = useState(false);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);

    // Reset state when user changes
    useEffect(() => {
        setIsReferralsOpen(false);
        setReferrals([]);
    }, [user?._id]);

    if (!isOpen || !user) return null;

    const username = user.username || user.telegram_id || 'Unknown';
    const profileUrl = user.username ? `https://t.me/${user.username}` : '#';

    // Referrer Logic
    let referrerName = 'None';
    let referrerIdDisplay = '';
    let referrerObj: any = null;

    if (user.referrer) {
        if (typeof user.referrer === 'string') {
            referrerName = user.referrer; // Could be ID or Username
            referrerIdDisplay = user.referrer;
        } else {
            // It's an object
            referrerObj = user.referrer;
            referrerName = user.referrer.username || user.referrer.first_name || 'User';
            referrerIdDisplay = user.referrer.telegram_id || user.referrer._id;
        }
    }

    const partnershipData = user.partnershipData;
    const name = user.first_name || user.username || 'User';

    const tariff = partnershipData?.tariff || (user.isMaster ? 'MASTER' : 'GUEST');
    let tariffColor = 'text-slate-400 border-slate-700';
    if (tariff === 'MASTER') tariffColor = 'text-purple-400 border-purple-700 bg-purple-900/20';
    if (tariff === 'PARTNER') tariffColor = 'text-blue-400 border-blue-700 bg-blue-900/20';
    if (tariff === 'PLAYER') tariffColor = 'text-green-400 border-green-700 bg-green-900/20';


    const toggleReferrals = async () => {
        if (!isReferralsOpen && referrals.length === 0) {
            setIsLoadingReferrals(true);
            try {
                // Fetch referrals using public API (returns partial user objects)
                // We use username if available, else maybe userId?
                // The API /api/check-referrals/:username expects username.
                // If user has no username, we might fail.
                if (user.username) {
                    const data = await partnershipApi.getReferrals(user.username);
                    setReferrals(data.referrals || []);
                } else {
                    console.warn("Cannot fetch referrals for user without username");
                }
            } catch (e) {
                console.error("Failed to load referrals", e);
            } finally {
                setIsLoadingReferrals(false);
            }
        }
        setIsReferralsOpen(!isReferralsOpen);
    };

    const handleUserClick = (u: any) => {
        if (onUserSelect) {
            onUserSelect(u);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/90 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
                >
                    <X size={18} />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto custom-scrollbar">

                    {/* Header Image / Pattern */}
                    <div className="h-32 bg-gradient-to-b from-blue-900/40 to-slate-900 relative shrink-0"></div>

                    {/* Profile Info */}
                    <div className="px-6 pb-8 -mt-16 relative z-10 flex flex-col items-center">

                        {/* Avatar Photo */}
                        <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shadow-xl mb-3 shrink-0">
                            {user.photoUrl ? (
                                <img src={user.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-slate-500" />
                            )}
                        </div>

                        {/* Name & ID */}
                        <h2 className="text-2xl font-bold text-white text-center mb-1">{name}</h2>
                        {user.username ? (
                            <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-sm mb-4 hover:underline flex items-center gap-1"
                            >
                                @{user.username} <ExternalLink size={12} />
                            </a>
                        ) : (
                            <div className="text-slate-500 text-xs mb-4">ID: {user._id || user.telegram_id}</div>
                        )}

                        {/* Referrer Info */}
                        {user.referrer && (
                            <div className="bg-slate-800/50 rounded-lg p-2 px-4 mb-6 flex items-center gap-2 text-sm border border-slate-700/50">
                                <span className="text-slate-500">Invited by:</span>
                                {referrerObj ? (
                                    <button
                                        onClick={() => handleUserClick(referrerObj)}
                                        className="text-blue-300 font-bold hover:underline hover:text-blue-200 flex items-center gap-1"
                                    >
                                        @{referrerName}
                                    </button>
                                ) : (
                                    <span className="text-slate-300 font-mono text-xs">{referrerName}</span>
                                )}
                            </div>
                        )}


                        {/* Tariff Badge */}
                        <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-6 ${tariffColor}`}>
                            {tariff === 'MASTER' && <Medal size={14} />}
                            {tariff === 'PARTNER' && <Trophy size={14} />}
                            {tariff === 'PLAYER' && <User size={14} />}
                            {tariff}
                            {partnershipData?.level > 0 && <span className="opacity-70 ml-1">LVL {partnershipData.level}</span>}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 w-full mb-6">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Played</div>
                                <div className="text-xl font-bold text-white flex items-center gap-1">
                                    {user.gamesPlayed || 0}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Referrals</div>
                                <div className="text-xl font-bold text-blue-400 flex items-center gap-1">
                                    <Users size={16} />
                                    {user.referralsCount || 0}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Wins</div>
                                <div className="text-xl font-bold text-yellow-500 flex items-center gap-1">
                                    <Trophy size={16} />
                                    {user.wins || 0}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Rating</div>
                                <div className="text-xl font-bold text-purple-400 flex items-center gap-1">
                                    <Medal size={16} />
                                    {user.rating || 0}
                                </div>
                            </div>
                        </div>

                        {/* Balances */}
                        <div className="w-full bg-slate-950/50 rounded-xl p-4 border border-slate-800 space-y-3 mb-6">
                            <div className="flex justify-between items-center">
                                <div className="text-slate-400 text-xs uppercase font-bold">Green Balance</div>
                                <div className="text-green-400 font-bold font-mono">${user.greenBalance || 0}</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-slate-400 text-xs uppercase font-bold">Yellow Balance</div>
                                <div className="text-yellow-400 font-bold font-mono">${user.yellowBalance || 0}</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-slate-400 text-xs uppercase font-bold">Red Balance</div>
                                <div className="text-red-400 font-bold font-mono">${user.balanceRed || 0}</div>
                            </div>
                        </div>

                        {/* Referrals List Section */}
                        <div className="w-full">
                            <button
                                onClick={toggleReferrals}
                                className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 transition-colors group"
                            >
                                <div className="flex items-center gap-2 font-bold text-slate-300 group-hover:text-white">
                                    <Users size={16} />
                                    Referrals List ({user.referralsCount || 0})
                                </div>
                                {isReferralsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {isReferralsOpen && (
                                <div className="mt-2 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {isLoadingReferrals ? (
                                        <div className="p-4 text-center text-slate-500 text-xs">Loading referrals...</div>
                                    ) : referrals.length > 0 ? (
                                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-700/50 custom-scrollbar">
                                            {referrals.map((ref: any, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => handleUserClick(ref)}
                                                    className="p-3 hover:bg-slate-700/50 transition cursor-pointer flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden">
                                                            {ref.photoUrl ? (
                                                                <img src={ref.photoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (ref.username || ref.firstName || '?')[0].toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-200 group-hover:text-blue-300 transition-colors">
                                                                {ref.username || ref.firstName || 'User'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">
                                                                Joined: {new Date(ref.joinedAt || ref.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-slate-500 text-xs">No referrals found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Avatars */}
                        {partnershipData && (
                            <div className="mt-6 w-full text-center">
                                <div className="text-slate-500 text-xs uppercase font-bold mb-2">Avatar Level</div>
                                <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-full px-4 py-1 text-sm font-bold text-white">
                                    Level {partnershipData.level}
                                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                    {partnershipData.partners} partners
                                </div>
                            </div>
                        )}

                        <div className="text-slate-600 text-[10px] mt-6 flex items-center gap-1">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
