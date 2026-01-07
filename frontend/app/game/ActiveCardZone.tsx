
import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { getGameServiceUrl } from '../../lib/config';
import { ConfirmModal } from './ConfirmModal';
import { FeedCardItem } from './FeedCardItem';
import { BabyRollView } from './BabyRollView';
import { FiredView } from './FiredView';

// Re-export or import TutorialTip if needed, or if it's used in this file?
// It was defined inline in previous version! I need to move it to TutorialTip.tsx or import it if exists.
// I checked TutorialTip.tsx exists.
import { TutorialTip } from './TutorialTip';

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
    isTutorial?: boolean;
    tutorialStep?: number;
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
    onDismissPreview,
    canShowCard = true, // Default to true if not provided
    isTutorial,
    tutorialStep
}: ActiveCardZoneProps) => {

    const [locallyDismissedIds, setLocallyDismissedIds] = useState<string[]>([]); // Added this state

    // Clear locally dismissed IDs when turn changes to prevent hiding recurring cards (e.g. reshuffled expenses)
    useEffect(() => {
        setLocallyDismissedIds([]);
    }, [state?.currentPlayerIndex, state?.phase]);

    // Guard Clause: Prevent crash if state is undefined.
    // CRITICAL: Ensure NO hooks are called after this return.
    // Since we moved all sub-components to separate files, we are certain there are no hidden hooks below.
    if (!state || !me) return null;

    const showPhaseContent = canShowCard;

    // Phase-specific rendering logic - stored in variables (NO early returns!)
    let phaseContent: React.ReactElement | null = null;

    // 1. OPPORTUNITY CHOICE
    if (showPhaseContent && state.phase === 'OPPORTUNITY_CHOICE' && isMyTurn) {
        phaseContent = (
            <div className="flex flex-col h-full w-full relative bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg animate-in fade-in duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>

                <div className="p-4 flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="text-center mb-2">
                        <div className="text-4xl mb-2 animate-bounce">💎</div>
                        <h2 className="text-lg font-bold text-white">Выберите Возможность</h2>
                        <p className="text-xs text-slate-400">Куда инвестировать?</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-[280px]">
                        <button
                            onClick={() => socket.emit('choose_opportunity', { roomId, choice: 'SMALL_DEAL' })}
                            className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-3 relative z-10">
                                <span className="text-2xl">🦎</span>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Мелкая Сделка</h3>
                                    <p className="text-[10px] text-slate-400">Стоимость до $5,000</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => socket.emit('choose_opportunity', { roomId, choice: 'BIG_DEAL' })}
                            disabled={me.cash < 6000}
                            className={`bg-slate-800 p-4 rounded-xl border border-slate-700 transition-all group relative overflow-hidden text-left
                                ${me.cash >= 6000 ? 'hover:bg-slate-700 hover:border-purple-500/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                            `}
                        >
                            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-3 relative z-10">
                                <span className="text-2xl">🏢</span>
                                <div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Крупная Сделка</h3>
                                    <p className="text-[10px] text-slate-400">Стоимость от $6,000</p>
                                    {me.cash < 6000 && <span className="text-[9px] text-red-400 font-mono mt-1 block">Нужен кэш $6k+</span>}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // 2. CHARITY
    else if (showPhaseContent && state.phase === 'CHARITY_CHOICE') {
        const isMyCharity = state.currentPlayerIndex === state.players.findIndex((p: any) => p.id === me.id);
        if (isMyCharity) {
            phaseContent = (
                <div className="flex flex-col h-full w-full relative bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg animate-in fade-in zoom-in duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500"></div>
                    <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-5xl mb-4 animate-pulse">💝</div>
                        <h2 className="text-xl font-bold text-white mb-2">Благотворительность</h2>
                        <p className="text-slate-300 text-xs mb-8 leading-relaxed max-w-[240px]">
                            Пожертвуйте <span className="text-yellow-400 font-bold">10%</span> от общего дохода, чтобы использовать <span className="text-white font-bold">2 кубика</span> следующие 3 хода.
                        </p>
                        <div className="flex bg-slate-800/50 p-3 rounded-xl mb-6 items-center gap-3 border border-white/5">
                            <span className="text-xs text-slate-400 uppercase font-bold">Сумма:</span>
                            <span className="text-xl font-mono font-black text-rose-400">
                                -${Math.max(1000, Math.ceil((me.totalIncome || 0) * 0.1)).toLocaleString()}
                            </span>
                        </div>
                        <div className="space-y-3 w-full">
                            <button
                                onClick={() => socket.emit('charity_choice', { roomId, accept: true })}
                                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
                            >
                                Пожертвовать
                            </button>
                            <button
                                onClick={() => socket.emit('charity_choice', { roomId, accept: false })}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider active:scale-95 transition-transform"
                            >
                                Отказаться
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }
    // 3. BABY ROLL
    else if (showPhaseContent && state.phase === 'BABY_ROLL') {
        phaseContent = <BabyRollView roomId={roomId} isMyTurn={isMyTurn} socket={socket} />;
    }
    // 4. DOWNSIZED_DECISION (FIRED)
    else if (showPhaseContent && state.phase === 'DOWNSIZED_DECISION') {
        phaseContent = <FiredView roomId={roomId} me={me} isMyTurn={isMyTurn} socket={socket} />;
    }

    // If phase-specific content is set, return it
    if (phaseContent) return phaseContent;

    // --- STANDARD FEED LOGIC BELOW ---

    // 1. Current Card (drawn from deck or event)
    // Wrap current card in standard format if it exists
    const currentCard = canShowCard && state.currentCard ? [{
        ...state.currentCard,
        source: 'CURRENT', // Tag as current draw
        sourcePlayerId: state.players[state.currentPlayerIndex].id // Owner is current player
    }] : [];

    // 2. Active Market Cards (Offers + Persistent Risks/Deals)
    // Filter specific to player visibility
    const marketCards = (state.activeMarketCards || []).map((c: any) => ({
        ...c,
        source: 'MARKET',
        sourcePlayerId: c.sourcePlayerId // Already set by backend
    }));

    // Combine & Filter Logic
    const feedItems = [...currentCard, ...marketCards]
        .filter((item: any) => {
            // Check if already dismissed LOCALLY
            if (locallyDismissedIds.includes(item.id)) return false;

            // Check if already dismissed SERVER-SIDE
            if (item.dismissedBy && me?.id && item.dismissedBy.includes(me.id)) return false;

            // ALWAYS show cards that belong to me (e.g. transferred deals)
            if (item.sourcePlayerId === me?.id) return true;

            // If canShowCard is false (not my turn), only show cards that I can sell
            if (!canShowCard) {
                const iOwnAsset = me?.assets?.some((a: any) =>
                    (item.symbol && a.symbol === item.symbol) ||
                    (!item.symbol && (a.title === item.title || a.title === item.targetTitle))
                );
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

    return (
        <div className="relative w-full h-full flex flex-col pointer-events-none">
            {/* Feed Container */}
            <div className="relative w-full flex-1 flex flex-col justify-end pb-4 sm:pb-8 pointer-events-auto">
                {feedItems.map((item: any, idx: number) => {
                    const isTop = idx === 0;
                    const offset = idx * 10;
                    const scale = 1 - (idx * 0.05);
                    const zIndex = 50 - idx;

                    // Safety: Ensure we have an ID for key
                    const displayCard = item.card || item;
                    const keyId = item.id || displayCard.id || `card-${idx}`;

                    return (
                        <div
                            key={keyId}
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

                                        // 2. Active Player Logic (Global - Dismiss Card -> Backend handles logic (Pay/Penalty/Discard))
                                        if (item.source === 'CURRENT' && isMyTurn) {
                                            socket.emit('dismiss_card', { roomId });
                                            // socket.emit('end_turn', { roomId }); // OLD: This bypassed payment logic!
                                            return;
                                        }

                                        // 3. Market Card Dismissal (Server-side per-player tracking)
                                        if (item.source === 'MARKET') {
                                            socket.emit('dismiss_market_card', { roomId, cardId: item.id });
                                            // Also dismiss locally for immediate feedback
                                            setLocallyDismissedIds(prev => [...prev, item.id]);
                                            return;
                                        }

                                        // 4. Passive/Observer Mode (Local Only for current card)
                                        setLocallyDismissedIds(prev => [...prev, item.id]);
                                    }}
                                    isTutorial={isTutorial}
                                    tutorialStep={tutorialStep}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
