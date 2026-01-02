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
    fetcher?: (url: string) => Promise<any>;
}

const BRANCH_COLORS = [
    { name: 'Cyan', bg: 'bg-cyan-500', border: 'border-cyan-500/30', text: 'text-cyan-400', stroke: '#22d3ee' },
    { name: 'Purple', bg: 'bg-purple-500', border: 'border-purple-500/30', text: 'text-purple-400', stroke: '#a855f7' },
    { name: 'Pink', bg: 'bg-pink-500', border: 'border-pink-500/30', text: 'text-pink-400', stroke: '#ec4899' }
];

export function MatrixView({ isOpen, onClose, avatarId, avatarType, fetcher }: MatrixViewProps) {
    const [matrixData, setMatrixData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentViewId, setCurrentViewId] = useState(avatarId);
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (history.length === 0) {
                setCurrentViewId(avatarId);
            }
        } else {
            setHistory([]);
            setCurrentViewId(avatarId);
        }
    }, [isOpen, avatarId]);

    useEffect(() => {
        if (isOpen && currentViewId) {
            loadMatrix(currentViewId);
        }
    }, [currentViewId, isOpen]);

    const loadMatrix = async (id: string) => {
        setLoading(true);
        try {
            const endpoint = `/api/partnership/avatars/matrix/${id}`;
            let data;

            if (fetcher) {
                data = await fetcher(endpoint);
            } else {
                const res = await fetch(endpoint);
                data = await res.json();
            }

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

    const getChildren = (parentId: string, nextLevelAvatars: Avatar[]) => {
        return nextLevelAvatars?.filter(a => a.parent === parentId) || [];
    };

    const renderAvatarSlot = (avatar: Avatar | null, colorTheme: any, isPlaceholder = false) => {
        if (isPlaceholder || !avatar) {
            return (
                <div className="flex flex-col items-center gap-1 relative z-10 transition-all hover:scale-105">
                    <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 border-dashed flex items-center justify-center hover:bg-slate-800 transition-colors shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center gap-1 group relative z-10">
                <div className="relative">
                    <div
                        onClick={() => handleAvatarClick(avatar.owner?.username)}
                        className={`w-10 h-10 rounded-full ${colorTheme.bg} cursor-pointer flex items-center justify-center relative transition-transform hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 ${colorTheme.border}`}
                    >
                        <span className="text-xs font-bold text-white">{avatar.level}</span>
                        {/* Tooltip */}
                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-20 transition-opacity">
                            @{avatar.owner?.username || 'unknown'}
                        </div>
                    </div>

                    {/* EXPAND BUTTON (+) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDive(avatar._id);
                        }}
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors z-20 shadow-lg"
                        title="Развернуть"
                    >
                        <ZoomIn size={10} className="text-white" />
                    </button>
                </div>

                {/* Bonus Indicator */}
                <div className="text-[9px] text-yellow-500/80 font-mono opacity-60 group-hover:opacity-100 transition-opacity absolute top-full mt-1 font-bold">
                    +50%🟡
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const rootLevel = matrixData?.root?.level || 0;
    const level1Avatars = matrixData?.level1 || [];
    const level2Avatars = matrixData?.level2 || [];
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
        'PLAYER': 20, 'BASIC': 20, 'MASTER': 100, 'ADVANCED': 100, 'PARTNER': 1000, 'PREMIUM': 1000
    };
    const cost = TARIFF_COSTS[avatarType] || 0;
    const earnings = matrixData?.earnings || {};
    const yellowActual = earnings.yellowEarned || 0;
    const greenActual = earnings.greenEarned || 0;
    const activeSlots = matrixData?.root?.partners?.length || 0;
    const levelMultiplier = Math.pow(2, rootLevel);
    const unitBonus = cost * 0.5 * levelMultiplier;
    const yellowPotential = unitBonus * 3;
    const greenPotential = unitBonus * 3;

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900/95 rounded-2xl border border-slate-700 max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/80 backdrop-blur z-30 sticky top-0">
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
                                Матрица
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-slate-500 text-sm animate-pulse">Загрузка нейросети...</div>
                        </div>
                    ) : matrixData ? (
                        <div className="flex flex-col items-center min-h-[600px] w-full">

                            {/* TOP STATS */}
                            <div className="flex gap-12 mb-8 relative z-20 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">{yellowActual}</div>
                                    <div className="text-[9px] text-yellow-500/50 uppercase tracking-widest font-bold mt-1">Yellow</div>
                                </div>
                                <div className="w-px bg-slate-800"></div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">{greenActual}</div>
                                    <div className="text-[9px] text-green-500/50 uppercase tracking-widest font-bold mt-1">Green</div>
                                </div>
                            </div>

                            {/* TREE CONTAINER */}
                            <div className="relative w-full max-w-3xl mx-auto">

                                {/* GLOBAL SVG LINES LAYER */}
                                {/* This SVG covers the entire tree area to draw lines between nodes */}
                                <div className="absolute inset-0 pointer-events-none z-0 overflow-visible" style={{ height: '500px' }}>
                                    <svg width="100%" height="100%" className="overflow-visible">
                                        <defs>
                                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="2" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>

                                        {/* ROOT -> BRANCHES */}
                                        {/* Root is at 50% horizontal, y=0 approx (relative to tree start which is below stats) */}
                                        {/* Branch row is at y=120 approx */}

                                        {/* Left Branch Connection */}
                                        <path d="M 50% 60 C 50% 100, 16.6% 80, 16.6% 140" stroke="#fbbf24" strokeWidth="2" fill="none" strokeOpacity="0.4" />
                                        {/* Mid Branch Connection */}
                                        <path d="M 50% 60 L 50% 140" stroke="#fbbf24" strokeWidth="2" fill="none" strokeOpacity="0.4" />
                                        {/* Right Branch Connection */}
                                        <path d="M 50% 60 C 50% 100, 83.3% 80, 83.3% 140" stroke="#fbbf24" strokeWidth="2" fill="none" strokeOpacity="0.4" />

                                        {/* BRANCHES -> CHILDREN */}
                                        {/* We iterate branches and draw lines if they exist */}
                                        {branches.map((b, i) => {
                                            const branchX = i === 0 ? '16.6%' : i === 1 ? '50%' : '83.3%';
                                            const color = b.color.stroke;
                                            // Child Row Y starts at approx 240

                                            // Since we can't easily map exact coordinates in this single SVG without ref logic, 
                                            // we will use relative paths assuming the layout grid is consistent.

                                            if (!b.avatar) return null;

                                            // To children (relative X offsets from branch center)
                                            // Left child: -10%, Mid: 0, Right: +10% (relative to container width?)
                                            // Actually children are in a nested grid. 
                                            // Let's rely on the secondary per-column SVGs for children to be safer with responsiveness
                                            return null;
                                        })}
                                    </svg>
                                </div>

                                {/* ROOT NODE */}
                                <div className="flex flex-col items-center relative z-20 mb-16">
                                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.4)] border-4 border-slate-900 z-10 relative hover:scale-105 transition-transform cursor-default">
                                        <div className="text-3xl font-black text-white">{rootLevel}</div>
                                        <div className="text-[9px] font-bold text-yellow-100 uppercase tracking-widest text-shadow">LVL</div>
                                        {/* Badge */}
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-900 shadow-sm">
                                            {(rootLevel + 1)}
                                        </div>
                                    </div>
                                    <div className="mt-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 backdrop-blur-sm">
                                        <div className="text-xs text-white font-bold">@{matrixData.root?.owner?.username || 'me'}</div>
                                    </div>
                                </div>

                                {/* BRANCHES ROW */}
                                <div className="grid grid-cols-3 w-full relative z-10">
                                    {branches.map((branch, i) => (
                                        <div key={i} className="flex flex-col items-center relative">

                                            {/* Local SVG for Children Connections */}
                                            {/* Draws lines from Branch Node (top) to Children (bottom) */}
                                            <div className="absolute top-[20px] left-0 w-full h-[120px] pointer-events-none z-0">
                                                <svg width="100%" height="100%" className="overflow-visible">
                                                    {/* Branch Center is 50% of this column */}
                                                    {/* Children are at 16%, 50%, 83% of this column (since they are grid-3) */}
                                                    {branch.avatar && (
                                                        <>
                                                            {/* Line to Left Child */}
                                                            <path d="M 50% 20 C 50% 60, 16% 40, 16% 80" stroke={branch.color.stroke} strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
                                                            {/* Line to Mid Child */}
                                                            <path d="M 50% 20 L 50% 80" stroke={branch.color.stroke} strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
                                                            {/* Line to Right Child */}
                                                            <path d="M 50% 20 C 50% 60, 84% 40, 84% 80" stroke={branch.color.stroke} strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
                                                        </>
                                                    )}
                                                </svg>
                                            </div>

                                            {/* L1 Node */}
                                            <div className="mb-16 relative z-10">
                                                {renderAvatarSlot(branch.avatar, branch.color, !branch.avatar)}
                                            </div>

                                            {/* L2 Children */}
                                            {/* No background box, just pure grid */}
                                            <div className="w-full relative px-1">
                                                <div className="grid grid-cols-3 gap-0.5">
                                                    {Array.from({ length: 3 }).map((_, idx) => {
                                                        const child = branch.children[idx] || null;
                                                        return (
                                                            <div key={idx} className="flex justify-center relative pt-2">
                                                                {renderAvatarSlot(child, branch.color, !child)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
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
