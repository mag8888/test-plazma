import React, { useState } from 'react';
import { socket } from '../socket';
import { CardGalleryModal } from './CardGalleryModal';

interface SquareInfoModalProps {
    square: any;
    onClose: () => void;
    player: any;
    roomId: string;
}

export const SquareInfoModal = ({ square, onClose, player, roomId }: SquareInfoModalProps) => {
    const [galleryType, setGalleryType] = useState<'SMALL' | 'BIG' | 'MARKET' | null>(null);

    if (!square) return null;
    if (square.type === 'DOWNSIZED') return null; // Handled by DownsizedModal

    const isMarket = square.type === 'MARKET';
    const isDeal = square.type === 'DEAL';

    return (
        <>
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
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

                        {/* Payday Amount */}
                        {square.type === 'PAYDAY' && (
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl mb-4">
                                <h3 className="text-green-400 font-bold text-sm mb-1 uppercase tracking-wider">Сумма</h3>
                                <div className="text-2xl font-mono text-green-400 font-bold tracking-tight">
                                    +${player.cashflow?.toLocaleString()}
                                </div>
                            </div>
                        )}

                        {/* Market Actions */}
                        {isMarket && (
                            <div className="space-y-4">
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                    <h3 className="text-blue-300 font-bold text-sm mb-2">Рынок</h3>
                                    <p className="text-xs text-slate-400 mb-4">
                                        Здесь вы можете купить или продать активы, если у вас есть соответствующие карточки.
                                    </p>
                                    <button
                                        onClick={() => setGalleryType('MARKET')}
                                        className="w-full text-[10px] bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors font-bold uppercase tracking-wider"
                                    >
                                        👀 Посмотреть рынок
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Deal Actions */}
                        {isDeal && (
                            <div className="space-y-4">
                                <h3 className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-3">Выберите тип сделки:</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* SMALL DEAL */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            className="bg-green-600/20 border border-green-500/30 p-3 rounded-xl text-left transition-colors pointer-events-none"
                                        >
                                            <div className="font-bold text-green-400 text-sm mb-1">Малая Сделка</div>
                                            <div className="text-[10px] text-slate-400">Стоимость до $5,000</div>
                                        </button>
                                        <button
                                            onClick={() => setGalleryType('SMALL')}
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg transition-colors border border-slate-700 hover:text-white hover:border-slate-500"
                                        >
                                            👀 Посмотреть карты
                                        </button>
                                    </div>

                                    {/* BIG DEAL */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            className="bg-yellow-600/20 border border-yellow-500/30 p-3 rounded-xl text-left transition-colors pointer-events-none"
                                        >
                                            <div className="font-bold text-yellow-400 text-sm mb-1">Крупная Сделка</div>
                                            <div className="text-[10px] text-slate-400">Стоимость от $6,000</div>
                                        </button>
                                        <button
                                            onClick={() => setGalleryType('BIG')}
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg transition-colors border border-slate-700 hover:text-white hover:border-slate-500"
                                        >
                                            👀 Посмотреть карты
                                        </button>
                                    </div>
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

            {/* Gallery Modal */}
            <CardGalleryModal
                isOpen={!!galleryType}
                onClose={() => setGalleryType(null)}
                type={galleryType || 'SMALL'}
                roomId={roomId}
            />
        </>
    );
};
