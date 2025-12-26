import React from 'react';
import { socket } from '../socket';

interface SquareInfoModalProps {
    square: any;
    onClose: () => void;
    player: any;
    roomId: string;
}

export const SquareInfoModal = ({ square, onClose, player, roomId }: SquareInfoModalProps) => {
    if (!square) return null;

    const isMarket = square.type === 'MARKET';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full overflow-hidden relative">
                {/* Header */}
                <div className="p-6 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">{square.title || 'Клетка поля'}</h2>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{square.type}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        {square.description || 'Нет описания'}
                    </p>

                    {/* Market Actions */}
                    {isMarket && (
                        <div className="space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                <h3 className="text-blue-300 font-bold text-sm mb-2">Рынок</h3>
                                <p className="text-xs text-slate-400 mb-4">
                                    Здесь вы можете купить или продать активы, если у вас есть соответствующие карточки.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-800/30 border-t border-slate-700/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};
