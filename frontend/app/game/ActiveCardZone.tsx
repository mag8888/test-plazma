import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

interface ActiveCardZoneProps {
    state: any;
    isMyTurn: boolean;
    me: any;
    roomId: string;
    onDismissMarket?: () => void;
    onMarketCardClick?: (card: any) => void;
    showDice?: boolean;
    diceValue?: number | null;
    previewCard?: any;
    onDismissPreview?: () => void;
}

export const ActiveCardZone = ({
    state,
    isMyTurn,
    me,
    roomId,
    onDismissMarket,
    onMarketCardClick,
    showDice,
    diceValue,
    previewCard,
    onDismissPreview
}: ActiveCardZoneProps) => {
    const [stockQty, setStockQty] = useState(1);
    // 'DETAILS' = Initial View (Info + Action Buttons)
    // 'TRANSACTION' = Slider + Confirm
    const [step, setStep] = useState<'DETAILS' | 'TRANSACTION'>('DETAILS');
    const [transactionMode, setTransactionMode] = useState<'BUY' | 'SELL'>('BUY');

    // Reset state when card changes
    useEffect(() => {
        setStep('DETAILS');
        setStockQty(1);
    }, [state.currentCard?.id, previewCard?.title]);

    // DICE ANIMATION (Self)
    if (showDice && isMyTurn) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                <div className="text-8xl filter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-bounce relative z-10">🎲</div>
                {diceValue && (
                    <div className="text-5xl font-black text-white mt-4 animate-in fade-in slide-in-from-bottom-4">
                        {diceValue}
                    </div>
                )}
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-2 animate-pulse">Ваш бросок</div>
            </div>
        );
    }

    // Default Placeholder (No Card, No Dice)
    if (!state.currentCard && !state.activeMarketCards?.length && !['OPPORTUNITY_CHOICE', 'CHARITY_CHOICE', 'BABY_ROLL', 'DOWNSIZED_DECISION'].includes(state.phase)) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500/50">
                <div className="text-4xl mb-2 opacity-50">🃏</div>
                <div className="text-[10px] items-center text-center uppercase font-bold tracking-widest">
                    <div>Нет активных</div>
                    <div>карт</div>
                </div>
            </div>
        );
    }

    // 1. OPPORTUNITY CHOICE (Small / Big)
    if (state.phase === 'OPPORTUNITY_CHOICE' && isMyTurn) {
        return (
            <div className="flex flex-col h-full w-full relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-t-3xl"></div>
                <div className="p-3 flex-1 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 shrink-0 h-10">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center text-lg">⚡</div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-tight">Возможность</h2>
                            <p className="text-[9px] text-slate-400">Выберите тип сделки</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full mt-auto mb-2">
                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })} className="w-full bg-slate-800 hover:bg-slate-700/80 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between group transition-all relative overflow-hidden active:scale-[0.98]">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                            <div className="text-left pl-3">
                                <div className="font-bold text-emerald-400 text-xs">Малая Сделка</div>
                                <div className="text-[9px] text-slate-500">Макс. 5 000$</div>
                            </div>
                            {(state.deckCounts?.small) && <div className="text-[9px] bg-emerald-900/40 px-2 py-0.5 rounded text-emerald-300 font-mono">{state.deckCounts.small.remaining}</div>}
                        </button>

                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="w-full bg-slate-800 hover:bg-slate-700/80 p-3 rounded-xl border border-purple-500/30 flex items-center justify-between group transition-all relative overflow-hidden active:scale-[0.98]">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                            <div className="text-left pl-3">
                                <div className="font-bold text-purple-400 text-xs">Крупная Сделка</div>
                                <div className="text-[9px] text-slate-500">Мин. 6 000$</div>
                            </div>
                            {(state.deckCounts?.big) && <div className="text-[9px] bg-purple-900/40 px-2 py-0.5 rounded text-purple-300 font-mono">{state.deckCounts.big.remaining}</div>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. CHARITY CHOICE
    if (state.phase === 'CHARITY_CHOICE' && isMyTurn) {
        return (
            <div className="flex flex-col h-full w-full relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-t-3xl"></div>
                <div className="p-3 flex-1 flex flex-col items-center text-center justify-center h-full">
                    <div className="text-3xl mb-2">❤️</div>
                    <h2 className="text-sm font-bold text-white mb-2">Благотворительность</h2>
                    <p className="text-slate-400 text-[10px] mb-4 leading-relaxed">
                        Пожертвуйте <span className="text-pink-400 font-bold">{me.isFastTrack ? '$100k' : '10%'}</span> <br />
                        для бонусов на 3 хода.
                    </p>
                    <div className="flex gap-2 w-full mt-auto">
                        <button onClick={() => socket.emit('donate_charity', { roomId })} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]">
                            Да (${(Math.max(0, me.income * 0.1)).toLocaleString()})
                        </button>
                        <button onClick={() => socket.emit('skip_charity', { roomId })} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider transition-transform active:scale-[0.98]">
                            Нет
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. BABY ROLL
    if (state.phase === 'BABY_ROLL') {
        if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse text-xs">👶 Ожидание броска...</div>;
        return (
            <div className="flex flex-col h-full w-full relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-rose-400 rounded-t-3xl"></div>
                <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-2 animate-bounce">👶</div>
                    <h2 className="text-sm font-bold text-white mb-3">Пополнение в семье!</h2>
                    <button
                        onClick={() => socket.emit('roll_dice', { roomId })}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-pink-900/30"
                    >
                        Бросить кубик
                    </button>
                </div>
            </div>
        );
    }

    // 4. DOWNSIZED DECISION
    if (state.phase === 'DOWNSIZED_DECISION') {
        if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">📉 Принимает решение...</div>;
        return (
            <div className="flex flex-col h-full w-full relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-t-3xl"></div>
                <div className="p-3 flex-1 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 shrink-0 h-10">
                        <div className="text-xl">📉</div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-tight">Увольнение!</h2>
                            <div className="text-[9px] text-slate-400">Вы временно без работы</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full mt-auto">
                        <button
                            onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_1M' })}
                            disabled={me.cash < me.expenses * 1}
                            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex justify-between border border-slate-700 items-center group transition-all active:scale-[0.98]"
                        >
                            <span className="text-left flex flex-col items-start">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">1 месяц</span>
                                <span className="text-[9px] text-slate-500">Пропуск 2 ходов</span>
                            </span>
                            <span className="text-red-400 font-mono font-bold">${(me.expenses).toLocaleString()}</span>
                        </button>

                        <button
                            onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_2M' })}
                            disabled={me.cash < me.expenses * 2}
                            className="w-full bg-blue-900/30 hover:bg-blue-800/40 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex justify-between border border-blue-500/30 items-center group transition-all active:scale-[0.98]"
                        >
                            <span className="text-left flex flex-col items-start">
                                <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">2 месяца</span>
                                <span className="text-[9px] text-slate-500">Играть сразу</span>
                            </span>
                            <span className="text-red-400 font-mono font-bold">${(me.expenses * 2).toLocaleString()}</span>
                        </button>

                        <button
                            onClick={() => { if (confirm('Банкротство?')) socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' }); }}
                            className="text-red-500/70 hover:text-red-400 text-[9px] mt-2 uppercase font-bold tracking-widest text-center py-2"
                        >
                            Объявить банкротство
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 5. CURRENT CARD OR PREVIEW (Main Logic)
    const effectiveCard = state.currentCard || previewCard;
    if (effectiveCard) {
        const card = effectiveCard;
        const isPreview = !!previewCard && !state.currentCard;

        const isOffer = card.type === 'OFFER'; // Market offer
        const isStock = !!card.symbol; // Stock card
        // Check if we own this stock (for Sell option)
        const ownedStock = me.assets?.find((a: any) => a.symbol === card.symbol);
        const ownedQty = ownedStock ? ownedStock.quantity : 0;
        const canAfford = me.cash >= (card.cost || 0);

        // --- SHARED LAYOUT: HEADER ---
        // Keeps the top part fixed to prevent jumping
        const CardHeader = () => (
            <div className="flex items-start justify-between gap-2 mb-2 shrink-0 h-10">
                {/* Title Section */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-2" title={card.title}>{card.title}</h3>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5 opacity-70">
                        {card.symbol || card.type}
                    </div>
                </div>
                {/* Price Badge */}
                {(card.cost || card.price) && (
                    <div className="text-right shrink-0 bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-700/30">
                        <div className="text-[8px] text-slate-500 uppercase font-bold">Цена</div>
                        <div className="text-sm font-mono font-bold text-red-300">
                            ${(card.cost || card.price).toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        );

        return (
            <div className="flex flex-col h-full w-full relative">
                {/* Color Bar */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r rounded-t-3xl ${card.cashflow > 0 ? 'from-green-500 to-emerald-500' :
                    card.cost > 0 && !card.symbol ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-500'
                    }`}></div>

                <div className="p-3 flex-1 flex flex-col h-full overflow-hidden">
                    {/* FIXED HEADER */}
                    <CardHeader />

                    {/* BODY CONTENT (Swappable) */}
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        {step === 'DETAILS' ? (
                            // -- DETAILS VIEW --
                            <>
                                {/* Description (Scrollable) */}
                                <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/30 mb-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                    <p className="text-[10px] text-slate-300 leading-relaxed">
                                        {card.description}
                                    </p>
                                    {/* Stats Grid */}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {card.cashflow !== 0 && (
                                            <div className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/30 border border-green-500/30 text-green-300 font-mono flex items-center gap-1">
                                                <span>Cashflow:</span> <b>+${card.cashflow}</b>
                                            </div>
                                        )}
                                        {card.roi && (
                                            <div className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-500/30 text-blue-300 font-mono">
                                                ROI: {card.roi}%
                                            </div>
                                        )}
                                        {card.rule && (
                                            <div className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 font-mono">
                                                {card.rule}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions (Fixed at Bottom) */}
                                {isMyTurn && (
                                    <div className="grid grid-cols-2 gap-2 mt-auto shrink-0">
                                        <button
                                            onClick={() => {
                                                if (isStock) {
                                                    setTransactionMode('BUY');
                                                    const maxBuy = Math.floor(me.cash / (card.cost || 1));
                                                    setStockQty(maxBuy > 0 ? maxBuy : 1);
                                                    setStep('TRANSACTION');
                                                } else {
                                                    setTransactionMode('BUY');
                                                    setStockQty(1);
                                                    setStep('TRANSACTION');
                                                }
                                            }}
                                            // Enable button even if low cash, to allow credit-buy flow in Transaction step
                                            disabled={!isStock && false}
                                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                        >
                                            Купить
                                        </button>

                                        {isStock && ownedQty > 0 && (
                                            <button
                                                onClick={() => {
                                                    setTransactionMode('SELL');
                                                    setStockQty(ownedQty);
                                                    setStep('TRANSACTION');
                                                }}
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                            >
                                                Продать
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                if (isPreview) onDismissPreview?.();
                                                else if (isOffer) onDismissMarket?.();
                                                else socket.emit('end_turn', { roomId });
                                            }}
                                            className={`bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider ${(!isStock && ownedQty <= 0) ? 'col-span-1' : 'col-span-2'}`}
                                        >
                                            {isPreview ? 'Закрыть' : (isStock || isOffer ? 'Пропустить' : 'Отказаться')}
                                        </button>
                                    </div>
                                )}

                                {/* Deal Choice for Details View */}
                                {isMyTurn && card.type === 'DEAL' && !card.id && (
                                    <div className="grid grid-cols-2 gap-2 mt-auto shrink-0">
                                        <button
                                            onClick={() => { socket.emit('draw_deal', { roomId, type: 'SMALL' }); onDismissPreview?.(); }}
                                            disabled={me.cash < 500}
                                            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-lg flex flex-col items-center justify-center p-1"
                                        >
                                            <span>Малая</span>
                                            <span className="text-[8px] opacity-70">до $5k</span>
                                        </button>
                                        <button
                                            onClick={() => { socket.emit('draw_deal', { roomId, type: 'BIG' }); onDismissPreview?.(); }}
                                            disabled={me.cash < 2000}
                                            className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-lg flex flex-col items-center justify-center p-1"
                                        >
                                            <span>Крупная</span>
                                            <span className="text-[8px] opacity-70">от $6k</span>
                                        </button>
                                    </div>
                                )}

                                {/* Read Only / Not My Turn */}
                                {(isMyTurn && isPreview && card.type !== 'DEAL' && !isOffer && !isStock) && (
                                    <button
                                        onClick={() => onDismissPreview?.()}
                                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider mt-auto"
                                    >
                                        {['PAYDAY', 'BABY', 'DOWNSIZED', 'LOSS', 'DOODAD', 'TAX'].includes(card.type) ? 'OK' : 'Закрыть'}
                                    </button>
                                )}
                                {!isMyTurn && isPreview && (
                                    <button
                                        onClick={onDismissPreview}
                                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider mt-auto"
                                    >
                                        Закрыть
                                    </button>
                                )}
                            </>
                        ) : (
                            // -- TRANSACTION VIEW --
                            <>
                                {/* Transaction Mode Header (Back + Mode) */}
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5 shrink-0">
                                    <button onClick={() => setStep('DETAILS')} className="text-slate-400 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1 group">
                                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Назад
                                    </button>
                                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${transactionMode === 'BUY' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'}`}>
                                        {transactionMode === 'BUY' ? 'Покупка' : 'Продажа'}
                                    </div>
                                </div>

                                {/* Slider Control */}
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 mb-auto">
                                    {(() => {
                                        const price = card.cost || card.price || 0;
                                        const total = price * stockQty;
                                        // Don't limit maxBuy by cash for stocks if we want to allow loans, BUT loans for stocks is risky/complex. 
                                        // User said "2 when buying... allowed to take loan". Usually stocks allow buying as much as you want if you take loans? 
                                        // Let's allow max 100 or something if cash is 0, or just keep maxBuy for stocks logic but enable 'Borrow' if they want more.
                                        // For Simplicity, if it's a regular asset (Startups, Real Estate), enable borrow. For stocks, usually you borrow to buy? Yes.
                                        // But range input depends on max!
                                        // If we want to buy MORE than cash allows, we need to increase Max. 
                                        // Let's set Max to a high number (e.g. 100 or cost/1000) if we want to support credit buys for stocks.
                                        // For now, let's keep stock limits simple (cash based) unless specifically asked, but for Real Estate (qty=1), it matters most.

                                        // Re-calc variables inside render to be safe or use state?
                                        // Using the ones from parent scope if I didn't hide them. 
                                        // Since I replaced the block, I need to re-declare or use logic here.
                                        // Step was checking 'step' variable.

                                        // Logic Re-implementation:
                                        const maxBuyCash = Math.floor(me.cash / (price || 1));
                                        // If stock, allow at least 100 to show loan possibility? Or just limited to cash?
                                        // Standard Cashflow: You can borrow to buy stock.
                                        // Let's set a 'theoretical' max based on credit limit? Borrowing limit is usually cashflow related.
                                        // To remain simple: For Stocks, allow up to 100 items (arbitrary) or just keep cash limit? 
                                        // User's request specifically showed a Real Estate card ("Room in suburbs") which usually has Qty=1.
                                        // So for non-stocks, Max is 1.
                                        // For Stocks, I'll update Max to be larger.

                                        const maxVal = transactionMode === 'BUY'
                                            ? (isStock ? Math.max(maxBuyCash, 100) : 1)
                                            : ownedQty;

                                        const minVal = 1;

                                        // Loan Check
                                        const loanNeeded = total > me.cash ? (total - me.cash) : 0;

                                        return (
                                            <>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <button
                                                        onClick={() => setStockQty(Math.max(minVal, stockQty - 1))}
                                                        className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center active:scale-95"
                                                    >-</button>
                                                    <div className="flex-1 text-center font-mono text-2xl font-black text-white">{stockQty}</div>
                                                    <button
                                                        onClick={() => setStockQty(Math.min(maxVal, stockQty + 1))}
                                                        className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center active:scale-95"
                                                    >+</button>
                                                </div>

                                                {(isStock || maxVal > 1) && (
                                                    <input
                                                        type="range"
                                                        min={minVal}
                                                        max={maxVal}
                                                        value={stockQty}
                                                        onChange={(e) => setStockQty(parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                                                    />
                                                )}

                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700/30">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Итого</span>
                                                    <div className="text-right flex flex-col items-end">
                                                        <span className={`text-sm font-mono font-bold ${transactionMode === 'BUY' ? 'text-red-400' : 'text-green-400'}`}>
                                                            {transactionMode === 'BUY' ? '-' : '+'}${total.toLocaleString()}
                                                        </span>
                                                        {loanNeeded > 0 && transactionMode === 'BUY' && (
                                                            <span className="text-[9px] text-yellow-500 font-mono">
                                                                (Кредит: +${(Math.ceil(loanNeeded / 1000) * 1000).toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Confirm Actions */}
                                                <div className="mt-4 flex flex-col gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (transactionMode === 'BUY') {
                                                                // Auto Credit Logic
                                                                if (loanNeeded > 0) {
                                                                    const amount = Math.ceil(loanNeeded / 1000) * 1000;
                                                                    if (confirm(`Не хватает средств. Взять кредит $${amount.toLocaleString()} и купить?`)) {
                                                                        socket.emit('take_loan', { roomId, amount });
                                                                        // Small delay to ensure loan is processed (optimistic UI)
                                                                        setTimeout(() => {
                                                                            socket.emit('buy_asset', { roomId, quantity: stockQty });
                                                                        }, 200);
                                                                    }
                                                                } else {
                                                                    socket.emit('buy_asset', { roomId, quantity: stockQty });
                                                                }
                                                            } else {
                                                                socket.emit('sell_stock', { roomId, quantity: stockQty });
                                                            }
                                                            if (isPreview) onDismissPreview?.();
                                                        }}
                                                        // Disable only if selling and no qty (shouldn't happen) or if technically impossible (but buying with credit is now possible)
                                                        disabled={transactionMode === 'SELL' && stockQty > ownedQty}
                                                        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]
                                                            ${transactionMode === 'BUY'
                                                                ? (loanNeeded > 0 ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white')
                                                                : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                                    >
                                                        {transactionMode === 'BUY'
                                                            ? (loanNeeded > 0 ? `Кредит и Купить` : `Купить за $${total.toLocaleString()}`)
                                                            : `Продать за $${total.toLocaleString()}`}
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 6. MARKET OFFERS (Placeholder or List)
    if (state.activeMarketCards?.length > 0) {
        return (
            <div className="flex flex-col h-full w-full relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-t-3xl"></div>
                <div className="p-3 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🏪</span>
                            <span className="text-xs font-bold text-white uppercase">Рынок</span>
                        </div>
                        <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{state.activeMarketCards.length} предл.</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {state.activeMarketCards.map((mc: any) => (
                            <div
                                key={mc.id}
                                onClick={() => onMarketCardClick?.(mc)}
                                className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 hover:border-blue-500/50 cursor-pointer transition-all flex justify-between items-center group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-slate-300 truncate">{mc.card.title}</div>
                                    <div className="text-[9px] text-slate-500 font-mono">${mc.card.cost?.toLocaleString() || mc.card.price?.toLocaleString()}</div>
                                </div>
                                <div className="text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    →
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return null; // Fallback
};
