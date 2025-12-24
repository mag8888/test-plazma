'use client';
import React from 'react';
import { X } from 'lucide-react';

interface Avatar {
    type: 'BASIC' | 'ADVANCED' | 'PREMIUM';
    isActive: boolean;
}

interface AvatarGridModalProps {
    avatars: Avatar[];
    isOpen: boolean;
    onClose: () => void;
}

const LEVELS = [
    { level: 1, count: 3, label: 'Level 1' },
    { level: 2, count: 9, label: 'Level 2' },
    { level: 3, count: 27, label: 'Level 3' },
    { level: 4, count: 81, label: 'Level 4' },
    { level: 5, count: 243, label: 'Level 5' }
];

const TOTAL_SLOTS = 363; // 3 + 9 + 27 + 81 + 243

export const AvatarGridModal: React.FC<AvatarGridModalProps> = ({ avatars, isOpen, onClose }) => {
    if (!isOpen) return null;

    const activeAvatars = avatars.filter(a => a.isActive);

    // Fill slots with avatars or empties
    const slots: (Avatar | null)[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        slots.push(activeAvatars[i] || null);
    }

    let currentIndex = 0;

    const getTypeColor = (type: Avatar['type'] | null) => {
        if (!type) return 'bg-slate-700/30 border-slate-600/30';
        if (type === 'BASIC') return 'bg-blue-500/20 border-blue-400/50';
        if (type === 'ADVANCED') return 'bg-purple-500/20 border-purple-400/50';
        return 'bg-orange-500/20 border-orange-400/50';
    };

    const getTypeLabel = (type: Avatar['type'] | null) => {
        if (!type) return '—';
        return type[0]; // B, A, P
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">MLM Avatar Structure</h2>
                        <p className="text-sm text-slate-400">Total: {activeAvatars.length} / {TOTAL_SLOTS} avatars</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-red-600 text-white flex items-center justify-center transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Grid Levels */}
                <div className="p-6 space-y-8">
                    {LEVELS.map(({ level, count, label }) => {
                        const levelSlots = slots.slice(currentIndex, currentIndex + count);
                        currentIndex += count;

                        // Grid columns based on count
                        const cols = level === 1 ? 3 : level === 2 ? 3 : level === 3 ? 9 : level === 4 ? 9 : 9;

                        return (
                            <div key={level} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white">{label}</h3>
                                    <span className="text-sm text-slate-400">{count} slots</span>
                                </div>
                                <div
                                    className="grid gap-2"
                                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                                >
                                    {levelSlots.map((slot, idx) => (
                                        <div
                                            key={idx}
                                            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-bold transition ${getTypeColor(slot?.type || null)
                                                }`}
                                        >
                                            {getTypeLabel(slot?.type || null)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="border-t border-slate-700 p-4">
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-blue-500/20 border-2 border-blue-400/50"></div>
                            <span className="text-slate-300">BASIC</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-purple-500/20 border-2 border-purple-400/50"></div>
                            <span className="text-slate-300">ADVANCED</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-orange-500/20 border-2 border-orange-400/50"></div>
                            <span className="text-slate-300">PREMIUM</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-700/30 border-2 border-slate-600/30"></div>
                            <span className="text-slate-300">Empty</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
