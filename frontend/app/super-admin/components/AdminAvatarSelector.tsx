'use client';

import { useState, useEffect } from 'react';
import { X, User, Crown, Star } from 'lucide-react';
import { partnershipApi } from '../../../lib/partnershipApi';

interface AdminAvatarSelectorProps {
    userId: string;
    username: string;
    onSelect: (avatarId: string, type: string) => void;
    onClose: () => void;
}

export default function AdminAvatarSelector({ userId, username, onSelect, onClose }: AdminAvatarSelectorProps) {
    const [avatars, setAvatars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // State to track expanded groups: key = "TYPE-LEVEL"
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchAvatars = async () => {
            try {
                // Determine backend URL - if we are in admin page, we might need full URL, 
                // but this component runs on client. relative path works if proxied or same origin.
                // Assuming /api/partnership/avatars/my-avatars/... works.
                const res = await fetch(`/api/partnership/avatars/my-avatars/${userId}`);
                if (!res.ok) throw new Error('Fetch failed');
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

    const toggleGroup = (key: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setExpandedGroups(newSet);
    };

    // Grouping Logic
    const grouped = avatars.reduce((acc, avatar) => {
        const type = avatar.type;
        const level = avatar.level;
        if (!acc[type]) acc[type] = {};
        if (!acc[type][level]) acc[type][level] = [];
        acc[type][level].push(avatar);
        return acc;
    }, {} as Record<string, Record<number, any[]>>);

    const getIcon = (type: string) => {
        if (type === 'PREMIUM') return <Crown className="text-yellow-400" size={16} />;
        if (type === 'ADVANCED') return <Star className="text-blue-400" size={16} />;
        return <User className="text-green-400" size={16} />;
    };

    const getTypeColor = (type: string) => {
        if (type === 'PREMIUM') return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
        if (type === 'ADVANCED') return 'text-blue-400 border-blue-500/30 bg-blue-900/20';
        return 'text-green-400 border-green-500/30 bg-green-900/20'; // BASIC
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-lg space-y-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-2 bg-slate-800/50 rounded-full">
                    <X size={20} />
                </button>

                <div>
                    <h2 className="text-xl font-bold text-white">Select Avatar</h2>
                    <div className="text-slate-400 text-sm mt-1">User: <span className="text-white font-bold">{username}</span></div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : avatars.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                        No avatars found for this user.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                        {/* Iterating Types */}
                        {Object.entries(grouped).map(([type, levels]) => (
                            <div key={type} className="space-y-2">
                                <div className={`px-3 py-1.5 rounded-lg border w-fit text-xs font-bold uppercase tracking-widest ${getTypeColor(type)}`}>
                                    {type}
                                </div>

                                {/* Iterating Levels within Type */}
                                {Object.entries(levels as Record<string, any[]>).map(([levelStr, list]) => {
                                    const level = Number(levelStr);
                                    const groupKey = `${type}-${level}`;
                                    const isExpanded = expandedGroups.has(groupKey);

                                    return (
                                        <div key={groupKey} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                                            {/* Group Header */}
                                            <button
                                                onClick={() => toggleGroup(groupKey)}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-slate-900 border border-slate-700 text-white`}>
                                                        {level}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-sm font-bold text-slate-200">Level {level}</div>
                                                        <div className="text-xs text-slate-500">{list.length} avatars hidden</div>
                                                    </div>
                                                </div>
                                                <div className="text-slate-400 text-xs font-bold bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                                    {isExpanded ? 'Hide' : 'Show'}
                                                </div>
                                            </button>

                                            {/* Avatar List (Expanded) */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-700/50 bg-slate-900/30">
                                                    {list.map((avatar: any) => (
                                                        <button
                                                            key={avatar._id}
                                                            onClick={() => onSelect(avatar._id, avatar.type)}
                                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition border-b last:border-0 border-slate-700/30 group"
                                                        >
                                                            <div className="flex items-center gap-3 pl-2">
                                                                {getIcon(avatar.type)}
                                                                <div className="text-left">
                                                                    <div className="text-xs text-slate-400 font-mono">ID: ...{avatar._id.slice(-6)}</div>
                                                                    <div className="text-[10px] text-slate-500">
                                                                        {avatar.isClosed ? <span className="text-green-500">Closed</span> : 'Active'} •
                                                                        {new Date(avatar.createdAt).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition text-indigo-400 text-xs font-bold">
                                                                Select →
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
