import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

interface CardGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'SMALL' | 'BIG' | 'MARKET';
    roomId?: string;
}

export const CardGalleryModal = ({ isOpen, onClose, type, roomId }: CardGalleryModalProps) => {
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setCards([]); // Reset

            // Special handling for MARKET: It might need a different event or same event with type
            socket.emit('get_deck_content', { type, roomId });

            const handleData = (data: any[]) => {
                setCards(data);
                setLoading(false);
            };

            socket.once('deck_content', handleData);

            return () => {
                socket.off('deck_content', handleData);
            };
        }
    }, [isOpen, type]);

    if (!isOpen) return null;

    const getTitle = () => {
        switch (type) {
            case 'SMALL': return 'Малые Сделки';
            case 'BIG': return 'Крупные Сделки';
            case 'MARKET': return 'Рынок (Активные)';
            default: return 'Карты';
        }
    };

    const getDescription = () => {
        switch (type) {
            case 'SMALL': return 'Стоимость до $5,000';
            case 'BIG': return 'Стоимость от $6,000';
            case 'MARKET': return 'Карты, доступные для покупки другими игроками';
            default: return '';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'SMALL': return '🐟';
            case 'BIG': return '🐋';
            case 'MARKET': return '🏪';
            default: return '🃏';
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-3xl border border-slate-700 flex flex-col relative overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">{getIcon()}</span>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                                {getTitle()}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {getDescription()} • Всего карт: {cards.length}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0f172a]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                            <div className="animate-spin text-4xl">🎲</div>
                            <div className="uppercase tracking-widest font-bold text-xs">Загрузка карт...</div>
                        </div>
                    ) : cards.length === 0 ? (
                        <div className="text-center text-slate-500 py-20">Нет карт в этой колоде.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {cards.map((card, i) => (
                                <div key={i} className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col hover:border-slate-500 transition-colors group">
                                    <div className="p-4 flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-white leading-tight group-hover:text-blue-300 transition-colors">{card.title}</h3>
                                            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 font-mono">#{i + 1}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-4 line-clamp-4 leading-relaxed">
                                            {card.description}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-900/50 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-slate-500 uppercase">Cost</span>
                                            <span className="font-mono text-red-400 font-bold">-${card.cost?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] text-slate-500 uppercase">Cashflow</span>
                                            <span className="font-mono text-green-400 font-bold">+${card.cashflow?.toLocaleString()}</span>
                                        </div>
                                        {/* ROI Calc */}
                                        {card.cost > 0 && card.cashflow > 0 && (
                                            <div className="col-span-2 pt-2 border-t border-slate-700/30 flex justify-between items-center mt-1">
                                                <span className="text-[9px] text-slate-500 uppercase">ROI</span>
                                                <span className="font-mono text-blue-400 font-bold">
                                                    {((card.cashflow * 12) / card.cost * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
