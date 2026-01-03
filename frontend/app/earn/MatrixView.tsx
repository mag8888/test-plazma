'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeft, Plus, Minus, ExternalLink, User as UserIcon, ZoomIn, Info } from 'lucide-react';
import { ProfileModal } from './ProfileModal';

interface Avatar {
    _id: string;
    owner: { _id?: string; username: string; referrer?: string };
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

// Colors for depth levels (0-5)
const LEVEL_THEMES = [
    { bg: 'bg-gradient-to-r from-amber-500/20 to-orange-600/20', border: 'border-amber-500/50', text: 'text-amber-500', glow: 'shadow-amber-500/20' }, // L0 (Root)
    { bg: 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20', border: 'border-cyan-500/50', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },   // L1
    { bg: 'bg-gradient-to-r from-purple-500/20 to-violet-600/20', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-purple-500/20' }, // L2
    { bg: 'bg-gradient-to-r from-pink-500/20 to-rose-600/20', border: 'border-pink-500/50', text: 'text-pink-400', glow: 'shadow-pink-500/20' },     // L3
    { bg: 'bg-gradient-to-r from-indigo-500/20 to-blue-600/20', border: 'border-indigo-500/50', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' }, // L4
    { bg: 'bg-gradient-to-r from-emerald-500/20 to-green-600/20', border: 'border-emerald-500/50', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' } // L5
];

export function MatrixView({ isOpen, onClose, avatarId, avatarType, fetcher }: MatrixViewProps) {
    const [matrixData, setMatrixData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && avatarId) {
            loadMatrix(avatarId);
            setExpandedIds(new Set([avatarId])); // Auto-expand root
        } else {
            setExpandedIds(new Set());
        }
    }, [isOpen, avatarId]);

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

    // Construct Tree from backend flat levels
    const tree = useMemo(() => {
        if (!matrixData || !matrixData.root) return null;

        const allAvatars: Avatar[] = [
            matrixData.root,
            ...(matrixData.level1 || []),
            ...(matrixData.level2 || []),
            ...(matrixData.level3 || []),
            ...(matrixData.level4 || []),
            ...(matrixData.level5 || [])
        ];

        // Map for fast lookup
        const avatarMap = new Map<string, Avatar & { children: any[] }>();
        allAvatars.forEach(a => avatarMap.set(a._id, { ...a, children: [] }));

        // Build hierarchy
        const root = avatarMap.get(matrixData.root._id);
        if (!root) return null;

        allAvatars.forEach(a => {
            // Prevent Root from being added as a child to anyone (breaks Root cycles)
            if (a._id === root._id) return;

            if (a.parent && avatarMap.has(a.parent)) {
                avatarMap.get(a.parent)!.children.push(avatarMap.get(a._id));
            }
        });

        return root;
    }, [matrixData]);

    const handleNodeClick = (owner: any) => {
        if (owner && owner._id) {
            setSelectedUserId(owner._id);
        } else {
            console.warn("No Owner ID for profile click:", owner);
        }
    };

    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    // Recursive Node Renderer (Horizontal Tree / List style)
    const renderNode = (node: any, depth: number, path: Set<string> = new Set()) => {
        // Cycle Detection
        if (path.has(node._id)) {
            console.warn('Cycle detected in MatrixView:', node._id);
            return (
                <div className="text-red-500 text-xs p-2 border border-red-500 rounded">
                    Cycle Detected
                </div>
            );
        }
        const newPath = new Set(path).add(node._id);

        const theme = LEVEL_THEMES[Math.min(depth, 5)];
        const isExpanded = expandedIds.has(node._id);
        const children = node.children || [];
        const maxSlots = 3;
        const emptyCount = maxSlots - children.length;

        // Determine if spilled or direct
        // Direct: referrer == root.owner._id
        // Spillover: referrer != root.owner._id (and not self)

        // Note: matrixData.root.owner is populated object in controller, but Typescript assumes ID string sometimes.
        // Controller populates: .populate('owner', 'username referrer')

        const rootOwnerId = matrixData?.root?.owner?._id || matrixData?.root?.owner;
        const nodeReferrerId = node.owner?.referrer;

        // If Root Node, no referrer check needed. For children:
        let isDirect = false;
        let isSpillover = false;

        if (depth > 0 && rootOwnerId) {
            if (nodeReferrerId === rootOwnerId) {
                isDirect = true;
            } else if (nodeReferrerId && nodeReferrerId !== rootOwnerId) {
                isSpillover = true;
            }
        }

        return (
            <div key={node._id} className="relative flex flex-col">
                <div className="flex items-center group">

                    {/* CONNECTOR LINE (Horizontal) */}
                    {depth > 0 && (
                        <div className="w-8 h-px bg-slate-700 mr-2 flex-shrink-0 relative">
                            {/* Dot at intersection */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-slate-600"></div>
                        </div>
                    )}

                    {/* NODE CAPSULE */}
                    <div
                        className={`
                            relative flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300
                            ${theme.bg} ${theme.border} ${theme.glow} hover:shadow-lg
                            cursor-pointer min-w-[200px] hover:scale-105 active:scale-95
                        `}
                        onClick={() => handleNodeClick(node.owner)}
                    >
                        {/* Level Badge / Avatar */}
                        <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner
                            bg-slate-900/50 backdrop-blur border border-white/10 ${theme.text}
                        `}>
                            {depth === 0 ? 'YOU' : node.level}
                        </div>

                        {/* User Info */}
                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white truncate max-w-[120px]">
                                    @{node.owner?.username || 'unknown'}
                                </span>
                                {isDirect && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono">
                                        DIRECT
                                    </span>
                                )}
                                {isSpillover && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                                        SPILL
                                    </span>
                                )}
                            </div>
                            <div className={`text-[10px] opacity-70 ${theme.text}`}>
                                {children.length}/3 Filled
                            </div>
                        </div>

                        {/* EXPAND BUTTON */}
                        <div
                            className="bg-slate-900/80 p-1.5 rounded-lg hover:bg-slate-800 transition-colors border border-white/10"
                            onClick={(e) => toggleExpand(node._id, e)}
                        >
                            {isExpanded ? <Minus size={12} className="text-white" /> : <Plus size={12} className="text-white" />}
                        </div>
                    </div>

                </div>

                {/* CHILDREN CONTAINER */}
                {isExpanded && (
                    <div className="ml-[34px] pt-4 relative flex flex-col gap-3 pl-6 border-l border-slate-700/50">
                        {children.map((child: any) => renderNode(child, depth + 1, newPath))}

                        {/* EMPTY SLOTS Render Logic */}
                        {/* Always show if depth < 5 and (slots not full OR showEmptyMode)
                            Actually user asked: "unfilled hidden under minus but clickable to open"
                            This implies if I click 'expand', I see filled children. 
                            Do I see empty ones? 
                            User: "accordingly when filled they should act immediately" -> Filled are shown. 
                            "hidden under minus but clickable to open" -> Maybe empty slots are grouped?
                            Let's render a single "Add/Empty Group" button if there are empty slots?
                        */}
                        {emptyCount > 0 && depth < 5 && (
                            <div className="flex items-center opacity-60 hover:opacity-100 transition-opacity group">
                                <div className="w-8 h-px bg-slate-700 mr-2 border-dashed border-t-0 border-b-2 border-slate-800/50"></div>
                                <div className="
                                    border border-dashed border-slate-600 rounded-xl px-3 py-2
                                    flex items-center gap-2 bg-slate-900/30 min-w-[180px]
                                ">
                                    <div className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/50 flex items-center justify-center">
                                        <Plus size={12} className="text-slate-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 font-medium">Empty Slot</span>
                                        <span className="text-[9px] text-yellow-500 font-mono">+50% Bonus</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    // Financials
    const earnings = matrixData?.earnings || {};
    const yellowActual = earnings.yellowEarned || 0;
    const greenActual = earnings.greenEarned || 0;

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#0B1120] rounded-2xl border border-slate-700/50 max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">

                {/* HEADLINE / HEADER */}
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur z-20">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <ZoomIn size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Matrix Overview</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="uppercase tracking-wider font-bold">{avatarType}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                <span>Level {matrixData?.root?.level || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-8 px-6 py-2 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="text-center">
                            <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-0.5">Yellow</div>
                            <div className="text-2xl font-black text-white">{yellowActual}</div>
                        </div>
                        <div className="w-px bg-slate-800"></div>
                        <div className="text-center">
                            <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-0.5">Green</div>
                            <div className="text-2xl font-black text-white">{greenActual}</div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all group"
                    >
                        <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-black scrollbar-thin scrollbar-thumb-slate-700">

                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-slate-500 animate-pulse text-sm font-medium">Loading structure...</div>
                        </div>
                    ) : tree ? (
                        <div className="p-8 pb-32 min-w-[800px]">
                            {/* Legend */}
                            <div className="flex gap-4 mb-8 text-[10px] font-mono border-b border-slate-800/50 pb-4">
                                <div className="flex items-center gap-1.5 opacity-70">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <span className="text-yellow-500">DIRECT (Personal)</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-70">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-blue-400">SPILLOVER</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <div className="w-2 h-2 rounded-full border border-slate-500"></div>
                                    <span className="text-slate-400">EMPTY SLOT</span>
                                </div>
                            </div>

                            {/* Tree Render */}
                            <div className="pl-4">
                                {renderNode(tree, 0)}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            No matrix data found.
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Modal Overlay */}
            {selectedUserId && (
                <ProfileModal
                    isOpen={!!selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                    userId={selectedUserId}
                />
            )}
        </div>
    );
}
