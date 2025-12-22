import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

interface ActiveCardZoneProps {
    minimized?: boolean; // For future use if we want to collapse it
    state: any;
    isMyTurn: boolean;
    me: any;
    roomId: string;
    onDismissMarket?: () => void;
}

export const ActiveCardZone = ({ state, isMyTurn, me, roomId, onDismissMarket }: ActiveCardZoneProps) => {
    const [stockQty, setStockQty] = useState(1);

    // Reset stock qty when card changes
    useEffect(() => {
        setStockQty(1);
    }, [state.currentCard?.title]);

    // Handlers
    const handleBuyStock = () => {
        socket.emit('buy_asset', { roomId, quantity: stockQty });
        setStockQty(1);
    };

    const handleSellStock = () => {
        socket.emit('sell_stock', { roomId, quantity: stockQty });
        setStockQty(1);
    };

    const handleBuy = () => {
        if (state.currentCard?.outcomeDescription) {
            alert(state.currentCard.outcomeDescription);
        }
        socket.emit('buy_asset', { roomId });
    };

    const handleEndTurn = () => socket.emit('end_turn', { roomId });
    const handleLoan = (amount: number) => socket.emit('take_loan', { roomId, amount });
    const handleShowBank = () => { /* Logic handled by parent usually, but maybe emit event or context? For now simple log or ignore bank in card zone */ };

    // --- RENDERERS ---

    // 1. OPPORTUNITY CHOICE
    if (state.phase === 'OPPORTUNITY_CHOICE') {
        if (!isMyTurn) {
            return (
                <div className="bg-[#1e293b] w-full p-4 rounded-3xl border border-slate-700 shadow-xl text-center">
                    <h2 className="text-xl font-bold text-white mb-2">⚡ Возможность</h2>
                    <p className="text-slate-400 text-sm">Игрок выбирает сделку...</p>
                </div>
            );
        }
        return (
            <div className="bg-[#1e293b] w-full p-4 rounded-3xl border border-slate-700 shadow-xl relative text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-t-3xl"></div>
                <div className="text-5xl mb-4 mt-2">⚡</div>
                <h2 className="text-xl font-bold text-white mb-2">Возможность</h2>
                <p className="text-slate-400 text-sm mb-6">Выберите тип сделки:</p>

                <div className="flex gap-2 w-full">
                    <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })} className="flex-1 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-4 rounded-2xl text-sm shadow-xl shadow-green-900/40 relative overflow-hidden group transform hover:-translate-y-1 transition-all">
                        <div className="relative z-10">Малая</div>
                        <div className="text-[10px] opacity-70 relative z-10">До $5,000</div>
                        {(state.deckCounts?.small) && (
                            <div className="text-[10px] bg-black/20 text-white/90 font-mono mt-1 mx-auto w-fit px-2 py-0.5 rounded relative z-10">
                                {state.deckCounts.small.remaining}/{state.deckCounts.small.total}
                            </div>
                        )}
                    </button>

                    <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="flex-1 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl text-sm shadow-xl shadow-purple-900/40 relative overflow-hidden group transform hover:-translate-y-1 transition-all">
                        <div className="relative z-10">Крупная</div>
                        <div className="text-[10px] opacity-70 relative z-10">$6,000+</div>
                        {(state.deckCounts?.big) && (
                            <div className="text-[10px] bg-black/20 text-white/90 font-mono mt-1 mx-auto w-fit px-2 py-0.5 rounded relative z-10">
                                {state.deckCounts.big.remaining}/{state.deckCounts.big.total}
                            </div>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // 2. CHARITY CHOICE
    if (state.phase === 'CHARITY_CHOICE' && isMyTurn) {
        return (
            <div className="bg-[#1e293b] w-full p-4 rounded-3xl border border-slate-700 shadow-xl relative text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-t-3xl"></div>
                <div className="text-5xl mb-4 mt-2">❤️</div>
                <h2 className="text-xl font-bold text-white mb-2">Благотворительность</h2>
                <p className="text-slate-400 text-sm mb-6">
                    Пожертвуйте {me.isFastTrack ? '$100,000' : '10% от дохода'} для выбора кубиков (1-2) на 3 хода.
                </p>
                <div className="flex gap-2 w-full">
                    <button onClick={() => socket.emit('donate_charity', { roomId })} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-pink-900/20">
                        Пожертвовать
                    </button>
                    <button onClick={() => socket.emit('skip_charity', { roomId })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm">
                        Отказаться
                    </button>
                </div>
            </div>
        );
    }

    // 3. BABY ROLL
    if (state.phase === 'BABY_ROLL') {
        if (!isMyTurn) return <div className="text-center text-slate-500 animate-pulse">👶 Ожидание броска...</div>;
        return (
            <div className="bg-[#1e293b] w-full p-6 rounded-3xl border border-pink-500/30 text-center shadow-xl">
                <div className="text-5xl mb-4 animate-bounce">👶</div>
                <h2 className="text-xl font-bold text-white mb-4">Рождение ребенка?</h2>
                <button
                    onClick={() => socket.emit('roll_dice', { roomId })}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold py-4 rounded-2xl text-lg shadow-lg"
                >
                    Бросить кубик
                </button>
            </div>
        );
    }

    // 4. DOWNSIZED DECISION
    if (state.phase === 'DOWNSIZED_DECISION') {
        if (!isMyTurn) return <div className="text-center text-slate-500">📉 Игрок принимает решение...</div>;
        return (
            <div className="bg-[#1e293b] w-full p-4 rounded-3xl border border-red-500/30 shadow-xl relative text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-t-3xl"></div>
                <div className="text-4xl mb-4 mt-2">📉</div>
                <h2 className="text-lg font-bold text-white mb-2">Увольнение!</h2>
                <div className="flex flex-col gap-2 w-full">
                    {/* Pay 1M */}
                    <button
                        onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_1M' })}
                        disabled={me.cash < me.expenses * 1}
                        className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex justify-between px-4 border border-slate-700"
                    >
                        <span className="text-left">Оплатить 1 мес<br /><span className="text-[9px] text-slate-400">Пропуск 2 ходов</span></span>
                        <span className="text-red-400">-${(me.expenses).toLocaleString()}</span>
                    </button>
                    {/* Pay 2M */}
                    <button
                        onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_2M' })}
                        disabled={me.cash < me.expenses * 2}
                        className="w-full bg-blue-900/50 hover:bg-blue-800/50 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex justify-between px-4 border border-blue-500/30"
                    >
                        <span className="text-left">Оплатить 2 мес<br /><span className="text-[9px] text-slate-400">Играть сразу</span></span>
                        <span className="text-red-400">-${(me.expenses * 2).toLocaleString()}</span>
                    </button>
                    {/* Bankrupt */}
                    <button
                        onClick={() => { if (confirm('Банкротство?')) socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' }); }}
                        className="text-red-500/70 hover:text-red-400 text-[10px] mt-2 uppercase font-bold"
                    >
                        Объявить банкротство
                    </button>
                </div>
            </div>
        );
    }

    // 5. CURRENT CARD (Standard)
    if (state.currentCard) {
        return (
            <div className="bg-[#1e293b] w-full max-w-sm p-4 rounded-3xl border border-slate-700 shadow-2xl relative animate-in fade-in zoom-in duration-300 mx-auto">
                {/* Decorative Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-3xl"></div>

                {/* Header Icon */}
                <div className="text-4xl mb-2 text-center mt-2">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>

                <h2 className="text-lg font-bold text-white mb-1 text-center leading-tight">{state.currentCard.title}</h2>
                <p className="text-slate-400 text-xs mb-4 text-center leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">{state.currentCard.description}</p>

                {/* Cost / Info Block */}
                {state.currentCard.type === 'MARKET' ? (
                    <div className="bg-slate-900/50 p-2 rounded-xl mb-4 border border-slate-800 text-center">
                        <div className="text-[9px] text-slate-500 uppercase">Предложение</div>
                        <div className="text-xl font-mono text-green-400 font-bold">${(state.currentCard.offerPrice || 0).toLocaleString()}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">за: {state.currentCard.targetTitle}</div>
                    </div>
                ) : state.currentCard.cost && (
                    <div className="bg-slate-900/50 p-2 rounded-xl mb-4 border border-slate-800 text-center">
                        <div className="flex justify-between items-center px-2">
                            <div className="text-left">
                                <div className="text-[9px] text-slate-500 uppercase">Цена</div>
                                <div className="text-lg font-mono text-white font-bold">${state.currentCard.cost.toLocaleString()}</div>
                            </div>
                            {state.currentCard.type !== 'EXPENSE' && state.currentCard.type !== 'DOODAD' && (
                                <div className="text-right">
                                    <div className="text-[9px] text-slate-500 uppercase">Доход</div>
                                    <div className="text-lg font-mono text-green-400 font-bold">+${state.currentCard.cashflow || 0}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex flex-col gap-2 w-full">
                    {/* MARKET Logic */}
                    {state.currentCard.type === 'MARKET' ? (
                        <div className="flex gap-2 w-full">
                            {me.assets.some((a: any) => a.title === state.currentCard?.targetTitle) ? (
                                <button onClick={() => socket.emit('sell_asset', { roomId })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg">
                                    ПРОДАТЬ
                                </button>
                            ) : (
                                <div className="flex-1 flex items-center justify-center bg-slate-800 text-slate-500 text-xs font-bold py-3 rounded-xl border border-slate-700">
                                    Нет актива
                                </div>
                            )}
                            {isMyTurn && (
                                <button onClick={onDismissMarket} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-xs">
                                    ЗАКРЫТЬ
                                </button>
                            )}
                        </div>
                    ) : (
                        // Standard Logic
                        isMyTurn ? (
                            me.cash >= ((state.currentCard.downPayment ?? state.currentCard.cost) || 0) * stockQty ? (
                                <div className="flex gap-2 w-full">
                                    {state.currentCard.symbol ? (
                                        // STOCK BUY
                                        <div className="flex flex-col gap-2 w-full">
                                            {/* Qty Selector */}
                                            <div className="flex items-center bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                                                <button onClick={() => setStockQty(Math.max(1, stockQty - 1))} className="px-3 py-1 text-slate-400 hover:text-white">-</button>
                                                <input
                                                    type="number"
                                                    value={stockQty}
                                                    onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="flex-1 bg-transparent text-center text-white font-mono font-bold w-12"
                                                />
                                                <button onClick={() => setStockQty(stockQty + 1)} className="px-3 py-1 text-slate-400 hover:text-white">+</button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleBuyStock} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs">
                                                    КУПИТЬ (${((state.currentCard.cost || 0) * stockQty).toLocaleString()})
                                                </button>
                                                {me.assets.some((a: any) => a.symbol === state.currentCard.symbol && a.quantity >= stockQty) && (
                                                    <button onClick={handleSellStock} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl text-xs">
                                                        ПРОДАТЬ
                                                    </button>
                                                )}
                                            </div>
                                            <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs mt-1">
                                                ПАС
                                            </button>
                                        </div>
                                    ) : (
                                        // NORMAL BUY
                                        <>
                                            <button onClick={handleBuy} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg">
                                                {state.currentCard.mandatory ? 'ОПЛАТИТЬ' : 'КУПИТЬ'}
                                            </button>
                                            {!state.currentCard.mandatory && (
                                                <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-xs">
                                                    ПАС
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                // INSUFFICIENT FUNDS
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="bg-red-900/30 border border-red-500/20 p-2 rounded-lg text-center">
                                        <div className="text-red-400 font-bold text-[10px] uppercase">Не хватает</div>
                                        <div className="text-white font-mono text-xs">
                                            -${(((state.currentCard.downPayment ?? state.currentCard.cost) || 0) * stockQty - me.cash).toLocaleString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const deficit = ((state.currentCard.downPayment ?? state.currentCard.cost) || 0) * stockQty - me.cash;
                                            const loanAmount = Math.ceil(deficit / 1000) * 1000;
                                            handleLoan(loanAmount);
                                        }}
                                        disabled={(me.loanDebt || 0) + (((state.currentCard.downPayment ?? state.currentCard.cost) || 0) * stockQty - me.cash) > 38000}
                                        className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl shadow-lg"
                                    >
                                        🏦 Взять кредит
                                    </button>
                                    {!state.currentCard.mandatory && (
                                        <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs mt-1">
                                            Отказаться
                                        </button>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="w-full text-center text-slate-500 text-sm animate-pulse bg-slate-900/50 p-3 rounded-xl border border-slate-800">⏳ Ожидание игрока...</div>
                        )
                    )}
                </div>
            </div>
        );
    }

    return null;
};
