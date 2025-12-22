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
    const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY'); // Toggle State

    // Reset state when card changes
    useEffect(() => {
        if (state.currentCard?.type === 'OFFER' && state.currentCard?.symbol) {
            // Default to BUY mode and max affordable qty
            setMode('BUY');
            const cost = state.currentCard.cost || 0;
            const maxAffordable = cost > 0 ? Math.floor(me.cash / cost) : 0;
            setStockQty(Math.max(1, maxAffordable));
        } else {
            setStockQty(1);
        }
    }, [state.currentCard?.title, state.currentCard?.symbol, me.cash, state.currentCard?.cost]);

    // Handle Mode Switching and Auto-Fill
    const handleModeSwitch = (newMode: 'BUY' | 'SELL') => {
        setMode(newMode);
        if (newMode === 'BUY') {
            const cost = state.currentCard.cost || 0;
            const maxAffordable = cost > 0 ? Math.floor(me.cash / cost) : 0;
            setStockQty(Math.max(1, maxAffordable)); // Default to max can buy
        } else {
            const owned = me.assets.find((a: any) => a.symbol === state.currentCard.symbol)?.quantity || 0;
            setStockQty(owned > 0 ? owned : 1); // Default to all owned
        }
    };

    // Handlers
    const handleExecuteStock = () => {
        if (mode === 'BUY') {
            socket.emit('buy_asset', { roomId, quantity: stockQty });
        } else {
            socket.emit('sell_stock', { roomId, quantity: stockQty });
        }
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
                <div className="flex flex-col h-full w-full relative pt-1">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-t-3xl"></div>
                    <div className="p-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-3 mb-4 shrink-0">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">⚡</div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">Возможность</h2>
                                <p className="text-[10px] text-slate-400">Выберите тип сделки</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'SMALL' })} className="w-full bg-slate-800 hover:bg-slate-700/80 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between group transition-all relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                <div className="text-left pl-3">
                                    <div className="font-bold text-emerald-400 text-sm">Малая Сделка</div>
                                    <div className="text-[10px] text-slate-500">Макс. 5 000$</div>
                                </div>
                                {(state.deckCounts?.small) && <div className="text-[10px] bg-emerald-900/40 px-2 py-0.5 rounded text-emerald-300 font-mono">{state.deckCounts.small.remaining} шт</div>}
                            </button>

                            <button onClick={() => socket.emit('resolve_opportunity', { roomId, choice: 'BIG' })} className="w-full bg-slate-800 hover:bg-slate-700/80 p-3 rounded-xl border border-purple-500/30 flex items-center justify-between group transition-all relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                <div className="text-left pl-3">
                                    <div className="font-bold text-purple-400 text-sm">Крупная Сделка</div>
                                    <div className="text-[10px] text-slate-500">Мин. 6 000$</div>
                                </div>
                                {(state.deckCounts?.big) && <div className="text-[10px] bg-purple-900/40 px-2 py-0.5 rounded text-purple-300 font-mono">{state.deckCounts.big.remaining} шт</div>}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // 2. CHARITY CHOICE
        if (state.phase === 'CHARITY_CHOICE' && isMyTurn) {
            return (
                <div className="flex flex-col h-full w-full relative pt-1">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-t-3xl"></div>
                    <div className="p-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar items-center text-center">
                        <div className="text-4xl mb-2">❤️</div>
                        <h2 className="text-lg font-bold text-white mb-2">Благотворительность</h2>
                        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                            Пожертвуйте <span className="text-pink-400 font-bold">{me.isFastTrack ? '$100k' : '10%'}</span> для бонусов.
                        </p>
                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => socket.emit('donate_charity', { roomId })} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg">
                                Пожертвовать (${(Math.max(0, me.income * 0.1)).toLocaleString()})
                            </button>
                            <button onClick={() => socket.emit('skip_charity', { roomId })} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-xs uppercase tracking-wider">
                                Отказаться
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // 3. BABY ROLL
        if (state.phase === 'BABY_ROLL') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse text-lg">👶 Ожидание броска...</div>;
            return (
                <div className="flex flex-col h-full w-full relative pt-1">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-rose-400 rounded-t-3xl"></div>
                    <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar items-center justify-center text-center">
                        <div className="text-5xl mb-4 animate-bounce">👶</div>
                        <h2 className="text-lg font-bold text-white mb-6">Пополнение в семье!</h2>
                        <button
                            onClick={() => socket.emit('roll_dice', { roomId })}
                            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-pink-900/30"
                        >
                            Бросить кубик
                        </button>
                    </div>
                </div>
            );
        }

        // 4. DOWNSIZED DECISION
        if (state.phase === 'DOWNSIZED_DECISION') {
            if (!isMyTurn) return <div className="flex flex-col items-center justify-center h-full text-slate-500">📉 Игрок принимает решение...</div>;
            return (
                <div className="flex flex-col h-full w-full relative pt-1">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-t-3xl"></div>
                    <div className="p-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📉 Увольнение!</h2>

                        <div className="flex flex-col gap-2 w-full">
                            <button
                                onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_1M' })}
                                disabled={me.cash < me.expenses * 1}
                                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex justify-between px-3 border border-slate-700 items-center group"
                            >
                                <span className="text-left flex flex-col items-start">
                                    <span>Оплатить 1 мес</span>
                                    <span className="text-[9px] text-slate-500">Пропуск 2 ходов</span>
                                </span>
                                <span className="text-red-400 font-mono text-xs">-${(me.expenses).toLocaleString()}</span>
                            </button>

                            <button
                                onClick={() => socket.emit('decision_downsized', { roomId, choice: 'PAY_2M' })}
                                disabled={me.cash < me.expenses * 2}
                                className="w-full bg-blue-900/40 hover:bg-blue-800/40 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex justify-between px-3 border border-blue-500/30 items-center group"
                            >
                                <span className="text-left flex flex-col items-start">
                                    <span>Оплатить 2 мес</span>
                                    <span className="text-[9px] text-slate-500">Играть сразу</span>
                                </span>
                                <span className="text-red-400 font-mono text-xs">-${(me.expenses * 2).toLocaleString()}</span>
                            </button>

                            <button
                                onClick={() => { if (confirm('Банкротство?')) socket.emit('decision_downsized', { roomId, choice: 'BANKRUPT' }); }}
                                className="text-red-500/70 hover:text-red-400 text-[10px] mt-2 uppercase font-bold tracking-widest text-center"
                            >
                                Объявить банкротство
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // 5. CURRENT CARD (Compact Design)
        if (state.currentCard) {
            return (
                <div className="flex flex-col h-full w-full relative">
                    {/* Decorative Gradient Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80"></div>

                    <div className="flex-1 flex flex-col pt-3 overflow-y-auto custom-scrollbar px-1">

                        {/* Header: Icon + Title */}
                        <div className="flex items-start gap-4 mb-3 shrink-0">
                            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center shrink-0 border border-slate-700 shadow-md">
                                <span className="text-4xl drop-shadow-md">{state.currentCard.type === 'MARKET' ? '🏠' : '💸'}</span>
                            </div>
                            <div className="flex flex-col min-w-0 pt-1">
                                <h2 className="text-lg font-bold text-white leading-tight mb-1 truncate">{state.currentCard.title}</h2>
                                <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-3">{state.currentCard.description}</p>
                            </div>
                        </div>

                        {/* Info Block (Price / Income) */}
                        <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800 mb-2 shrink-0">
                            {state.currentCard.type === 'MARKET' ? (
                                <div className="flex justify-between items-center text-center">
                                    <div className="text-left">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Цена</div>
                                        <div className="text-xl font-mono text-emerald-400 font-bold tracking-tight">${(state.currentCard.offerPrice || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Цель</div>
                                        <div className="text-xs text-white font-medium max-w-[80px] truncate">{state.currentCard.targetTitle}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div className="text-left">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Цена</div>
                                        {state.currentCard.cost ? (
                                            <div className="text-xl font-mono text-white font-bold tracking-tight">${state.currentCard.cost.toLocaleString()}</div>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic">Бесплатно</div>
                                        )}
                                    </div>

                                    {state.currentCard.type !== 'EXPENSE' && state.currentCard.type !== 'DOODAD' && (
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Доход</div>
                                            <div className={`text-xl font-mono font-bold tracking-tight ${state.currentCard.cashflow < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {state.currentCard.cashflow > 0 ? '+' : ''}${state.currentCard.cashflow || 0}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stock Fluctuation Hint */}
                            {state.currentCard.symbol && (
                                <div className="mt-2 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500 text-center flex justify-between">
                                    <span>Колебания: $10 - $30</span>
                                    <span>В наличии: {me.assets.find((a: any) => a.symbol === state.currentCard.symbol)?.quantity || 0}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS (Pinned Bottom) */}
                    <div className="pt-2 shrink-0">
                        {state.currentCard.type === 'MARKET' ? (
                            <div className="flex gap-2">
                                {me.assets.some((a: any) => a.title === state.currentCard?.targetTitle) ? (
                                    <button onClick={() => socket.emit('sell_asset', { roomId })} className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg">
                                        Продать
                                    </button>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center bg-slate-800/50 text-slate-500 text-xs font-bold py-3 rounded-xl border border-slate-700 cursor-not-allowed">
                                        Нет актива
                                    </div>
                                )}
                                {isMyTurn && (
                                    <button onClick={onDismissMarket} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors">
                                        Закрыть
                                    </button>
                                )}
                            </div>
                        ) : (
                            // Standard Logic
                            isMyTurn ? (
                                (me.cash >= ((state.currentCard.downPayment ?? state.currentCard.cost) || 0) * stockQty) || state.currentCard.symbol ? (
                                    <div className="flex flex-col gap-2">
                                        {state.currentCard.symbol ? (
                                            // STOCK ACTIONS
                                            <>
                                                {/* Mini Slider / Input */}
                                                <div className="flex items-center gap-2 bg-slate-900/40 p-1 rounded-lg border border-slate-800/50">
                                                    <button
                                                        onClick={() => setStockQty(Math.max(1, stockQty - 1))}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={stockQty}
                                                        onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="flex-1 bg-transparent text-center font-mono font-bold text-lg text-white outline-none"
                                                    />
                                                    <button
                                                        onClick={() => setStockQty(stockQty + 1)}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-center text-[10px] text-slate-500 font-mono mb-1">
                                                    Итого: <span className="text-slate-300 font-bold">${((state.currentCard.cost || 0) * stockQty).toLocaleString()}</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => { setMode('BUY'); handleExecuteStock(); }}
                                                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg"
                                                    >
                                                        Купить
                                                    </button>
                                                    <button
                                                        onClick={() => { setMode('SELL'); handleExecuteStock(); }}
                                                        disabled={!me.assets.some((a: any) => a.symbol === state.currentCard.symbol && a.quantity > 0)}
                                                        className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg"
                                                    >
                                                        Продать
                                                    </button>
                                                </div>
                                                <button onClick={handleEndTurn} className="w-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-colors">
                                                    Пропустить
                                                </button>
                                            </>
                                        ) : (
                                            // NORMAL BUY
                                            <div className="flex gap-2">
                                                <button onClick={handleBuy} className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg">
                                                    {state.currentCard.mandatory ? 'ОПЛАТИТЬ' : 'КУПИТЬ'}
                                                </button>
                                                {!state.currentCard.mandatory && (
                                                    <button onClick={handleEndTurn} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors">
                                                        ПАС
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // INSUFFICIENT FUNDS
                                    <div className="flex flex-col gap-2">
                                        <div className="text-center text-[10px] text-red-400 font-bold bg-red-900/20 py-1 rounded">Не хватает funds</div>
                                        <button
                                            onClick={() => handleLoan(5000)} // Simplification
                                            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg"
                                        >
                                            Взять Кредит +$5k
                                        </button>
                                        {!state.currentCard.mandatory && (
                                            <button onClick={handleEndTurn} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider">
                                                Пропустить
                                            </button>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold py-2">Ход другого игрока</div>
                            )
                        )}
                    </div>
                </div>
            );
        }

        // 6. NO ACTIVE CARD - SHOW MARKET LIST OR PLACEHOLDER
        if (state.activeMarketCards && state.activeMarketCards.length > 0) {
            return (
                <div className="flex flex-col h-full w-full relative pt-1">
                    <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                        <span>🔥</span> Активные предложения
                    </h2>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {state.activeMarketCards
                            .filter((ac: any) => ac.expiresAt > Date.now())
                            .map((ac: any) => (
                                <div
                                    key={ac.id}
                                    onClick={() => onMarketCardClick && onMarketCardClick(ac)}
                                    className="bg-slate-900/40 hover:bg-slate-800/60 p-2 rounded-xl border border-slate-700/50 cursor-pointer flex justify-between items-center group transition-all"
                                >
                                    <div>
                                        <div className="text-xs text-slate-200 font-bold">{ac.card.title}</div>
                                        <div className="text-[10px] text-emerald-400 font-mono">${ac.card.offerPrice?.toLocaleString()}</div>
                                    </div>
                                    <div className="text-slate-600 text-[10px] font-mono">
                                        {Math.ceil((ac.expiresAt - Date.now()) / 1000)}s
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            );
        }

        // 7. DEFAULT PLACEHOLDER
        return (
            <div className="flex flex-col items-center justify-center h-full w-full text-slate-600/50">
                <div className="text-3xl mb-2 opacity-50 grayscale">📇</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-center">Нет активных сделок</div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col relative text-left">
            {renderContent()}
        </div>
    );
};
