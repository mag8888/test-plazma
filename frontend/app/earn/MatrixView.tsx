'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Info, ArrowDown, ArrowLeft, ZoomIn } from 'lucide-react';

interface Avatar {
    _id: string;
    owner: { username: string };
    type: string;
    level: number;
    partners: string[];
    parent?: string;
    isClosed?: boolean;
}

interface MatrixViewProps {
    isOpen: boolean;
    onClose: () => void;
    avatarId: string;
    avatarType: string;
}

const BRANCH_COLORS = [
    { name: 'Cyan', bg: 'bg-cyan-500', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]' },
    { name: 'Purple', bg: 'bg-purple-500', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]' },
    { name: 'Pink', bg: 'bg-pink-500', border: 'border-pink-500/30', text: 'text-pink-400', glow: 'shadow-[0_0_15px_rgba(236,72,153,0.3)]' }
];

export function MatrixView({ isOpen, onClose, avatarId, avatarType }: MatrixViewProps) {
    const [matrixData, setMatrixData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentViewId, setCurrentViewId] = useState(avatarId);
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Reset to root when opening fresh, OR if prop changes
            if (history.length === 0) {
                setCurrentViewId(avatarId);
            }
        } else {
            // Reset on close
            setHistory([]);
            setCurrentViewId(avatarId);
        }
    }, [isOpen, avatarId]);

    // Reload when currentViewId changes
    useEffect(() => {
        if (isOpen && currentViewId) {
            loadMatrix(currentViewId);
        }
    }, [currentViewId, isOpen]);

    const loadMatrix = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/partnership/avatars/matrix/${id}`);
            const data = await res.json();
            setMatrixData(data);
        } catch (err) {
            console.error('Failed to load matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDive = (childId: string) => {
        setHistory(prev => [...prev, currentViewId]);
        setCurrentViewId(childId);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setHistory(prevHist => prevHist.slice(0, -1));
        setCurrentViewId(prev);
    };

    const handleAvatarClick = (username: string) => {
        if (username) {
            window.open(`https://t.me/${username}`, '_blank');
        }
    };

    // Helper to find children of a parent from the next level array
    const getChildren = (parentId: string, nextLevelAvatars: Avatar[]) => {
        return nextLevelAvatars?.filter(a => a.parent === parentId) || [];
    };

    // Render a single avatar slot
    const renderAvatarSlot = (avatar: Avatar | null, colorTheme: any, isPlaceholder = false) => {
        if (isPlaceholder || !avatar) {
            return (
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 border-dashed flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center gap-1 group relative">
                <div className="relative">
                    <div
                        onClick={() => handleAvatarClick(avatar.owner?.username)}
                        className={`w-10 h-10 rounded-lg ${colorTheme.bg} cursor-pointer flex items-center justify-center relative transition-transform hover:scale-110 z-10`}
                    >
                        <span className="text-xs font-bold text-white">{avatar.level}</span>
                        {/* Tooltip */}
                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-20 transition-opacity">
                            @{avatar.owner?.username || 'unknown'}
                        </div>
                    </div>

                    {/* EXPAND BUTTON (+) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDive(avatar._id);
                        }}
                        className="absolute -bottom-2 -right-2 w-5 h-5 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors z-20 shadow-lg"
                        title="Развернуть"
                    >
                        <ZoomIn size={10} className="text-white" />
                    </button>
                </div>

                {/* Bonus Indicator */}
                <div className="text-[9px] text-yellow-500/80 font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                    +50%🟡
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const rootLevel = matrixData?.root?.level || 0;
    const level1Avatars = matrixData?.level1 || [];
    const level2Avatars = matrixData?.level2 || [];

    // Construct the 3 Branches
    // We expect up to 3 avatars in Level 1.
    // If fewer, we show placeholders.
    const branches = Array.from({ length: 3 }).map((_, i) => {
        const branchAvatar = level1Avatars[i] || null;
        const children = branchAvatar ? getChildren(branchAvatar._id, level2Avatars) : [];
        return {
            id: i,
            avatar: branchAvatar,
            children: children,
            color: BRANCH_COLORS[i]
        };
    });

    const TARIFF_COSTS: Record<string, number> = {
        'PLAYER': 20,
        'MASTER': 100,
        'PARTNER': 1000
    };

    const cost = TARIFF_COSTS[avatarType] || 0;
    const potentialBonus = cost * 0.5 * 3; // 3 slots * 50%

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-700 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        {history.length > 0 && (
                            <button
                                onClick={handleBack}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
                            >
                                <ArrowLeft size={16} className="text-white" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Матрица аватара
                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                                    {avatarType}
                                </span>
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-slate-500 text-sm">Загружаем структуру...</div>
                        </div>
                    ) : matrixData ? (
                        <div className="space-y-4">

                            {/* ROOT - Level 0/1 */}
                            <div className="flex flex-col items-center justify-center relative pb-8">
                                <div className="text-xs text-slate-500 mb-2 font-mono uppercase tracking-widest">Мой Аватар</div>
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] border-2 border-yellow-400/20 z-10 relative">
                                    <div className="text-3xl font-black text-white">{rootLevel}</div>
                                    <div className="text-[9px] font-bold text-yellow-100 uppercase tracking-widest">Уровень</div>
                                </div>
                            </div>

                            {/* Explainer / Level Objective */}
                            <div className="max-w-md mx-auto bg-slate-800/50 rounded-xl p-4 border border-slate-700 relative overflow-hidden mb-8">
                                <div className="relative z-10 text-center space-y-2">
                                    <h3 className="font-bold text-white">Нужно заполнить 3 слота ниже</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        С каждого заполненного слота в 3-х ветках вы получаете <span className="text-yellow-400 font-bold">50% от стоимости</span> ($ {cost * 0.5}) в накопление желтого бонуса для перехода на уровень выше.
                                        Также вы получаете <span className="text-green-400 font-bold">50% на вывод</span>.
                                    </p>
                                </div>
                            </div>

                            {/* BONUS INDICATORS */}
                            <div className="flex justify-center items-center gap-12 pb-4 relative z-20">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                                        {potentialBonus}
                                    </div>
                                    <div className="text-[10px] text-yellow-400 uppercase tracking-widest font-bold">YELLOW</div>
                                </div>
                                <div className="h-8 w-px bg-slate-700"></div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                        {potentialBonus}
                                    </div>
                                    <div className="text-[10px] text-green-400 uppercase tracking-widest font-bold">GREEN</div>
                                </div>
                            </div>

                            <div className="relative pt-4">
                                {/* Connector Lines */}
                                <div className="absolute top-0 left-1/2 -ml-px w-0.5 h-8 bg-gradient-to-b from-yellow-500 to-slate-700"></div>
                                <div className="absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50"></div>

                                {/* Branches Container */}
                                <div className="grid grid-cols-3 gap-2 pt-8 border-t border-slate-800/50 relative">
                                    {/* Horizontal connector line for branches */}
                                    <div className="absolute top-0 left-[16.66%] right-[16.66%] h-px bg-slate-700 -translate-y-[1px]"></div>
                                    {/* Center vertical connector from root */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-px bg-slate-700 -translate-y-full"></div>

                                    {branches.map((branch, i) => (
                                        <div key={i} className={`flex flex-col items-center relative pt-6 ${i !== 1 ? 'border-t-0' : ''}`}>
                                            {/* Vertical connector to branch head */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-px bg-slate-700"></div>

                                            {/* BRANCH HEAD (Ring 1) */}
                                            <div className="mb-4 text-center">
                                                <div className={`text-[10px] font-bold uppercase mb-2 ${branch.color.text}`}>Ветка {i + 1}</div>
                                                {renderAvatarSlot(branch.avatar, branch.color, !branch.avatar)}
                                                {
                                                    branch.avatar && (
                                                        <div className="mt-1 text-[9px] text-slate-500">
                                                            {branch.children.length}/3 заполнено
                                                        </div>
                                                    )
                                                }
                                            </div>

                                            {/* Branch Children (Ring 2) */}
                                            {branch.avatar && (
                                                <div className="flex flex-col items-center w-full">
                                                    <div className="h-6 w-px bg-slate-700/50 mb-2"></div>
                                                    <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 w-full flex justify-center gap-3 relative">
                                                        {/* "Yellow Accumulation" Visual */}
                                                        <div className="absolute -top-3 bg-slate-900 border border-slate-700 text-[9px] text-yellow-500 px-2 py-0.5 rounded-full">
                                                            Накопление
                                                        </div>

                                                        {/* 3 Slots for this Branch Head */}
                                                        {Array.from({ length: 3 }).map((_, idx) => {
                                                            const child = branch.children[idx] || null;
                                                            return (
                                                                <div key={idx}>
                                                                    {renderAvatarSlot(child, branch.color, !child)}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">Нет данных</div>
                    )}
                </div>
            </div>
        </div>
    );
}
