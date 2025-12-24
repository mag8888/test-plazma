'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface Avatar {
    _id: string;
    owner: any;
    type: string;
    level: number;
    partners: string[];
    parent?: string;
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
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && avatarId) {
            loadMatrix();
        }
    }, [isOpen, avatarId]);

    const loadMatrix = async () => {
        setLoading(true);
        try {
            // Load avatar tree from backend
            const res = await fetch(`/api/partnership/avatars/matrix/${avatarId}`);
            const data = await res.json();
            setMatrixData(data);
        } catch (err) {
            console.error('Failed to load matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderLevel = (avatars: Avatar[], level: number) => {
        if (!avatars || avatars.length === 0) return null;

        const maxPerLevel = Math.pow(3, level - 1);
        const filled = avatars.length;
        const empty = maxPerLevel - filled;

        return (
            <div className="flex flex-col items-center mb-6">
                <div className="text-xs text-slate-500 mb-2">Уровень {level} ({filled}/{maxPerLevel})</div>
                <div className="flex flex-wrap justify-center gap-2">
                    {avatars.map(avatar => (
                        <div
                            key={avatar._id}
                            onClick={() => setSelectedAvatar(avatar._id)}
                            className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative group"
                        >
                            <div className="text-xs text-white font-bold">{avatar.level}</div>
                            {avatar.partners && avatar.partners.length > 0 && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[8px] flex items-center justify-center text-white">
                                    {avatar.partners.length}
                                </div>
                            )}
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                                {avatar.owner?.username || 'Unknown'}
                            </div>
                        </div>
                    ))}
                    {/* Empty slots */}
                    {Array.from({ length: empty }).map((_, idx) => (
                        <div
                            key={`empty-${idx}`}
                            className="w-12 h-12 bg-slate-800 border border-slate-700 border-dashed rounded-lg flex items-center justify-center opacity-30"
                        >
                            <div className="text-xs text-slate-600">?</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white">Матрица аватара</h2>
                        <div className="text-sm text-slate-400">{avatarType}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-800 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Загрузка...</div>
                    ) : matrixData ? (
                        <div>
                            {/* Level 1: Root */}
                            <div className="flex flex-col items-center mb-6">
                                <div className="text-xs text-slate-500 mb-2">Ваш аватар</div>
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <div className="text-white font-bold">{matrixData.root?.level || 1}</div>
                                </div>
                            </div>

                            {matrixData.level1 && renderLevel(matrixData.level1, 1)}
                            {matrixData.level2 && renderLevel(matrixData.level2, 2)}
                            {matrixData.level3 && renderLevel(matrixData.level3, 3)}
                            {matrixData.level4 && renderLevel(matrixData.level4, 4)}
                            {matrixData.level5 && renderLevel(matrixData.level5, 5)}

                            {/* Stats */}
                            <div className="mt-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                <div className="text-sm font-bold text-white mb-2">Статистика</div>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <div className="text-slate-400">Всего партнеров</div>
                                        <div className="text-white font-bold">{matrixData.totalPartners || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400">Уровень</div>
                                        <div className="text-white font-bold">{matrixData.root?.level || 1}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400">Прямых партнеров</div>
                                        <div className="text-white font-bold">{matrixData.root?.partners?.length || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">Нет данных</div>
                    )}
                </div>
            </div>
        </div>
    );
}
