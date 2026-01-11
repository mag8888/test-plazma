
import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { getGameServiceUrl } from '../../lib/config';
import { ConfirmModal } from './ConfirmModal';
import { CardHeader } from './CardHeader';

// Need to duplicate TutorialTip here or import it?
// Since FeedCardItem already uses it conditionally in steps...
// For now, I'll inline the simple component or better, export it from Board or separate file. 
// TutorialTip is also used in Board.tsx. It should be its own file.
// I will check if TutorialTip.tsx exists. Yes it does. (Step 3333).
import { TutorialTip } from './TutorialTip';
import { CryptoChart } from './CryptoChart';

export const FeedCardItem = ({
    cardWrapper,
    me,
    roomId,
    isMyTurn,
    players,
    onDismiss,
    state,
    canShowCard,
    isTutorial,
    tutorialStep
}: {
    cardWrapper: any,
    me: any,
    roomId: string,
    isMyTurn: boolean,
    players?: any[],
    onDismiss: () => void,
    state: any,
    canShowCard: boolean,
    isTutorial?: boolean,
    tutorialStep?: number
}) => {
    // Guard Clause: MOVED TO BOTTOM or rely on ActiveCardZone protection. 
    // ActiveCardZone already checks (!state || !me) return null; so state is guaranteed here.

    const card = cardWrapper.card || cardWrapper; // Handle wrapper or direct card
    const source = cardWrapper.source || 'CURRENT'; // 'MARKET' or 'CURRENT'
    const [locallyDismissedIds, setLocallyDismissedIds] = useState<string[]>([]); // Added this state

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
    const isMLM = card.subtype === 'MLM_PLACEMENT';

    // Auto-start in MLM_ROLL if needed and not yet done REMOVED


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
    // - MARKET OFFER (offerPrice exists): Anyone can buy (control)
    // - PRIVATE/TRANSFERRED (no offerPrice): Only owner (sourcePlayerId)
    // - CURRENT (New Draw): Only turn player
    const isMarketOffer = source === 'MARKET' && card.offerPrice > 0;
    const canControl = source === 'MARKET'
        ? (isMarketOffer ? true : cardWrapper.sourcePlayerId === me?.id)
        : isMyTurn;

    // Auto-switch to TRANSACTION if owner
    useEffect(() => {
        // If Bystander owns asset (stock) and can't buy, default to SELL
        if (!canControl && hasAsset && isStock) {
            setTransactionMode('SELL');
        }
    }, [isOwner, viewMode, isStock, card.type, canControl, hasAsset]);

    // --- CALCULATIONS FOR TRANSACTION MODE (Must be top level) ---
    const price = card.cost || card.price || 0;

    // Credit Logic
    const maxNewLoan = Math.max(0, Math.floor((me?.cashflow || 0) / 100) * 1000);
    const availableLoan = Math.max(0, maxNewLoan - (me?.loanDebt || 0));
    const maxBuyCash = Math.floor((me?.cash || 0) / (price || 1));
    const maxBuyCredit = Math.floor(availableLoan / (price || 1));

    const maxBuyCalculated = Math.max(1, maxBuyCash + maxBuyCredit);
    const maxBuyWithLimit = card.maxQuantity ? Math.min(maxBuyCalculated, card.maxQuantity) : maxBuyCalculated;

    const maxVal = transactionMode === 'BUY'
        ? (isStock ? maxBuyWithLimit : 1)
        : ownedQty;

    const total = price * stockQty;
    const loanNeeded = Math.max(0, total - (me?.cash || 0));

    // AUTO-PAY EXPENSES (User Request: Auto-open, deduct, show 10s, close)
    useEffect(() => {
        if (card.type === 'EXPENSE' && viewMode === 'DETAILS' && isMyTurn && !locallyDismissedIds.includes(card.id)) {
            const timer = setTimeout(() => {
                if (loanNeeded > 0) {
                    // If loan is needed, we might still need manual confirmation? 
                    // Or auto-take loan if manageable? 
                    // User said "spiryvaye summu" (deducts amount). 
                    // Let's try to auto-pay if possible. If loan needed, maybe show confirm?
                    // For now, let's trigger the "Buy/Pay" button click logic.
                    console.log('[AutoPay] Triggering Expense Payment');
                    handleAutoPay();
                } else {
                    handleAutoPay();
                }
            }, 1500); // 1.5s delay to let user see "Expense" title
            return () => clearTimeout(timer);
        }
    }, [card.type, viewMode, isMyTurn, loanNeeded]);

    const handleAutoPay = () => {
        if (loanNeeded > 0) {
            const amount = Math.ceil(loanNeeded / 1000) * 1000;
            setPendingLoan({ amount, quantity: 1 });
            setShowLoanConfirm(true); // Still prompt for loan if needed
        } else {
            socket.emit('buy_asset', { roomId, quantity: 1, cardId: card.id }); // Expenses use buy_asset logic currently? Or just 'pay_expense'? 
            // Logic in button (line 660) uses 'buy_asset'.
            setViewMode('RESULT');
            setTimeLeft(10); // Show for 10s
            setTimeout(() => {
                onDismiss(); // Auto-close
                // socket.emit('end_turn', { roomId }); // End turn if not auto-handled by backend?
                // Usually dismissing card allows end turn.
            }, 10000);
        }
    };
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


    return (
        <div className="relative w-full shrink-0 rounded-2xl overflow-hidden bg-[#1e293b] border border-slate-700/30 shadow-lg flex flex-col group transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 min-h-[280px] max-h-[85vh]">
            {/* Color Bar */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.cashflow > 0 ? 'from-green-500 to-emerald-500' :
                card.cost > 0 && !card.symbol ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-500'
                }`}></div>

            <div className="p-2 sm:p-4 flex flex-col gap-2 flex-1 overflow-x-hidden">
                <CardHeader
                    card={card}
                    cardNumber={cardNumber}
                    isStock={isStock}
                    ownedQty={ownedQty}
                    timeLeft={timeLeft}
                    formatTime={formatTime}
                    onDismiss={onDismiss}
                />

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
                                {/* Crypto Chart Integration */}
                                {(() => {
                                    const titleUpper = (card.title || '').toUpperCase();
                                    const symbolUpper = (card.symbol || '').toUpperCase();
                                    const isCrypto = symbolUpper === 'BTC' || symbolUpper === 'TON' || titleUpper.includes('BITCOIN') || titleUpper.includes('TON TOKEN');

                                    if (isCrypto) {
                                        const chartSymbol = symbolUpper === 'BTC' || titleUpper.includes('BITCOIN') ? 'BTC' : 'TON';
                                        return <CryptoChart symbol={chartSymbol} currentPrice={card.cost || card.price || 10} />;
                                    }
                                    return null;
                                })()}

                                <p className="text-[10px] text-slate-300 leading-relaxed">
                                    {card.description}
                                </p>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {card.cashflow !== undefined && card.cashflow !== 0 && (
                                        <div className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/30 border border-green-500/30 text-green-300 font-mono flex items-center gap-1">
                                            <span>Поток:</span>
                                            {card.isBuyout ? (
                                                <>
                                                    <span className="line-through opacity-50 text-slate-400">${card.cashflow}</span>
                                                    <span className="font-bold text-emerald-400 animate-pulse">+${Math.floor(card.cashflow * 1.5)}</span>
                                                </>
                                            ) : (
                                                <b>{card.cashflow > 0 ? '+' : ''}${card.cashflow}</b>
                                            )}
                                        </div>
                                    )}
                                    {card.roi && (
                                        <div className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-500/30 text-blue-300 font-mono">
                                            ROI: {card.roi}%
                                        </div>
                                    )}

                                    {/* Market Card: Show asset ownership status ONLY if owned */}
                                    {card.type === 'MARKET' && ownedQty > 0 && (
                                        <div className="text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 sm:col-span-2 bg-green-900/30 border border-green-500/30 text-green-300">
                                            <span>✓</span> <b>У вас есть ({ownedQty} шт)</b>
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {(isMyTurn || isOwner || canControl || (isStock && ownedQty > 0)) && (
                            <div className="grid grid-cols-1 gap-2 mt-1 w-full">
                                {/* Asset Ownership Warning */}
                                {card.offerPrice && isOffer && !hasAsset && (
                                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2 mb-2 animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">⚠️</span>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-red-300 font-bold uppercase">У вас нет этого актива</span>
                                                <span className="text-[9px] text-red-400 leading-tight">Сначала нужно купить актив, чтобы его продать.</span>
                                            </div>
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
                                ) : (card.type === 'EXPENSE' || card.type === 'LOSS') ? (<>
                                    <button
                                        onClick={onDismiss}
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl text-lg uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                    >
                                        OK
                                    </button>
                                    {/* Expense Strategy Hint */}
                                    {card.type === 'EXPENSE' && (
                                        <div className="mt-2 bg-pink-900/20 border border-pink-500/20 p-2 rounded-lg flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2">
                                            <span className="text-pink-400 text-lg">💡</span>
                                            <p className="text-[10px] text-pink-200/80 leading-relaxed">
                                                <strong className="text-pink-200">Совет:</strong> Обратите внимание, куда уходят деньги. Обязательные траты и импульсные покупки часто мешают создать капитал.
                                            </p>
                                        </div>
                                    )}
                                </>) : card.type === 'MARKET' ? (
                                    <>
                                        {/* Market Card Actions */}
                                        {/* If it's a Stock, you can also BUY at this price - ONLY if you control the card */}
                                        {isStock && canControl && (
                                            <button
                                                onClick={() => {
                                                    setTransactionMode('BUY');
                                                    const price = card.offerPrice || card.cost || card.price || 0;
                                                    // const maxBuy = price > 0 ? Math.floor(me.cash / price) : 1; // Unused
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
                                                {isTutorial && tutorialStep === 2 && <TutorialTip text="2. Продайте акции!" position="bottom-full mb-2" arrow="bottom-[-6px] border-t-emerald-500 border-b-0" />}
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
                                        {/* Buy Button - Only for Drawer OR Transferred Owner */}
                                        {canControl && (
                                            state.phase === 'MLM_PLACEMENT' ? (
                                                <div className="w-full bg-indigo-900/40 border border-indigo-500/30 p-3 rounded-lg flex flex-col items-center justify-center text-center animate-pulse">
                                                    <span className="text-xl mb-1">👥</span>
                                                    <span className="text-[10px] text-indigo-200 font-bold uppercase">Сетевой этап</span>
                                                    <span className="text-[9px] text-indigo-300">Пригласите партнеров в окне выше</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setTransactionMode('BUY');
                                                        const price = card.cost || card.price || 0;
                                                        const maxBuy = price > 0 ? Math.floor(me.cash / price) : 1;
                                                        setStockQty(isStock && maxBuy > 0 ? maxBuy : 1);
                                                        setViewMode('TRANSACTION');
                                                    }}
                                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98]"
                                                >
                                                    {'Купить'}
                                                    {isTutorial && tutorialStep === 1 && <TutorialTip text="1. Купите акции!" position="bottom-full mb-2" arrow="bottom-[-6px] border-t-emerald-500 border-b-0" />}
                                                </button>
                                            )
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
                        {isMyTurn && card.type === 'DEAL' && !card.id && (<>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <button onClick={() => { socket.emit('draw_deal', { roomId, type: 'SMALL' }); onDismiss(); }} disabled={me.cash < 500} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-[10px] uppercase">
                                    Малая (до $5k)
                                    {isTutorial && tutorialStep === 1 && <TutorialTip text="Выберите малую сделку" position="bottom-full mb-2" arrow="bottom-[-6px] border-t-emerald-500 border-b-0" />}
                                </button>
                                <button onClick={() => { socket.emit('draw_deal', { roomId, type: 'BIG' }); onDismiss(); }} disabled={me.cash < 2000} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-[10px] uppercase">
                                    Крупная (от $6k)
                                </button>
                            </div>
                            {/* Strategy Hint */}
                            <div className="mt-3 bg-blue-900/20 border border-blue-500/20 p-2 rounded-lg flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2">
                                <span className="text-blue-400 text-lg">💡</span>
                                <p className="text-[10px] text-blue-200/80 leading-relaxed">
                                    <strong className="text-blue-200">Совет:</strong> В начале игры лучше выбирать <span className="text-green-400 font-bold">Малые сделки</span> ($500-$5000), чтобы накопить стартовый капитал с минимальным риском.
                                </p>
                            </div>
                        </>)}
                    </>

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
                                ? `Вы успешно продали ${card.title || card.symbol || 'актив'}`
                                : card.type === 'EXPENSE'
                                    ? `Вы оплатили: ${card.title || 'расход'}`
                                    : `Вы приобрели: ${card.title || card.symbol || 'актив'}`
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

                        {/* SALE DETAILS (User Feedback) */}
                        {transactionMode === 'SELL' && ownedStock && (
                            <div className="bg-blue-900/30 border border-blue-500/30 p-2 rounded mb-2">
                                <div className="text-[9px] text-blue-300 uppercase font-bold mb-1">Продажа актива:</div>
                                <div className="font-bold text-white text-xs">{ownedStock.title}</div>
                                {ownedStock.cost > 0 && (
                                    <div className="text-[9px] text-slate-400 mt-1">
                                        Куплено за: <span className="text-slate-200 font-mono">${ownedStock.cost.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Logic for Slider/Calc */}
                        <div className="flex flex-col gap-2 mb-2">
                            {/* Hide quantity controls if MLM (Locked by roll) or Expense (Qty 1) */}
                            {(isStock && !isMLM || (!card.offerPrice && !isMLM && maxVal > 1)) && (
                                <>
                                    {/* Transaction Mode Toggle (Only if owning stock) */}
                                    {hasAsset && (
                                        <div className="flex bg-slate-800/80 p-1 rounded-lg mb-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setTransactionMode('BUY'); }}
                                                disabled={!canControl} // Bystander cannot switch to BUY
                                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all
                                                    ${transactionMode === 'BUY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}
                                                    ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                Купить
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setTransactionMode('SELL'); }}
                                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all
                                                    ${transactionMode === 'SELL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}
                                                `}
                                            >
                                                Продать
                                            </button>
                                        </div>
                                    )}

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
                            {/* Passive Income Display */}
                            {card.cashflow !== undefined && card.cashflow !== 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400 uppercase font-bold">Пассивный доход</span>
                                    <span className="text-emerald-400 font-mono font-bold">
                                        +${((card.cashflow) * (isStock || isMLM ? stockQty : 1)).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {(card.cashflow !== undefined && card.cashflow !== 0) && <div className="h-px bg-slate-700/50"></div>}
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

                                const maxLoan = Math.max(0, Math.floor((me?.cashflow || 0) / 100) * 1000);
                                const loanAmount = Math.ceil(loanNeeded / 1000) * 1000;

                                // Validation: Disable if unaffordable loan AND NOT Mandatory
                                // Mandatory cards must allow clicking to trigger "Force Pay / Bankrupt" backend logic
                                const isMandatory = card.type === 'EXPENSE' || card.mandatory;

                                return transactionMode === 'BUY' && loanNeeded > 0 && loanAmount > maxLoan && !me?.isFastTrack && !isMandatory;
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
            {
                showTransfer && (
                    <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95">
                        <h3 className="text-white font-bold mb-4">Выберите получателя</h3>
                        <div className="flex flex-col gap-2 w-full max-h-[300px] overflow-y-auto px-1">
                            {players?.filter((p: any) => p.id !== me.id && !p.isBankrupted).map((p: any) => (
                                <button
                                    key={p.id}
                                    onClick={async () => {
                                        try {
                                            // Socket.IO Emit
                                            console.log(`[Transfer] Emitting transfer_deal to ${p.id} for card ${card.id}`);
                                            socket.emit('transfer_deal', {
                                                roomId,
                                                targetPlayerId: p.id,
                                                cardId: card.id
                                            });

                                            // Close Modal & Dismiss Card locally
                                            setShowTransfer(false);
                                            onDismiss();
                                        } catch (e) {
                                            console.error('Transfer error:', e);
                                        }
                                    }}
                                    className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center justify-between border border-slate-700 hover:border-cyan-500/50 transition-all group"
                                >
                                    <span className="font-bold text-slate-200 group-hover:text-white">{p.name}</span>
                                    <span className="text-xs text-slate-500 group-hover:text-cyan-400 font-mono">
                                        ${p.cash?.toLocaleString()}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowTransfer(false)}
                            className="mt-4 text-slate-500 hover:text-white text-xs underline"
                        >
                            Отмена
                        </button>
                    </div>
                )
            }
        </div>
    );
};
