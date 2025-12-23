import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { ConfirmModal } from './ConfirmModal';

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

// Helper specific to Feed Item
const FeedCardItem = ({
    cardWrapper,
    me,
    roomId,
    isMyTurn,
    onDismiss
}: {
    cardWrapper: any,
    me: any,
    roomId: string,
    isMyTurn: boolean,
    onDismiss: () => void
}) => {
    const card = cardWrapper.card || cardWrapper; // Handle wrapper or direct card
    const source = cardWrapper.source || 'CURRENT'; // 'MARKET' or 'CURRENT'

    const [stockQty, setStockQty] = useState(1);
    const [step, setStep] = useState<'DETAILS' | 'TRANSACTION'>('DETAILS');
    const [transactionMode, setTransactionMode] = useState<'BUY' | 'SELL'>('BUY');
    const [showLoanConfirm, setShowLoanConfirm] = useState(false);
    const [pendingLoan, setPendingLoan] = useState<{ amount: number; quantity: number } | null>(null);

    // Timer Logic Corrected: Use expiresAt if available, else default to 120 (but don't reset on re-render if possible?)
    // Actually, if re-rendered with same wrapper, we want to persist. 
    // wrapper.expiresAt is absolute timestamp.
    const getInitialTime = () => {
        if (cardWrapper.expiresAt) {
            return Math.max(0, Math.ceil((cardWrapper.expiresAt - Date.now()) / 1000));
        }
        return 120;
    };

    const [timeLeft, setTimeLeft] = useState(getInitialTime());

    // Local Timer
    useEffect(() => {
        const timer = setInterval(() => {
            if (cardWrapper.expiresAt) {
                // Sync exactly with server time
                setTimeLeft(Math.max(0, Math.ceil((cardWrapper.expiresAt - Date.now()) / 1000)));
            } else {
                // Fallback countdown
                setTimeLeft((prev) => Math.max(0, prev - 1));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [cardWrapper.expiresAt]);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isOffer = source === 'MARKET';
    const isStock = !!card.symbol;
    const ownedStock = me.assets?.find((a: any) => a.symbol === card.symbol);
    const ownedQty = ownedStock ? ownedStock.quantity : 0;

    // --- CALCULATIONS FOR TRANSACTION MODE (Must be top level) ---
    const price = card.cost || card.price || 0;

    // Credit Logic
    const maxNewLoan = Math.max(0, Math.floor((me.cashflow || 0) / 100) * 1000);
    const availableLoan = Math.max(0, maxNewLoan - (me.loanDebt || 0));
    const maxBuyCash = Math.floor(me.cash / (price || 1));
    const maxBuyCredit = Math.floor(availableLoan / (price || 1));

    const maxVal = transactionMode === 'BUY'
        ? (isStock ? Math.max(1, maxBuyCash + maxBuyCredit) : 1)
        : ownedQty;

    const total = price * stockQty;
    const loanNeeded = Math.max(0, total - me.cash);

    // Ensure default is reasonable
    useEffect(() => {
        // Safe to run effect here as it's top level
        if (step === 'TRANSACTION' && transactionMode === 'BUY' && isStock && stockQty === 1 && maxVal > 1) {
            // Optional: Don't auto-set, let user decide
        }
    }, [step, transactionMode, isStock, stockQty, maxVal]);

    // Header Component
    const CardHeader = () => (
        <div className="flex items-start justify-between gap-2 mb-2 shrink-0 h-10">
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight line-clamp-2" title={card.title}>{card.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider opacity-70">
                        {card.symbol || card.type}
                    </span>
                    {/* Timer Badge */}
                    <span className={`text-[9px] font-mono px-1.5 rounded ${timeLeft < 30 ? 'bg-red-900/50 text-red-400 animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>
            {card.type === 'MARKET' && card.offerPrice ? (
                <div className="text-right shrink-0 bg-blue-900/40 px-2 py-1 rounded-lg border border-blue-500/30">
                    <div className="text-[8px] text-blue-400 uppercase font-bold">Предложение</div>
                    <div className="text-sm font-mono font-bold text-green-400">
                        ${card.offerPrice.toLocaleString()}
                    </div>
                </div>
            ) : card.type !== 'MARKET' && (card.cost || card.price) ? (
                <div className="text-right shrink-0 bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-700/30">
                    <div className="text-[8px] text-slate-500 uppercase font-bold">Цена</div>
                    <div className="text-sm font-mono font-bold text-red-300">
                        ${(card.cost || card.price).toLocaleString()}
                    </div>
                </div>
            ) : null}
        </div>
    );

    return (
        <div className="relative w-full shrink-0 rounded-2xl overflow-hidden bg-[#1e293b] border border-slate-700/30 shadow-lg flex flex-col group transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 min-h-[280px]">
            {/* Color Bar */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.cashflow > 0 ? 'from-green-500 to-emerald-500' :
                card.cost > 0 && !card.symbol ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-500'
                }`}></div>

            <div className="p-3 flex flex-col gap-2 flex-1">
                <CardHeader />

                {step === 'DETAILS' ? (
                    <>
                        <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/30 flex-1 overflow-y-auto custom-scrollbar">
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                                {card.description}
                            </p>
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
                            </div>
                        </div>

                        {/* Actions */}
                        {isMyTurn && (
                            <div className="flex gap-2 mt-1 w-full">
                                {card.type === 'EXPENSE' ? (
                                    <button
                                        onClick={() => {
                                            setTransactionMode('BUY');
                                            setStockQty(1);
                                            setStep('TRANSACTION');
                                        }}
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                    >
                                        Оплатить
                                    </button>
                                ) : card.type === 'MARKET' ? (
                                    <>
                                        {/* Market Card Actions: Only Sell if owned, otherwise Close */}
                                        {/* Check if player owns the asset requested by Market */}
                                        {(() => {
                                            // Logic to find if player has the asset
                                            // Market card usually has 'targetTitle' or we check manually
                                            // For now, simple check using 'ownedQty' which already calculates based on title match in FeedCardItem
                                            const canSell = ownedQty > 0;
                                            return canSell ? (
                                                <button
                                                    onClick={() => {
                                                        setTransactionMode('SELL');
                                                        setStockQty(ownedQty);
                                                        setStep('TRANSACTION');
                                                    }}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                                >
                                                    Продать
                                                </button>
                                            ) : null;
                                        })()}

                                        <button
                                            onClick={onDismiss}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider"
                                        >
                                            Закрыть
                                        </button>
                                    </>
                                ) : (
                                    /* Standard Deal Actions */
                                    <>
                                        <button
                                            onClick={() => {
                                                setTransactionMode('BUY');
                                                const price = card.cost || card.price || 0;
                                                const maxBuy = price > 0 ? Math.floor(me.cash / price) : 1;
                                                setStockQty(isStock && maxBuy > 0 ? maxBuy : 1);
                                                setStep('TRANSACTION');
                                            }}
                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
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
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                            >
                                                Продать
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                if (isOffer) onDismiss();
                                                else onDismiss();
                                            }}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider"
                                        >
                                            {isOffer ? 'Закрыть' : 'Отказаться'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        {/* Deal Choice (Small/Big) Helper - If Card is a generic Deal placeholder */}
                        {isMyTurn && card.type === 'DEAL' && !card.id && (
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <button onClick={() => { socket.emit('draw_deal', { roomId, type: 'SMALL' }); onDismiss(); }} disabled={me.cash < 500} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-[10px] uppercase">
                                    Малая (до $5k)
                                </button>
                                <button onClick={() => { socket.emit('draw_deal', { roomId, type: 'BIG' }); onDismiss(); }} disabled={me.cash < 2000} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-[10px] uppercase">
                                    Крупная (от $6k)
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    // Transaction View inside Card
                    <div className="bg-slate-900/40 p-1.5 rounded-lg border border-white/5 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/5 h-6">
                            <button onClick={() => setStep('DETAILS')} className="text-slate-400 hover:text-white text-[9px] uppercase font-bold flex items-center gap-1 h-full px-1 hover:bg-white/5 rounded">← Назад</button>
                            <div className={`text-[9px] font-bold uppercase ${transactionMode === 'BUY' ? 'text-green-400' : 'text-blue-400'}`}>
                                {transactionMode === 'BUY' ? 'Покупка' : 'Продажа'}
                            </div>
                        </div>

                        {/* Logic for Slider/Calc - Now using pre-calculated values */}
                        <div className="flex flex-col gap-2 mb-2">
                            {(isStock || (!card.offerPrice && maxVal > 1)) && (
                                <>
                                    <div className="flex items-center gap-2 justify-between">
                                        <button
                                            onClick={() => setStockQty(Math.max(1, stockQty - 1))}
                                            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                                        >-</button>

                                        <div className="flex flex-col items-center">
                                            <input
                                                type="number"
                                                value={stockQty}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 1 && val <= maxVal) setStockQty(val);
                                                }}
                                                className="w-16 bg-transparent text-center font-black text-xl outline-none text-white font-mono"
                                            />
                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Количество</span>
                                        </div>

                                        <button
                                            onClick={() => setStockQty(Math.min(maxVal, stockQty + 1))}
                                            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                                        >+</button>
                                    </div>

                                    {/* SLIDER */}
                                    {maxVal > 1 && (
                                        <div className="px-1">
                                            <input
                                                type="range"
                                                min="1"
                                                max={maxVal}
                                                value={stockQty}
                                                onChange={(e) => setStockQty(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 mb-2 space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400 uppercase font-bold">Цена за шт.</span>
                                {/* Fix for Market Offers ($0 calc) */}
                                <span className="text-white font-mono">${(card.offerPrice || price).toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-slate-700/50"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-200 uppercase font-black text-[10px]">Итого</span>
                                <div className="text-right">
                                    <div className="font-mono font-black text-sm text-emerald-400">${(transactionMode === 'SELL' && card.offerPrice ? card.offerPrice * stockQty : total).toLocaleString()}</div>
                                </div>
                            </div>
                            {loanNeeded > 0 && transactionMode === 'BUY' && (
                                <div className="flex justify-between items-center bg-yellow-500/10 p-1.5 rounded border border-yellow-500/20 mt-1">
                                    <span className="text-[9px] text-yellow-500 font-bold uppercase">Требуется Кредит</span>
                                    <span className="font-mono font-bold text-yellow-400 text-[10px]">${(Math.ceil(loanNeeded / 1000) * 1000).toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                if (transactionMode === 'BUY') {
                                    if (loanNeeded > 0) {
                                        const amount = Math.ceil(loanNeeded / 1000) * 1000;
                                        setPendingLoan({ amount, quantity: stockQty });
                                        setShowLoanConfirm(true);
                                    } else {
                                        socket.emit('buy_asset', { roomId, quantity: stockQty });
                                    }
                                } else {
                                    // MARKET SELL or STOCK SELL
                                    if (card.type === 'MARKET') {
                                        // Special Market Sell
                                        socket.emit('sell_asset', { roomId }); // Market sells usually imply selling 'the thing requested'
                                        // Wait... backend 'sell_asset' is generic "sell asset to bank"? Or "sell to market offer"?
                                        // Engine.ts > sellAsset logic usually checks for activeMarketCards.
                                        // Let's verify Engine.ts logic for `sell_asset`.
                                    } else {
                                        socket.emit('sell_stock', { roomId, quantity: stockQty });
                                    }
                                }
                            }}
                            className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-[0.98]
                                ${loanNeeded > 0 ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'}
                            `}
                        >
                            {loanNeeded > 0 ? '💰 Кредит и Купить' : (transactionMode === 'SELL' ? '💵 Продать' : '✅ Подтвердить')}
                        </button>
                    </div>
                )}
            </div>

            {/* Loan Confirmation Modal */}
            <ConfirmModal
                isOpen={showLoanConfirm}
                title="Подтвердите действие"
                message={`Взять кредит $${pendingLoan?.amount.toLocaleString()} для покупки?`}
                confirmText="Взять кредит"
                cancelText="Отмена"
                variant="warning"
                onConfirm={() => {
                    if (pendingLoan) {
                        socket.emit('take_loan', { roomId, amount: pendingLoan.amount });
                        setTimeout(() => socket.emit('buy_asset', { roomId, quantity: pendingLoan.quantity }), 500);
                    }
                    setShowLoanConfirm(false);
                    setPendingLoan(null);
                }}
                onCancel={() => {
                    setShowLoanConfirm(false);
                    setPendingLoan(null);
                }}
            />
        </div>
    );
};

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

    // PRE-CARD PHASES (Blocking)
    // 1. OPPORTUNITY CHOICE
    if (state.phase === 'OPPORTUNITY_CHOICE' && isMyTurn) {
        return (
            <div className="flex flex-col h-full w-full relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-t-3xl"></div>
                <div className="p-2 flex-1 flex flex-col h-full justify-center">
                    <div className="flex items-center gap-2 mb-1 shrink-0 h-6">
                        <div className="w-5 h-5 bg-yellow-500/20 rounded flex items-center justify-center text-xs">⚡</div>
                        <div>
                            <h2 className="text-xs font-bold text-white leading-tight">Возможность</h2>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full mt-1">
                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })} className="w-full bg-slate-800 hover:bg-slate-700/80 p-2 rounded-lg border border-emerald-500/30 flex items-center justify-between group">
                            <div className="text-left pl-1">
                                <div className="font-bold text-emerald-400 text-[10px]">Малая Сделка</div>
                                <div className="text-[8px] text-slate-500">Макс. 5 000$</div>
                            </div>
                        </button>
                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="w-full bg-slate-800 hover:bg-slate-700/80 p-2 rounded-lg border border-purple-500/30 flex items-center justify-between group">
                            <div className="text-left pl-1">
                                <div className="font-bold text-purple-400 text-[10px]">Крупная Сделка</div>
                                <div className="text-[8px] text-slate-500">Мин. 6 000$</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // 2. CHARITY
    // 2. CHARITY CHOICE
    if (state.phase === 'CHARITY_CHOICE') {
        if (!isMyTurn) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-500/80 animate-pulse bg-slate-900/40 rounded-2xl border border-slate-800/50">
                    <div className="text-3xl mb-2 grayscale opacity-50">❤️</div>
                    <div className="text-center">
                        <div className="text-xs font-bold text-slate-300 mb-1">{state.players[state.currentPlayerIndex]?.name}</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-70">решает насчет<br />благотворительности</div>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col h-full w-full relative bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-t-3xl"></div>
                <div className="p-3 flex-1 flex flex-col items-center text-center justify-center h-full">
                    <div className="text-3xl mb-2">❤️</div>
                    <h2 className="text-sm font-bold text-white mb-2">Благотворительность</h2>
                    <p className="text-slate-400 text-[10px] mb-4 leading-relaxed">
                        Пожертвуйте <span className="text-pink-400 font-bold">{me.isFastTrack ? '$100k' : '10%'}</span> <br />
                        для бонусов на 3 хода.
                    </p>
                    <div className="flex gap-2 w-full mt-auto">
                        <button onClick={() => socket.emit('donate_charity', { roomId })} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider shadow-lg">
                            Да (${(Math.max(0, me.income * 0.1)).toLocaleString()})
                        </button>
                        <button onClick={() => socket.emit('skip_charity', { roomId })} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider">
                            Нет
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // 3. BABY / DOWNSIZED (Simplified for Feed-like? No, these are events)
    if (['BABY_ROLL', 'DOWNSIZED_DECISION'].includes(state.phase)) {
        // ... (Keep existing logic short or rewrite. I'll rewrite to be safe)
        if (state.phase === 'BABY_ROLL') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse text-xs">👶 Ожидание броска...</div>;
            return (
                <div className="flex flex-col h-full w-full relative p-3 items-center justify-center text-center">
                    <div className="text-4xl mb-2 animate-bounce">👶</div>
                    <h2 className="text-sm font-bold text-white mb-3">Пополнение в семье!</h2>
                    <button onClick={() => socket.emit('roll_dice', { roomId })} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-lg">
                        Бросить кубик
                    </button>
                </div>
            );
        }
        if (state.phase === 'DOWNSIZED_DECISION') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">📉 Принимает решение...</div>;
            return (
                <div className="flex flex-col h-full w-full relative p-3">
                    <div className="flex items-center gap-2 mb-2 shrink-0 h-10">
                        <div className="text-xl">📉</div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-tight">Увольнение!</h2>
                            <div className="text-[9px] text-slate-400">Вы временно без работы</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-auto">
                        <button onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_1M' })} disabled={me.cash < me.expenses} className="w-full bg-slate-800 p-3 rounded-xl text-xs flex justify-between border border-slate-700">
                            <span className="text-left text-[10px]">1 мес (Пропуск 2)</span>
                            <span className="text-red-400 font-mono">${me.expenses.toLocaleString()}</span>
                        </button>
                        <button onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_2M' })} disabled={me.cash < me.expenses * 2} className="w-full bg-slate-800 p-3 rounded-xl text-xs flex justify-between border border-slate-700">
                            <span className="text-left text-[10px]">2 мес (Играть)</span>
                            <span className="text-red-400 font-mono">${(me.expenses * 2).toLocaleString()}</span>
                        </button>
                        <button onClick={() => { if (confirm('Банкротство?')) socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' }); }} className="text-red-500/70 text-[9px] mt-2 uppercase text-center">
                            Объявить банкротство
                        </button>
                    </div>
                </div>
            );
        }
    }

    // MAIN FEED LOGIC
    // Combine Market Cards + Active Card
    const marketCards = (state.activeMarketCards || []).map((mc: any) => ({ ...mc, card: mc.card, source: 'MARKET', id: mc.id }));

    // Check if current card is already in market cards to prevent dupes
    const isDuplicate = marketCards.some((mc: any) => mc.card.id === state.currentCard?.id);

    const currentCard = (state.currentCard || previewCard) && !isDuplicate
        ? [{ card: state.currentCard || previewCard, source: 'CURRENT', id: (state.currentCard || previewCard).id || 'curr' }]
        : [];

    // User wants "New cards under the bottom". 
    // Feed = [Market..., Current]. 
    const feedItems = [...marketCards, ...currentCard];

    // Show Dice if rolling (Overlay or Top Item?)
    // If showDice is true, I should probably show it ABOVE the feed or blocking.
    if (showDice && isMyTurn) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                <div className="text-8xl filter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-bounce relative z-10">🎲</div>
                {diceValue && <div className="text-5xl font-black text-white mt-4">{diceValue}</div>}
            </div>
        );
    }

    if (feedItems.length === 0) {
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

    return (
        <div className="flex flex-col h-full w-full relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-3xl z-10"></div>

            {/* Scrollable Feed */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-3 pb-4">
                {/* Header for Market? User screenshot showed 'РЫНОК'. */}
                {/* I'll just render items. If there are market items, maybe a small label? */}

                {feedItems.map((item: any, idx: number) => (
                    <FeedCardItem
                        key={item.id || idx}
                        cardWrapper={item}
                        me={me}
                        roomId={roomId}
                        isMyTurn={isMyTurn}
                        onDismiss={() => {
                            if (item.source === 'CURRENT') {
                                if (previewCard && !state.currentCard) onDismissPreview?.();
                                else socket.emit('end_turn', { roomId });
                            } else {
                                // Market dismiss
                                onDismissMarket?.(); // This might dismiss ALL? Needs specific logic usually.
                                // If onDismissMarket is global, we can't dismiss specific card.
                                // Assuming onDismissMarket is for 'closing the view', but here view is permanent feed.
                                // Maybe 'buy' is the only action for market unless owner cancels?
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
