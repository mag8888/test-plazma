import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

interface ActiveCardZoneProps {
    minimized?: boolean; // For future use if we want to collapse it
    state: any;
    isMyTurn: boolean;
    me: any;
    roomId: string;
    onDismissMarket?: () => void;
    onMarketCardClick?: (card: any) => void;
}

export const ActiveCardZone = ({ state, isMyTurn, me, roomId, onDismissMarket, onMarketCardClick }: ActiveCardZoneProps) => {
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

    // RENDER HELPERS
    const renderContent = () => {
        // 1. OPPORTUNITY CHOICE
        if (state.phase === 'OPPORTUNITY_CHOICE') {
            if (!isMyTurn) {
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-4xl mb-2">⚡</div>
                        <h2 className="text-xl font-bold text-white mb-2">Возможность</h2>
                        <p className="text-slate-400 text-sm">Игрок выбирает сделку...</p>
                    </div>
                );
            }
            return (
                <div className="flex flex-col items-center justify-center h-full w-full relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-t-3xl"></div>
                    <div className="text-5xl mb-4 text-yellow-500">⚡</div>
                    <h2 className="text-2xl font-bold text-white mb-6">Возможность</h2>

                    <div className="flex gap-4 w-full px-4">
                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })} className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-bold py-6 rounded-2xl text-lg shadow-xl relative overflow-hidden group border border-emerald-500/30">
                            <div className="relative z-10">Малая</div>
                            <div className="text-xs opacity-70 relative z-10 mt-1">До $5,000</div>
                            {(state.deckCounts?.small) && (
                                <div className="text-[10px] bg-black/30 text-white/90 font-mono mt-2 mx-auto w-fit px-2 py-0.5 rounded relative z-10">
                                    {state.deckCounts.small.remaining} шт
                                </div>
                            )}
                        </button>

                        <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="flex-1 bg-gradient-to-br from-purple-600 to-indigo-800 hover:from-purple-500 hover:to-indigo-700 text-white font-bold py-6 rounded-2xl text-lg shadow-xl relative overflow-hidden group border border-purple-500/30">
                            <div className="relative z-10">Крупная</div>
                            <div className="text-xs opacity-70 relative z-10 mt-1">$6,000+</div>
                            {(state.deckCounts?.big) && (
                                <div className="text-[10px] bg-black/30 text-white/90 font-mono mt-2 mx-auto w-fit px-2 py-0.5 rounded relative z-10">
                                    {state.deckCounts.big.remaining} шт
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
                <div className="flex flex-col items-center justify-center h-full w-full relative px-4">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-t-3xl"></div>
                    <div className="text-6xl mb-4">❤️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Благотворительность</h2>
                    <p className="text-slate-300 text-center mb-8 max-w-xs leading-relaxed">
                        Пожертвуйте <span className="text-pink-400 font-bold">{me.isFastTrack ? '$100,000' : '10% от дохода'}</span>,<br />чтобы использовать 1-2 кубика.
                    </p>
                    <div className="flex gap-3 w-full max-w-xs">
                        <button onClick={() => socket.emit('donate_charity', { roomId })} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-pink-900/40">
                            Пожертвовать (${(Math.max(0, me.income * 0.1)).toLocaleString()})
                        </button>
                        <button onClick={() => socket.emit('skip_charity', { roomId })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl text-sm">
                            Отказаться
                        </button>
                    </div>
                </div>
            );
        }

        // 3. BABY ROLL
        if (state.phase === 'BABY_ROLL') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse text-lg">👶 Ожидание броска...</div>;
            return (
                <div className="flex flex-col items-center justify-center h-full w-full px-8">
                    <div className="text-6xl mb-6 animate-bounce">👶</div>
                    <h2 className="text-2xl font-bold text-white mb-8">Пополнение в семье!</h2>
                    <button
                        onClick={() => socket.emit('roll_dice', { roomId })}
                        className="w-full max-w-xs bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold py-5 rounded-2xl text-xl shadow-xl shadow-pink-900/30"
                    >
                        Бросить кубик
                    </button>
                </div>
            );
        }

        // 4. DOWNSIZED DECISION
        if (state.phase === 'DOWNSIZED_DECISION') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500">📉 Игрок принимает решение...</div>;
            return (
                <div className="flex flex-col items-center justify-center h-full w-full relative px-2">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-t-3xl"></div>
                    <h2 className="text-2xl font-bold text-white mb-6 mt-2 flex items-center gap-2">📉 Увольнение!</h2>

                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        {/* Pay 1M */}
                        <button
                            onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_1M' })}
                            disabled={me.cash < me.expenses * 1}
                            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-sm flex justify-between px-4 border border-slate-700 items-center group"
                        >
                            <span className="text-left flex flex-col items-start">
                                <span>Оплатить 1 мес + Пропуск</span>
                                <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Пропуск 2 ходов</span>
                            </span>
                            <span className="text-red-400 font-mono text-base">-${(me.expenses).toLocaleString()}</span>
                        </button>
                        {/* Pay 2M */}
                        <button
                            onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_2M' })}
                            disabled={me.cash < me.expenses * 2}
                            className="w-full bg-blue-900/40 hover:bg-blue-800/40 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-sm flex justify-between px-4 border border-blue-500/30 items-center group"
                        >
                            <span className="text-left flex flex-col items-start">
                                <span>Оплатить 2 мес + Играть</span>
                                <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Играть сразу</span>
                            </span>
                            <span className="text-red-400 font-mono text-base">-${(me.expenses * 2).toLocaleString()}</span>
                        </button>
                        {/* Bankrupt */}
                        <button
                            onClick={() => { if (confirm('Банкротство?')) socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' }); }}
                            className="text-red-500/70 hover:text-red-400 text-xs mt-2 uppercase font-bold tracking-widest"
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
                <div className="flex flex-col h-full w-full relative">
                    {/* Decorative Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-3xl"></div>

                    <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
                        {/* Header Icon */}
                        <div className="text-5xl mb-2 text-center mt-2">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</div>

                        <h2 className="text-xl font-bold text-white mb-2 text-center leading-tight px-2">{state.currentCard.title}</h2>
                        <p className="text-slate-400 text-sm mb-4 text-center leading-relaxed px-2 flex-grow">{state.currentCard.description}</p>

                        {/* Cost / Info Block */}
                        {state.currentCard.type === 'MARKET' ? (
                            <div className="bg-slate-900/80 p-3 rounded-xl mb-4 border border-slate-700 text-center shrink-0">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Предложение</div>
                                <div className="text-2xl font-mono text-green-400 font-bold my-1">${(state.currentCard.offerPrice || 0).toLocaleString()}</div>
                                <div className="text-slate-400 text-[10px]">за: {state.currentCard.targetTitle}</div>
                            </div>
                        ) : state.currentCard.cost && (
                            <div className="bg-slate-900/80 p-3 rounded-xl mb-4 border border-slate-700 text-center shrink-0">
                                <div className="flex justify-between items-center px-4">
                                    <div className="text-left">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Цена</div>
                                        <div className="text-xl font-mono text-white font-bold">${state.currentCard.cost.toLocaleString()}</div>
                                    </div>
                                    {state.currentCard.type !== 'EXPENSE' && state.currentCard.type !== 'DOODAD' && (
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Доход</div>
                                            <div className="text-xl font-mono text-green-400 font-bold">+${state.currentCard.cashflow || 0}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS (Pinned to bottom) */}
                    <div className="p-4 pt-0 shrink-0 bg-[#1e293b]"> {/* Background to cover scroll */}
                        <div className="flex flex-col gap-2 w-full">
                            {/* MARKET Logic */}
                            {state.currentCard.type === 'MARKET' ? (
                                <div className="flex gap-2 w-full">
                                    {me.assets.some((a: any) => a.title === state.currentCard?.targetTitle) ? (
                                        <button onClick={() => socket.emit('sell_asset', { roomId })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-green-900/30">
                                            ПРОДАТЬ
                                        </button>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center bg-slate-800 text-slate-500 text-sm font-bold py-4 rounded-xl border border-slate-700">
                                            Нет актива
                                        </div>
                                    )}
                                    {isMyTurn && (
                                        <button onClick={onDismissMarket} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl text-sm">
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
                                                    <div className="flex items-center justify-between bg-slate-900/50 rounded-xl p-1 border border-slate-800 mb-1">
                                                        <button onClick={() => setStockQty(Math.max(1, stockQty - 1))} className="w-12 py-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg hover:bg-slate-700 transition-colors font-bold text-lg">-</button>
                                                        <input
                                                            type="number"
                                                            value={stockQty}
                                                            onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                            className="flex-1 bg-transparent text-center text-white font-mono font-bold text-xl outline-none"
                                                        />
                                                        <button onClick={() => setStockQty(stockQty + 1)} className="w-12 py-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-lg hover:bg-slate-700 transition-colors font-bold text-lg">+</button>
                                                    </div>
                                                    <div className="flex gap-2 px-1 text-[10px] text-slate-500 justify-between mb-1 uppercase tracking-widest font-bold">
                                                        <span>Сумма: ${((state.currentCard.cost || 0) * stockQty).toLocaleString()}</span>
                                                        <span>В наличии: {me.assets.find((a: any) => a.symbol === state.currentCard.symbol)?.quantity || 0}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={handleBuyStock} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-sm shadow-lg">
                                                            КУПИТЬ
                                                        </button>
                                                        {me.assets.some((a: any) => a.symbol === state.currentCard.symbol && a.quantity >= stockQty) && (
                                                            <button onClick={handleSellStock} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl text-sm shadow-lg">
                                                                ПРОДАТЬ
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button onClick={handleEndTurn} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-xs mt-1 border border-slate-700">
                                                        ПАС
                                                    </button>
                                                </div>
                                            ) : (
                                                // NORMAL BUY
                                                <>
                                                    <button onClick={handleBuy} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-green-900/30">
                                                        {state.currentCard.mandatory ? 'ОПЛАТИТЬ' : 'КУПИТЬ'}
                                                    </button>
                                                    {!state.currentCard.mandatory && (
                                                        <button onClick={handleEndTurn} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl text-sm">
                                                            ПАС
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        // INSUFFICIENT FUNDS
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="bg-red-900/30 border border-red-500/20 p-3 rounded-xl text-center flex items-center justify-between px-4">
                                                <div className="text-red-400 font-bold text-xs uppercase">Не хватает</div>
                                                <div className="text-white font-mono text-sm font-bold">
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
                                                className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-xs font-bold py-4 rounded-xl shadow-lg border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all"
                                            >
                                                🏦 Взять кредит
                                            </button>
                                            {!state.currentCard.mandatory && (
                                                <button onClick={handleEndTurn} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-xs mt-1">
                                                    Отказаться
                                                </button>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="w-full text-center text-slate-500 text-sm animate-pulse bg-slate-900/50 p-4 rounded-xl border border-slate-800">⏳ Ожидание игрока...</div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // 6. NO ACTIVE CARD - SHOW MARKET LIST OR PLACEHOLDER
        if (state.activeMarketCards && state.activeMarketCards.length > 0) {
            return (
                <div className="flex flex-col h-full w-full relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-t-3xl"></div>
                    <div className="p-4 flex-1 flex flex-col">
                        <h2 className="text-sm font-bold text-emerald-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>🔥</span> Рынок ({state.activeMarketCards.length})
                        </h2>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {state.activeMarketCards
                                .filter((ac: any) => ac.expiresAt > Date.now())
                                .map((ac: any) => (
                                    <div
                                        key={ac.id}
                                        onClick={() => onMarketCardClick && onMarketCardClick(ac)}
                                        className="bg-[#0f172a]/60 hover:bg-[#0f172a]/80 p-3 rounded-xl border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer flex justify-between items-center group transition-all"
                                    >
                                        <div>
                                            <div className="text-xs text-white font-bold">{ac.card.title}</div>
                                            <div className="text-[10px] text-emerald-400 font-mono">${ac.card.offerPrice?.toLocaleString()}</div>
                                        </div>
                                        <div className="text-emerald-500/50 group-hover:text-emerald-400 text-xs font-mono">
                                            {Math.ceil((ac.expiresAt - Date.now()) / 1000)}s
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            );
        }

        // 7. DEFAULT PLACEHOLDER
        return (
            <div className="flex flex-col items-center justify-center h-full w-full text-slate-600">
                <div className="text-4xl mb-4 opacity-30 grayscale">💼</div>
                <h2 className="text-base font-bold text-slate-500 uppercase tracking-widest">Сделки и возможности</h2>
                <p className="text-xs text-slate-600 mt-2">Здесь появятся ваши активные карты</p>
            </div>
        );
    };

    return (
        <div className="bg-[#1e293b] w-full h-full lg:min-h-[400px] lg:max-h-[500px] rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col">
            {renderContent()}
        </div>
    );
};
