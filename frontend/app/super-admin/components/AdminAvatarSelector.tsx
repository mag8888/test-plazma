'use client';

import { useState, useEffect } from 'react';
import { X, User, Crown, Star } from 'lucide-react';
import { partnershipApi } from '../../../../lib/partnershipApi';

interface AdminAvatarSelectorProps {
    userId: string;
    username: string;
    onSelect: (avatarId: string, type: string) => void;
    onClose: () => void;
}

export default function AdminAvatarSelector({ userId, username, onSelect, onClose }: AdminAvatarSelectorProps) {
    const [avatars, setAvatars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAvatars = async () => {
            try {
                // Use the API to get user avatars. Note: partnershipApi.getPartners uses /partners/:id, 
                // but we need /avatars/my-avatars/:id. Let's add that to partnershipApi or call fetch directly.
                // We'll trust partnershipApi has been updated or call direct for now.
                // Actually, let's call the endpoint directly to be safe as I haven't updated partnershipApi yet
                const res = await fetch(`/api/partnership/avatars/my-avatars/${userId}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAvatars(data);
                }
            } catch (e) {
                console.error("Failed to fetch avatars", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAvatars();
    }, [userId]);

    const getIcon = (type: string) => {
        if (type === 'PREMIUM') return <Crown className="text-yellow-400" size={20} />;
        if (type === 'ADVANCED') return <Star className="text-blue-400" size={20} />;
        return <User className="text-green-400" size={20} />;
    };

    const getColor = (type: string) => {
        if (type === 'PREMIUM') return 'bg-yellow-900/30 border-yellow-500/50 hover:bg-yellow-900/50';
        if (type === 'ADVANCED') return 'bg-blue-900/30 border-blue-500/50 hover:bg-blue-900/50';
        return 'bg-green-900/30 border-green-500/50 hover:bg-green-900/50';
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md space-y-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold text-white pr-8">Select Avatar</h2>
                <div className="text-slate-400 text-sm">User: <span className="text-white font-bold">{username}</span></div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : avatars.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No avatars found for this user.</div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {avatars.map(avatar => (
                            <button
                                key={avatar._id}
                                onClick={() => onSelect(avatar._id, avatar.type)}
                                className={`w-full p-4 rounded-xl border flex items-center justify-between group transition ${getColor(avatar.type)}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-950/50 rounded-lg">
                                        {getIcon(avatar.type)}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-sm">{avatar.type}</div>
                                        <div className="text-xs text-slate-400 font-mono">Lvl {avatar.level} • {avatar.isClosed ? 'Closed' : 'Active'}</div>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition text-white text-sm font-bold">
                                    View →
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
