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
    canShowCard?: boolean;
}

// Helper specific to Feed Item
const FeedCardItem = ({
    cardWrapper,
    me,
    roomId,
    isMyTurn,
    players,
    onDismiss,
    state,
    canShowCard
}: {
    cardWrapper: any,
    me: any,
    roomId: string,
    isMyTurn: boolean,
    players?: any[],
    onDismiss: () => void,
    state: any,
    canShowCard: boolean
}) => {
    const card = cardWrapper.card || cardWrapper; // Handle wrapper or direct card
    const source = cardWrapper.source || 'CURRENT'; // 'MARKET' or 'CURRENT'
    const [locallyDismissedIds, setLocallyDismissedIds] = useState<string[]>([]); // Added this state

    // Guard Clause: Prevent crash if state is undefined (e.g. during fast track transition)
    if (!state) return null;

    // Clear locally dismissed IDs when turn changes to prevent hiding recurring cards (e.g. reshuffled expenses)
    useEffect(() => {
        setLocallyDismissedIds([]);
    }, [state?.currentPlayerIndex, state?.phase]);

    // Stack Logic (Visuals)
    const [stockQty, setStockQty] = useState(1);
    const [stackCards, setStackCards] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'DETAILS' | 'TRANSACTION' | 'RESULT' | 'MLM_ROLL'>('DETAILS');
    const [mlmRoll, setMlmRoll] = useState<number | null>(null);
    const [transactionMode, setTransactionMode] = useState<'BUY' | 'SELL'>('BUY');
    const [showLoanConfirm, setShowLoanConfirm] = useState(false);
    const [pendingLoan, setPendingLoan] = useState<{ amount: number; quantity: number } | null>(null);
    const [showTransfer, setShowTransfer] = useState(false);

    // MLM Detection
    const isMLM = card.title?.toLowerCase().includes('network') || card.title?.toLowerCase().includes('сетевой') || card.description?.toLowerCase().includes('partners') || card.description?.toLowerCase().includes('партнер');

    // Auto-start in MLM_ROLL if needed and not yet done
    useEffect(() => {
        if (isMLM && viewMode === 'DETAILS') {
            setViewMode('MLM_ROLL');
        }
    }, [isMLM]);

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
    const ownedStock = me?.assets?.find((a: any) =>
        (card.symbol && a.symbol === card.symbol) ||
        (!card.symbol && (a.title === card.title || a.title === card.targetTitle))
    );
    // Use quantity or 1 for real estate if found
    const ownedQty = ownedStock ? (ownedStock.quantity || 1) : 0;
    const hasAsset = ownedQty > 0;

    // Owner Logic - Card creator OR anyone who owns the asset for market cards
    const isOriginalOwner = cardWrapper.sourcePlayerId === me?.id;
    const isOwner = isOffer && card.offerPrice ? hasAsset : isOriginalOwner;

    // Can Control Logic:
    // - For CURRENT card (my turn): canShowCard (it's my turn and I drew it)
    // - For MARKET cards: ONLY isOriginalOwner (only the owner can buy/transfer/dismiss)
    const canControl = source === 'MARKET' ? isOriginalOwner : canShowCard;

    // Auto-switch to TRANSACTION if owner
    useEffect(() => {
        if (isOwner && viewMode === 'DETAILS') {
            // For stock, stay in DETAILS to allow Buy/Sell choice.
            // For other Deals (Real Estate), go to transaction (Buy).
            if (!isStock && (card.type === 'DEAL' || card.type === 'DEAL_SMALL' || card.type === 'DEAL_BIG')) {
                setViewMode('TRANSACTION');
            }
        }
    }, [isOwner, viewMode, isStock, card.type]);

    // --- CALCULATIONS FOR TRANSACTION MODE (Must be top level) ---
    const price = card.cost || card.price || 0;

    // Credit Logic
    const maxNewLoan = Math.max(0, Math.floor((me?.cashflow || 0) / 100) * 1000);
    const availableLoan = Math.max(0, maxNewLoan - (me?.loanDebt || 0));
    const maxBuyCash = Math.floor((me?.cash || 0) / (price || 1));
    const maxBuyCredit = Math.floor(availableLoan / (price || 1));

    // ... (keeping existing calc code if needed, but easier to just insert `isOwner` check near render)

    // Skip to render part
    // ... 

    // I need to be careful with replace_file_content context.
    // I will use a targeted replace for the boolean check first.

    // Actually, let's just insert isOwner definition near other consts.

    // And update the condition check.



    const maxVal = transactionMode === 'BUY'
        ? (isStock ? Math.max(1, maxBuyCash + maxBuyCredit) : 1)
        : ownedQty;

    const total = price * stockQty;
    const loanNeeded = Math.max(0, total - (me?.cash || 0));

    // Ensure default is reasonable
    useEffect(() => {
        // Safe to run effect here as it's top level
        if (viewMode === 'TRANSACTION' && transactionMode === 'BUY' && isStock && stockQty === 1 && maxVal > 1) {
            // Optional: Don't auto-set, let user decide
        }
    }, [viewMode, transactionMode, isStock, stockQty, maxVal]);

    // Generate card number if not present
    const getCardNumber = () => {
        if (card.cardNumber) return card.cardNumber;
        if (card.displayId) {
            const prefix = card.type === 'DEAL_SMALL' ? 'M' :
                card.type === 'DEAL_BIG' ? 'B' :
                    card.type === 'MARKET' ? 'M' :
                        card.type === 'EXPENSE' ? 'R' : '';
            return `${prefix}${card.displayId}`;
        }
        return null;
    };
    const cardNumber = getCardNumber();

    // Header Component
    const CardHeader = () => (
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
                            ${card.offerPrice.toLocaleString()}
                        </div>
                    </div>
                ) : card.type !== 'MARKET' && (card.cost || card.price) ? (
                    <div className="text-right bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-700/30">
                        <div className="text-[8px] text-slate-500 uppercase font-bold">Цена</div>
                        <div className="text-sm font-mono font-bold text-red-300">
                            ${(card.cost || card.price).toLocaleString()}
                        </div>
                    </div>
                ) : null}
                {/* Close Button */}
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
            </div>
        </div>
    );

    return (
        <div className="relative w-full shrink-0 rounded-2xl overflow-hidden bg-[#1e293b] border border-slate-700/30 shadow-lg flex flex-col group transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 min-h-[280px] max-h-[85vh]">
            {/* Color Bar */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.cashflow > 0 ? 'from-green-500 to-emerald-500' :
                card.cost > 0 && !card.symbol ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-500'
                }`}></div>

            <div className="p-2 sm:p-4 flex flex-col gap-2 flex-1 overflow-x-hidden">
                <CardHeader />

                {/* DEBUG LOGGING */}
                {(() => {
                    if (isStock && ownedQty > 0) {
                        console.log(`[CardDebug] ID: ${card.id}, Type: ${card.type}, Stock: ${isStock}, Qty: ${ownedQty}, Mode: ${viewMode}, CanSeeButtons: true`);
                    }
                    return null;
                })()}

                {viewMode === 'DETAILS' ? (
                    <>
                        {card.type === 'PAYDAY' ? (
                            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/30 flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                                <span className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-bold">Ваш денежный поток</span>
                                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-green-400 tracking-tighter drop-shadow-lg mb-2">
                                    +${me?.cashflow?.toLocaleString() || 0}
                                </div>
                                <span className="text-[10px] text-slate-500">Зачислен на баланс</span>
                            </div>
                        ) : (
                            <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/30 flex-1 overflow-y-auto custom-scrollbar">
                                <p className="text-[10px] text-slate-300 leading-relaxed">
                                    {card.description}
                                </p>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {card.cashflow !== undefined && card.cashflow !== 0 && (
                                        <div className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/30 border border-green-500/30 text-green-300 font-mono flex items-center gap-1">
                                            <span>Cashflow:</span> <b>{card.cashflow > 0 ? '+' : ''}${card.cashflow}</b>
                                        </div>
                                    )}
                                    {card.roi && (
                                        <div className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-500/30 text-blue-300 font-mono">
                                            ROI: {card.roi}%
                                        </div>
                                    )}
                                    {/* Market Card: Show asset ownership status */}
                                    {card.type === 'MARKET' && (
                                        <div className={`text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 sm:col-span-2 ${ownedQty > 0
                                            ? 'bg-green-900/30 border border-green-500/30 text-green-300'
                                            : 'bg-red-900/30 border border-red-500/30 text-red-300'
                                            }`}>
                                            {ownedQty > 0 ? (
                                                <><span>✓</span> <b>У вас есть ({ownedQty} шт)</b></>
                                            ) : (
                                                <><span>✕</span> <b>У вас нет такого актива</b></>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {(isMyTurn || isOwner || canControl) && (
                            <div className="grid grid-cols-1 gap-2 mt-1 w-full">
                                {/* Asset Ownership Warning */}
                                {card.offerPrice && isOffer && !hasAsset && (
                                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2 mb-2 animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">⚠️</span>
                                            <span className="text-[10px] text-red-300 font-bold uppercase">У вас нет этого актива</span>
                                        </div>
                                    </div>
                                )}

                                {card.type === 'PAYDAY' ? (
                                    <button
                                        onClick={onDismiss}
                                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-lg uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                    >
                                        OK
                                    </button>
                                ) : card.type === 'EXPENSE' ? (
                                    <button
                                        onClick={() => {
                                            setTransactionMode('BUY');
                                            setStockQty(1);
                                            setViewMode('TRANSACTION');
                                        }}
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                    >
                                        Оплатить
                                    </button>
                                ) : card.type === 'MARKET' ? (
                                    <>
                                        {/* Market Card Actions */}
                                        {/* If it's a Stock, you can also BUY at this price - ONLY if you control the card */}
                                        {isStock && canControl && (
                                            <button
                                                onClick={() => {
                                                    setTransactionMode('BUY');
                                                    const price = card.offerPrice || card.cost || card.price || 0;
                                                    const maxBuy = price > 0 ? Math.floor(me.cash / price) : 1;
                                                    setStockQty(1);
                                                    setViewMode('TRANSACTION');
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                            >
                                                Купить
                                            </button>
                                        )}

                                        {ownedQty > 0 ? (
                                            <button
                                                onClick={() => {
                                                    setTransactionMode('SELL');
                                                    setStockQty(ownedQty);
                                                    setViewMode('TRANSACTION');
                                                }}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                            >
                                                Продать
                                            </button>
                                        ) : null}

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
                                        {/* Buy Button - Only for Drawer OR Transferred Owner */}
                                        {canControl && (
                                            <button
                                                onClick={() => {
                                                    if (isMLM) {
                                                        setViewMode('MLM_ROLL');
                                                    } else {
                                                        setTransactionMode('BUY');
                                                        const price = card.cost || card.price || 0;
                                                        const maxBuy = price > 0 ? Math.floor(me.cash / price) : 1;
                                                        setStockQty(isStock && maxBuy > 0 ? maxBuy : 1);
                                                        setViewMode('TRANSACTION');
                                                    }
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                            >
                                                {isMLM ? '🎲 Бросить' : 'Купить'}
                                            </button>
                                        )}

                                        {/* Sell Button - Open to everyone who owns the asset */}
                                        {isStock && ownedQty > 0 && (
                                            <button
                                                onClick={() => {
                                                    setTransactionMode('SELL');
                                                    setStockQty(ownedQty);
                                                    setViewMode('TRANSACTION');
                                                }}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                            >
                                                Продать
                                            </button>
                                        )}

                                        {/* Transfer Button - Only for Drawer or Owner */}
                                        {canControl && (
                                            <button
                                                onClick={() => setShowTransfer(true)}
                                                className="px-3 bg-cyan-700 hover:bg-cyan-600 text-cyan-200 font-bold py-2 rounded-lg text-xl flex items-center justify-center"
                                                title="Передать сделку"
                                            >
                                                ➜
                                            </button>
                                        )}

                                        {/* Dismiss Button - Only for Drawer or Owner */}
                                        {canControl && (
                                            <button
                                                onClick={() => onDismiss()}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider"
                                            >
                                                {isOffer ? 'Закрыть' : 'Отказаться'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {/* Deal Choice (Small/Big) Helper */}
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
                ) : viewMode === 'MLM_ROLL' ? (
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5 flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                        <div className="text-4xl mb-4 animate-bounce">🎲</div>
                        <h3 className="text-sm font-bold text-white mb-2">Сетевой Бизнес</h3>
                        <p className="text-[10px] text-slate-400 mb-6 max-w-[200px]">
                            Бросьте кубик, чтобы определить количество партнеров в вашей структуре.
                        </p>
                        <button
                            onClick={() => {
                                const roll = Math.floor(Math.random() * 6) + 1;
                                setMlmRoll(roll);
                                setStockQty(roll); // Set partners count
                                setTransactionMode('BUY');
                                setTimeout(() => setViewMode('TRANSACTION'), 1000); // Small delay to show result?
                                // For now immediate
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg"
                        >
                            Бросить кубик
                        </button>
                    </div>
                ) : viewMode === 'RESULT' ? (
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5 flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                        <div className="text-4xl mb-4 animate-pulse">
                            {card.type === 'EXPENSE' ? '💸' : '🎉'}
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">
                            {transactionMode === 'SELL' ? 'Продано!' : card.type === 'EXPENSE' ? 'Оплачено!' : 'Успешно!'}
                        </h3>
                        <p className="text-[10px] text-slate-300 mb-6 max-w-[200px] italic">
                            {transactionMode === 'SELL'
                                ? `Вы успешно продали ${card.title}`
                                : card.type === 'EXPENSE'
                                    ? `Вы оплатили: ${card.title}`
                                    : `Вы приобрели: ${card.title}`
                            }
                        </p>
                        <div className="text-[9px] text-slate-500 font-mono mb-4">
                            Закрытие через {formatTime(Math.max(0, timeLeft))}
                        </div>
                        <button
                            onClick={onDismiss}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider"
                        >
                            Закрыть сейчас
                        </button>
                    </div>
                ) : (
                    // Transaction View inside Card
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="bg-slate-900/40 p-1.5 rounded-lg border border-white/5 flex-1 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/5 h-6">
                            <button onClick={(e) => { e.stopPropagation(); setViewMode('DETAILS'); }} className="text-slate-400 hover:text-white text-[9px] uppercase font-bold flex items-center gap-1 h-full px-1 hover:bg-white/5 rounded">← Назад</button>
                            <div className={`text-[9px] font-bold uppercase ${transactionMode === 'BUY' ? 'text-green-400' : 'text-blue-400'}`}>
                                {transactionMode === 'BUY' ? 'Покупка' : 'Продажа'}
                            </div>
                        </div>

                        {/* Logic for Slider/Calc */}
                        <div className="flex flex-col gap-2 mb-2">
                            {/* Hide quantity controls if MLM (Locked by roll) or Expense (Qty 1) */}
                            {(isStock && !isMLM || (!card.offerPrice && !isMLM && maxVal > 1)) && (
                                <>
                                    <div className="flex items-center gap-2 justify-between">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setStockQty(Math.max(1, stockQty - 1)); }}
                                            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                                        >-</button>

                                        <div className="flex flex-col items-center">
                                            <input
                                                type="number"
                                                value={stockQty}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 1 && val <= maxVal) setStockQty(val);
                                                }}
                                                className="w-24 bg-transparent text-center font-black text-xl outline-none text-white font-mono no-spinner"
                                            />
                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Количество</span>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); setStockQty(Math.min(maxVal, stockQty + 1)); }}
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
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setStockQty(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {/* If MLM, show fixed quantity */}
                            {isMLM && (
                                <div className="bg-indigo-900/40 border border-indigo-500/30 p-2 rounded text-center">
                                    <div className="text-[9px] text-indigo-300 uppercase font-bold">Партнеры</div>
                                    <div className="text-xl font-black text-white">{stockQty}</div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 mb-2 space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400 uppercase font-bold">Цена {isMLM ? 'за партнера' : 'за шт.'}</span>
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
                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex justify-between items-center bg-yellow-500/10 p-1.5 rounded border border-yellow-500/20">
                                        <span className="text-[9px] text-yellow-500 font-bold uppercase">Требуется Кредит</span>
                                        <span className="font-mono font-bold text-yellow-400 text-[10px]">${(Math.ceil(loanNeeded / 1000) * 1000).toLocaleString()}</span>
                                    </div>
                                    {/* Loan Limit Warning */
                                        (() => {
                                            const maxLoan = Math.max(0, Math.floor((me?.cashflow || 0) / 100) * 1000);
                                            const loanAmount = Math.ceil(loanNeeded / 1000) * 1000;
                                            const isOverLimit = loanAmount > maxLoan;

                                            // If over limit and NOT Fast Track (Fast Track has no bank loans usually?)
                                            // Actually BankModal says fast track has no loans. 
                                            if (isOverLimit && !me?.isFastTrack) {
                                                return (
                                                    <div className="bg-red-500/10 p-1.5 rounded border border-red-500/20 flex flex-col items-center text-center">
                                                        <span className="text-[8px] text-red-400 font-bold uppercase mb-0.5">Лимит превышен</span>
                                                        <span className="text-[9px] text-red-300">
                                                            Макс. кредит: <span className="font-mono font-bold text-white">${maxLoan.toLocaleString()}</span>
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                </div>
                            )}
                        </div>

                        <button
                            disabled={(() => {
                                // CRITICAL: Only card owner can buy (except when selling)
                                if (transactionMode === 'BUY' && !canControl) return true;

                                // Check loan limit
                                const maxLoan = Math.max(0, Math.floor((me?.cashflow || 0) / 100) * 1000);
                                const loanAmount = Math.ceil(loanNeeded / 1000) * 1000;
                                return transactionMode === 'BUY' && loanNeeded > 0 && loanAmount > maxLoan && !me?.isFastTrack;
                            })()}
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log(`[Transaction] Button Clicked. Mode: ${transactionMode}, Qty: ${stockQty}`);
                                if (transactionMode === 'BUY') {
                                    if (loanNeeded > 0) {
                                        console.log('[Transaction] Loan Needed');
                                        if (card.type === 'EXPENSE') {
                                            alert('У вас недостаточно средств! (Требуется кредит)');
                                        }
                                        const amount = Math.ceil(loanNeeded / 1000) * 1000;
                                        setPendingLoan({ amount, quantity: stockQty });
                                        setShowLoanConfirm(true);
                                    } else {
                                        console.log('[Transaction] Direct Buy');
                                        socket.emit('buy_asset', { roomId, quantity: stockQty, cardId: card.id });
                                        // Switch to RESULT view for feedback
                                        setViewMode('RESULT');
                                        setTimeLeft(10); // 10s countdown
                                        // Delay dismiss
                                        setTimeout(() => {
                                            // onDismiss will be called by user or timer?
                                            // Actually timer is running.
                                            // Result view has "Close" button.
                                        }, 10000);
                                    }
                                } else {
                                    // MARKET SELL or STOCK SELL
                                    console.log('[Transaction] Selling');
                                    if (card.type === 'MARKET') {
                                        socket.emit('sell_asset', { roomId });
                                    } else {
                                        socket.emit('sell_stock', { roomId, quantity: stockQty });
                                    }

                                    // Switch to RESULT view like Buy does - don't auto-dismiss
                                    setViewMode('RESULT');
                                    setTimeLeft(10); // 10s countdown
                                }
                            }}
                            className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:pointer-events-none
                                ${transactionMode === 'SELL' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white' : loanNeeded > 0 ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'}\n                            `}
                        >
                            {transactionMode === 'SELL' ? '💵 Продать' : loanNeeded > 0 ? '💰 Кредит и Купить' : '✅ Подтвердить'}
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
                        setTimeout(() => socket.emit('buy_asset', { roomId, quantity: pendingLoan.quantity, cardId: card.id }), 500);
                    }
                    setShowLoanConfirm(false);
                    setPendingLoan(null);
                }}
                onCancel={() => {
                    setShowLoanConfirm(false);
                    setPendingLoan(null);
                }}
            />
            {/* Transfer Deal Overlay */}
            {showTransfer && (
                <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95">
                    <h3 className="text-white font-bold mb-4">Выберите получателя</h3>
                    <div className="flex flex-col gap-2 w-full max-h-[300px] overflow-y-auto px-1">
                        {players?.filter((p: any) => p.id !== me.id && !p.isBankrupted).map((p: any) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    socket.emit('transfer_deal', { roomId, targetPlayerId: p.id, cardId: card.id });
                                    setShowTransfer(false);
                                    onDismiss();
                                }}
                                className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition active:scale-95 border border-slate-700 hover:border-blue-500/50"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden relative shrink-0">
                                    {(p.avatar || p.photo_url) ? (
                                        <img src={p.avatar || p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white uppercase">{p.name?.[0]}</div>
                                    )}
                                </div>
                                <span className="text-white font-bold text-sm text-left truncate">{p.name}</span>
                            </button>
                        ))}
                        {(!players || players.filter((p: any) => p.id !== me.id).length === 0) && (
                            <div className="text-slate-500 text-xs text-center py-4">Нет доступных игроков</div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowTransfer(false)}
                        className="mt-6 px-6 py-3 bg-slate-800 rounded-xl text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors border border-slate-700"
                    >
                        Отмена
                    </button>
                </div>
            )}
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
    onDismissPreview,
    canShowCard = true
}: ActiveCardZoneProps) => {
    // Safety Guards
    if (!state || !me) return null;

    // Local Dismissal State to prevent closing for everyone
    const [locallyDismissedIds, setLocallyDismissedIds] = useState<string[]>([]);

    // Clear dismissed IDs only when turn changes (not on every state update)
    const currentPlayerIndex = state.currentPlayerIndex;
    useEffect(() => {
        setLocallyDismissedIds([]);
    }, [currentPlayerIndex]);

    const showPhaseContent = canShowCard;


    // 1. OPPORTUNITY CHOICE
    if (showPhaseContent && state.phase === 'OPPORTUNITY_CHOICE' && isMyTurn) {
        return (
            <div className="flex flex-col h-full w-full relative overflow-hidden bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50">
                {/* Header */}
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-slate-800 to-transparent z-0 pointer-events-none"></div>
                <div className="relative z-10 p-4 pb-2 text-center">
                    <div className="text-4xl mb-2 filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse">⚡</div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider drop-shadow-md">Возможность</h2>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Выберите тип сделки</p>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-4 pt-2 flex flex-col gap-3 justify-center relative z-10">

                    {/* SMALL DEAL BUTTON */}
                    <button
                        onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })}
                        className="group relative w-full flex-1 bg-gradient-to-r from-emerald-900/80 to-teal-900/80 hover:from-emerald-800 hover:to-teal-800 border border-emerald-500/30 rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center gap-4 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[url('/images/pattern-money.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform text-white">
                            💵
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-sm font-black text-emerald-300 uppercase tracking-wide group-hover:text-emerald-200 transition-colors">Малая Сделка</div>
                            <div className="text-[10px] text-emerald-100/60 font-medium">Стоимость до <span className="text-white font-bold">$5,000</span></div>
                        </div>
                        <div className="text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all text-xl">➜</div>
                    </button>

                    {/* BIG DEAL BUTTON */}
                    <button
                        onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })}
                        className="group relative w-full flex-1 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/30 rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center gap-4 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[url('/images/pattern-money.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform text-white">
                            🏢
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-sm font-black text-purple-300 uppercase tracking-wide group-hover:text-purple-200 transition-colors">Крупная Сделка</div>
                            <div className="text-[10px] text-purple-100/60 font-medium">Стоимость от <span className="text-white font-bold">$6,000</span></div>
                        </div>
                        <div className="text-purple-500/50 group-hover:text-purple-400 group-hover:translate-x-1 transition-all text-xl">➜</div>
                    </button>

                </div>
            </div>
        );
    }
    // 2. CHARITY
    // 2. CHARITY CHOICE
    if (showPhaseContent && state.phase === 'CHARITY_CHOICE') {
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
                        Пожертвуйте <span className="text-pink-400 font-bold">{me?.isFastTrack ? '$100k' : '10%'}</span> <br />
                        для бонусов на 3 хода.
                    </p>
                    <div className="flex gap-2 w-full mt-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('[Charity] Donate clicked');
                                socket.emit('donate_charity', { roomId });
                            }}
                            className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
                        >
                            Да (${(Math.max(0, (me?.income || 0) * 0.1)).toLocaleString()})
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('[Charity] Skip clicked');
                                socket.emit('skip_charity', { roomId });
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition-transform"
                        >
                            Нет
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // 3. BABY / DOWNSIZED (Simplified for Feed-like? No, these are events)
    if (showPhaseContent && ['BABY_ROLL', 'DOWNSIZED_DECISION'].includes(state.phase)) {
        // ... (Keep existing logic short or rewrite. I'll rewrite to be safe)
        if (state.phase === 'BABY_ROLL') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse text-xs">👶 Ожидание броска...</div>;
            return (
                <div className="flex flex-col h-full w-full relative bg-slate-900 rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>
                    <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-5xl mb-3 animate-bounce">👶</div>
                        <h2 className="text-lg font-bold text-white mb-2">Пополнение в семье!</h2>
                        <p className="text-slate-400 text-xs mb-6">Бросьте кубик чтобы узнать родился ли ребенок</p>
                        <button
                            onClick={() => socket.emit('roll_dice', { roomId })}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl text-sm uppercase shadow-lg active:scale-95 transition-all"
                        >
                            🎲 Бросить кубик
                        </button>
                    </div>
                </div>
            );
        }

        if (state.phase === 'DOWNSIZED_DECISION') {
            // Only show to the player whose turn it is (the downsized player)
            if (!isMyTurn) {
                return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500/80 animate-pulse bg-slate-900/40 rounded-2xl border border-slate-800/50">
                        <div className="text-3xl mb-2 grayscale opacity-50">🤒</div>
                        <div className="text-center">
                            <div className="text-xs font-bold text-slate-300 mb-1">{state.players[state.currentPlayerIndex]?.name}</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest opacity-70">решает о<br />болезни</div>
                        </div>
                    </div>
                );
            }
            return <FiredView roomId={roomId} me={me} isMyTurn={isMyTurn} socket={socket} />;
        }

    }

    // MAIN FEED LOGIC
    // Combine Market Cards + Active Card
    // User Request: "If card is open, new one lies UNDER".
    // This implies we should keep the "Focused" card top.
    // If I have a currentCard (My Turn), it should be top.
    // If I have no CurrentCard, but MarketCards exist, the *first* one I saw should be Top?
    // Let's stick to: Current Card (Turn) -> Top. Market Cards -> Below.

    // Also, visually "Under" means subsequent items in the list (since it's a vertical stack z-index logic).
    // In a flex-col, items appear in order.
    // To make them look "Stacked under", we can use negative margins + scale + z-index?
    // Or just a clean list. "Visible but doesn't overlap old" -> This implies they are peeking out?
    // Let's implement a visual stack effect.

    const marketCards = (state.activeMarketCards || []).map((mc: any) => ({ ...mc, card: mc.card, source: 'MARKET', id: mc.id }));
    const isDuplicate = marketCards.some((mc: any) => mc.card.id === state.currentCard?.id);
    // Prioritize Preview Card (Square Info, Market Preview) over Current Card to allow inspection
    const displayCard = previewCard || state.currentCard;
    const source = previewCard ? 'PREVIEW' : 'CURRENT';

    // Check duplication only if we are showing state.currentCard (don't hide preview if it duplicates current)
    // Actually, if duplicate, we might just show one.

    const currentCard = displayCard && (!isDuplicate || source === 'PREVIEW')
        ? [{
            card: displayCard,
            source: source,
            id: displayCard.id || 'info_card',
            sourcePlayerId: source === 'CURRENT' ? me?.id : undefined // Current card belongs to current player
        }]
        : [];

    // Filter cards - market sell offers should always show to asset owners
    const feedItems = [...currentCard, ...marketCards]
        .filter((item: any) => {
            // Check if already dismissed
            if (locallyDismissedIds.includes(item.id)) return false;

            // ALWAYS show cards that belong to me (e.g. transferred deals)
            if (item.sourcePlayerId === me?.id) return true;

            // If canShowCard is false (not my turn), only show cards that I can sell
            if (!canShowCard) {
                const card = item.card;
                const isMarketSellOffer = item.source === 'MARKET' && card.offerPrice;
                const isStock = !!card.symbol;

                // Only show if it's a market sell offer OR a stock
                if (!isMarketSellOffer && !isStock) return false;

                // Check if I own the asset
                const iOwnAsset = card.symbol
                    ? me?.assets?.some((a: any) => a.symbol === card.symbol)
                    : me?.assets?.some((a: any) => a.title === card.title || a.title === card.targetTitle);

                return iOwnAsset;
            }

            return true;
        })
        .sort((a, b) => {
            // Prioritize MY owned cards (Deal Transfer recipients)
            const amIOwnerA = a.sourcePlayerId === me?.id;
            const amIOwnerB = b.sourcePlayerId === me?.id;
            if (amIOwnerA && !amIOwnerB) return -1;
            if (!amIOwnerA && amIOwnerB) return 1;
            return 0;
        });

    if (feedItems.length === 0) {
        return null; // Clean center
    }

    return (
        <div className="relative w-full h-full perspective-[1000px] flex items-center justify-center">
            {/* Stack Container - Centered */}
            <div className="w-full relative flex items-center justify-center">
                {feedItems.map((item: any, idx: number) => {
                    // Visual Stacking Logic
                    const isTop = idx === 0;
                    const offset = idx * 15; // px down
                    const scale = 1 - (idx * 0.05); // shrink
                    const zIndex = 50 - idx;

                    return (
                        <div
                            key={item.id || idx}
                            className="absolute left-0 w-full transition-all duration-500 ease-out"
                            style={{
                                top: '50%',
                                transform: `translateY(-50%) translateY(${offset}px) scale(${scale})`,
                                zIndex: zIndex,
                                opacity: Math.max(0, 1 - (idx * 0.2)),
                                pointerEvents: isTop ? 'auto' : 'none',
                            }}
                        >
                            {/* Inner Absolute Wrapper for exact positioning if needed, or just allow the card to be the div */}
                            <div className="w-full shadow-2xl rounded-2xl overflow-hidden">
                                <FeedCardItem
                                    cardWrapper={item}
                                    me={me}
                                    roomId={roomId}
                                    isMyTurn={isMyTurn}
                                    players={state.players}
                                    state={state}
                                    canShowCard={canShowCard}
                                    onDismiss={() => {
                                        console.log('Dismissing card:', item.id, item.source);

                                        // 1. Preview Mode (Local)
                                        if (previewCard && !state.currentCard && item.source === 'CURRENT') {
                                            if (onDismissPreview) onDismissPreview();
                                            return;
                                        }

                                        // 2. Active Player Logic (Global - Ends Turn)
                                        if (item.source === 'CURRENT' && isMyTurn) {
                                            socket.emit('end_turn', { roomId });
                                            return;
                                        }

                                        // 3. Market Card Dismissal (Server-side per-player tracking)
                                        if (item.source === 'MARKET') {
                                            socket.emit('dismiss_market_card', { roomId, cardId: item.card.id });
                                            // Also dismiss locally for immediate feedback
                                            setLocallyDismissedIds(prev => [...prev, item.id]);
                                            return;
                                        }

                                        // 4. Passive/Observer Mode (Local Only for current card)
                                        setLocallyDismissedIds(prev => [...prev, item.id]);
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface FiredViewProps {
    roomId: string;
    me: any;
    isMyTurn: boolean;
    socket: any;
}

const FiredView = ({ roomId, me, isMyTurn, socket }: FiredViewProps) => {
    const [step, setStep] = useState<'CHOICE' | 'RESULT'>('CHOICE');
    const [choice, setChoice] = useState<{ type: string, label: string } | null>(null);

    // If not my turn, simply show waiting inline (or return null to show nothing? existing behavior showed modal).
    // Let's keep it inline but visually distinct.
    if (!isMyTurn) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500/80 animate-pulse bg-slate-900/40 rounded-2xl border border-slate-800/50 p-4">
                <div className="text-4xl mb-2 grayscale opacity-50">🤒</div>
                <div className="text-center">
                    <h2 className="text-sm font-bold text-slate-300 mb-1">Заболел</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest opacity-70">Другой игрок принимает решение...</p>
                </div>
            </div>
        );
    }

    const handleChoice = (type: 'PAY_1M' | 'PAY_2M' | 'BANKRUPT') => {
        if (type === 'BANKRUPT') {
            if (confirm('Вы уверены, что хотите объявить банкротство? Это сбросит ваши активы.')) {
                socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' });
            }
            return;
        }

        const is2M = type === 'PAY_2M';
        setChoice({
            type,
            label: is2M
                ? 'Вы оплатили расходы за 2 месяца. Вы продолжаете игру!'
                : 'Вы оплатили расходы за 1 месяц. Вы пропускаете 2 хода.'
        });
        setStep('RESULT');
    };

    const confirmPayment = () => {
        if (choice) {
            socket.emit('decision_downsized', { roomId, choice: choice.type });
        }
    };

    if (step === 'RESULT') {
        return (
            <div className="flex flex-col h-full w-full relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg animate-in fade-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-3">✅</div>
                    <h2 className="text-lg font-bold text-white mb-2">Оплата прошла</h2>
                    <p className="text-slate-300 text-xs mb-6 px-2">{choice?.label}</p>
                    <button onClick={confirmPayment} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform">
                        Продолжить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full relative bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg animate-in fade-in duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🤒</div>
                    <h2 className="text-lg font-bold text-white leading-tight">Заболел!</h2>
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Непредвиденные расходы</p>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl mb-4 text-center border border-white/5 mx-2">
                    <p className="text-slate-300 text-[11px] leading-snug">
                        Вам необходимо оплатить расходы для продолжения игры.
                    </p>
                </div>

                <div className="flex flex-col gap-2 mt-auto w-full">
                    <button
                        onClick={() => handleChoice('PAY_1M')}
                        disabled={(me?.cash || 0) < (me?.expenses || 0)}
                        className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded-xl flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-600 hover:border-slate-500 active:scale-[0.98]"
                    >
                        <div className="text-left">
                            <div className="text-slate-200 text-[10px] font-bold uppercase">1 Месяц</div>
                            <div className="text-slate-400 text-[9px]">Пропуск 2 ходов</div>
                        </div>
                        <span className="text-red-400 font-mono font-bold text-xs group-hover:text-red-300">-${(me?.expenses || 0).toLocaleString()}</span>
                    </button>

                    <button
                        onClick={() => handleChoice('PAY_2M')}
                        disabled={(me?.cash || 0) < (me?.expenses || 0) * 2}
                        className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded-xl flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-600 hover:border-slate-500 active:scale-[0.98]"
                    >
                        <div className="text-left">
                            <div className="text-slate-200 text-[10px] font-bold uppercase">2 Месяца</div>
                            <div className="text-slate-400 text-[9px]">Продолжить игру</div>
                        </div>
                        <span className="text-red-400 font-mono font-bold text-xs group-hover:text-red-300">-${((me?.expenses || 0) * 2).toLocaleString()}</span>
                    </button>

                    <button onClick={() => handleChoice('BANKRUPT')} className="text-red-500/50 text-[9px] mt-2 uppercase hover:text-red-400 transition-colors py-1">
                        Объявить банкротство
                    </button>
                </div>
            </div>
        </div>
    );
};
