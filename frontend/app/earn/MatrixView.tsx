'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Info } from 'lucide-react';

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

export function MatrixView({ isOpen, onClose, avatarId, avatarType }: MatrixViewProps) {
    const [matrixData, setMatrixData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && avatarId) {
            loadMatrix();
        }
    }, [isOpen, avatarId]);

    const loadMatrix = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/partnership/avatars/matrix/${avatarId}`);
            const data = await res.json();
            setMatrixData(data);
        } catch (err) {
            console.error('Failed to load matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = (username: string) => {
        if (username) {
            window.open(`https://t.me/${username}`, '_blank');
        }
    };

    const renderTier = (avatars: Avatar[], tierLevel: number) => {
        // Tier 1 (Children) = 3 slots -> Completing this makes Root Level 1
        // Tier 2 (Grandchildren) = 9 slots -> Completing this makes Root Level 2
        // Max capacity = 3^tierLevel
        const maxCapacity = Math.pow(3, tierLevel);
        const filled = avatars ? avatars.length : 0;
        const empty = maxCapacity - filled;

        // Current Level Logic:
        // Tier 1 corresponds to "Level 1 Requirement".
        // Tier 2 corresponds to "Level 2 Requirement".

        return (
            <div className="mb-8 border-b border-slate-700/50 pb-6 last:border-0">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <div className="text-sm font-bold text-slate-200">
                            Кольцо {tierLevel} <span className="text-slate-500 font-normal">({filled}/{maxCapacity})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                            Заполните этот уровень, чтобы получить <span className="text-yellow-400 font-bold">Уровень {tierLevel}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {avatars && avatars.map(avatar => (
                        <div
                            key={avatar._id}
                            onClick={() => handleAvatarClick(avatar.owner?.username)}
                            className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 cursor-pointer flex items-center justify-center relative group transition-transform hover:scale-105"
                            title={`Click to open @${avatar.owner?.username}`}
                        >
                            <span className="text-xs font-bold text-white">{avatar.level}</span>
                            {/* Username Tooltip */}
                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                @{avatar.owner?.username || 'unknown'}
                            </div>
                        </div>
                    ))}
                    {/* Empty Slots */}
                    {Array.from({ length: empty }).map((_, idx) => (
                        <div
                            key={`empty-${idx}`}
                            className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700 border-dashed flex items-center justify-center"
                        >
                            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const rootLevel = matrixData?.root?.level || 0;

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Матрица аватара
                            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                                {avatarType}
                            </span>
                        </h2>
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
                        <div className="space-y-8">

                            {/* ROOT AVATAR STATUS */}
                            <div className="flex items-center gap-6 bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex flex-col items-center justify-center shadow-lg transform rotate-3 border-2 border-yellow-400/20">
                                    <div className="text-3xl font-black text-white">{rootLevel}</div>
                                    <div className="text-[9px] uppercase font-bold text-yellow-100 tracking-wider mt-1">Уровень</div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white">Ваш текущий статус</h3>
                                    <div className="text-sm text-slate-300 flex items-center gap-2">
                                        <Info size={14} className="text-blue-400" />
                                        {rootLevel === 0
                                            ? "Заполните 1-е кольцо (3 партнера), чтобы получить Уровень 1."
                                            : `Поздравляем! Вы достигли Уровня ${rootLevel}.`
                                        }
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Аватар без 3-х партнеров имеет 0 уровень.
                                    </div>
                                </div>
                            </div>

                            {/* GRID TIERS */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Структура развития</h3>
                                {renderTier(matrixData.level1, 1)} {/* 3 slots */}
                                {renderTier(matrixData.level2, 2)} {/* 9 slots */}
                                {renderTier(matrixData.level3, 3)} {/* 27 slots */}
                                {renderTier(matrixData.level4, 4)} {/* 81 slots */}
                                {renderTier(matrixData.level5, 5)} {/* 243 slots */}
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
