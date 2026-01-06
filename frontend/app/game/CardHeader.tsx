
import React from 'react';

interface CardHeaderProps {
    card: any;
    cardNumber: string | null;
    isStock: boolean;
    ownedQty: number;
    timeLeft: number;
    formatTime: (sec: number) => string;
    onDismiss: () => void;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ card, cardNumber, isStock, ownedQty, timeLeft, formatTime, onDismiss }) => (
    <div className="flex items-start justify-between gap-2 mb-2 shrink-0 h-10">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {/* Card Number + Title */}
            <div className="flex items-center gap-1.5">
                {cardNumber && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-400/50 text-[9px] font-bold text-blue-300">
                        {cardNumber}
                    </span>
                )}
                <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 flex-1" title={card.title}>{card.title}</h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider opacity-70">
                    {card.symbol || card.type}
                </span>
                {/* Show owned quantity for stocks */}
                {isStock && ownedQty > 0 && (
                    <span className="text-[9px] bg-green-900/30 border border-green-500/30 text-green-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        {ownedQty} шт
                    </span>
                )}
                {/* Timer Badge */}
                <span className={`text-[9px] font-mono px-1.5 rounded ${timeLeft < 30 ? 'bg-red-900/50 text-red-400 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                    {formatTime(timeLeft)}
                </span>
            </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            {card.type === 'MARKET' && card.offerPrice ? (
                <div className="text-right bg-blue-900/40 px-2 py-1 rounded-lg border border-blue-500/30">
                    <div className="text-[8px] text-blue-400 uppercase font-bold">Предложение</div>
                    <div className="text-sm font-mono font-bold text-green-400">
                        ${(card.offerPrice || 0).toLocaleString()}
                    </div>
                </div>
            ) : card.type !== 'MARKET' && (card.cost || card.price) ? (
                <div className="text-right bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-700/30">
                    <div className="text-[8px] text-slate-500 uppercase font-bold">Цена</div>
                    <div className="text-sm font-mono font-bold text-red-300">
                        ${(card.cost || card.price || 0).toLocaleString()}
                    </div>
                </div>
            ) : null}
            {/* Close Button - Hide for Expenses (Mandatory) */}
            {card.type !== 'EXPENSE' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-700/50 hover:bg-red-600/80 text-slate-400 hover:text-white flex items-center justify-center transition-all text-sm font-bold"
                    title="Закрыть"
                >
                    ✕
                </button>
            )}
        </div>
    </div>
);
