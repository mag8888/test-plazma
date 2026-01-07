"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../socket';
import confetti from 'canvas-confetti';
import { BoardVisualizer } from './BoardVisualizer';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TextChat } from './TextChat';
import { sfx } from './SoundManager';
import { Card } from './cards_data';
import { partnershipApi } from '../../lib/partnershipApi';
import { useTelegram } from '../../components/TelegramProvider';
import { TutorialTip, PortalTutorialTip } from './TutorialTip';

interface BoardProps {
    roomId: string;
    userId?: string | null;
    initialState: any;
    isHost?: boolean;
    isTutorial?: boolean;
}

// ... (existing code top)

// (At line 511, remove duplicate localPlayer/isMyTurn/currentPlayer if I moved them up? No, I only added `localPlayer` up top. But wait, `isMyTurn` etc depend on `localPlayer`.)
// Actually, I should probably keep `localPlayer` at line 511 where it was, just Update it.
// My previous tool call injected `localPlayer` at line 108? 
// Let's Undo line 108 addition if possible or just remove it, and Update line 511 properly.
// Wait, I can't undo. I will Update Line 511 to be empty (or just the new logic) and Remove the one at line 108 if it exists.
// Actually, `localPlayer` is used in `useEffects`? No, it's used in Render.
// Ideally `localPlayer` is derived near top is fine.
// But `isMyTurn` etc are at 512.
// Let's just update the ONE place it should be.
// I will target the `BoardProps` specifically first to fix the build error.


interface PlayerState {
    id: string;
    name: string;
    cash: number;
    cashflow: number;
    income: number;
    expenses: number;
    loanDebt: number;
    position: number;
    isFastTrack: boolean;
    childrenCount: number;
    childCost: number;
    salary: number;
    passiveIncome: number;
    token?: string;
    photo_url?: string; // Avatar URL
    professionName?: string;
    isBankrupted?: boolean;
    canEnterFastTrack?: boolean;
    hasWon?: boolean;
    expenseBreakdown?: {
        taxes: number;
        homeMortgage: number;
        schoolLoanPayment: number;
        carLoanPayment: number;
        creditCardPayment: number;
        retailPayment: number;
        otherExpenses: number;
        childExpenses: number;
        bankLoanPayment: number;
        liabilityExpenses?: number;
    };
}

import { BankModal } from './BankModal';
import { ExpenseBreakdownModal } from './ExpenseBreakdownModal';
import { TransferModal } from './TransferModal';
import { TransferCashModal } from './TransferCashModal';
import { RulesModal } from './RulesModal';
import { RankingsModal } from './RankingsModal';
import { MenuModal } from './MenuModal';
import { ExitToFastTrackModal } from './ExitToFastTrackModal';
import { FastTrackInfoModal } from './FastTrackInfoModal';
import { VictoryModal } from './VictoryModal';
import { AdminActionModal, AdminActionType } from './AdminActionModal';
import { ActiveCardZone } from './ActiveCardZone';
import { PlayerCard } from './PlayerCard';
import { SquareInfoModal } from './SquareInfoModal';
import CongratulateModal from './CongratulateModal';
import { WinnerModal } from './WinnerModal';
import { GameTimer } from './GameTimer';
import { TutorialOverlay } from './TutorialOverlay';
// Helper for Cash Animation
import { ErrorBoundary } from './ErrorBoundary';
import { AnimatedNumber } from './AnimatedNumber';
import { CashChangeIndicator } from './CashChangeIndicator';


const getAvatarColor = (id: string) => {
    const colors = [
        'from-red-500 to-orange-500',
        'from-orange-500 to-amber-500',
        'from-amber-500 to-yellow-500',
        'from-yellow-500 to-lime-500',
        'from-lime-500 to-green-500',
        'from-green-500 to-emerald-500',
        'from-emerald-500 to-teal-500',
        'from-teal-500 to-cyan-500',
        'from-cyan-500 to-sky-500',
        'from-sky-500 to-blue-500',
        'from-blue-500 to-indigo-500',
        'from-indigo-500 to-violet-500',
        'from-violet-500 to-purple-500',
        'from-purple-500 to-fuchsia-500',
        'from-fuchsia-500 to-pink-500',
        'from-pink-500 to-rose-500',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '?';
    return name.substring(0, 2).toUpperCase();
};


// Logic extracted to Inner component to guarantee robust hook execution (Fixes #310)
function GameBoardContent({ roomId, userId, isHost, isTutorial, state, setState }: BoardProps & { state: any, setState: (s: any) => void }) {
    const router = useRouter();

    // State is now passed from parent, initialized and safe.

    const [showBank, setShowBank] = useState(false);
    const [showRules, setShowRules] = useState(false);

    // Tutorial: Auto-open Rules
    useEffect(() => {
        if (isTutorial) setShowRules(true);
    }, [isTutorial]);

    const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [transferAssetItem, setTransferAssetItem] = useState<{ item: any, index: number } | null>(null);
    const [adminAction, setAdminAction] = useState<{ type: AdminActionType; player: any } | null>(null);
    const [stockQty, setStockQty] = useState(1);

    // Mobile Drawer State
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileView, setMobileView] = useState<'stats' | 'players'>('stats');

    // Sound Settings
    const [volume, setVolume] = useState(0.5);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showFastTrackModal, setShowFastTrackModal] = useState(false);
    const [showFastTrackInfo, setShowFastTrackInfo] = useState(false);
    const [dismissedMarketCards, setDismissedMarketCards] = useState<string[]>([]);
    const [isMuted, setIsMuted] = useState(false);

    // Tutorial State
    const [hasClickedFastTrack, setHasClickedFastTrack] = useState(false);

    // Partnership Data
    const [partnershipUser, setPartnershipUser] = useState<any>(null);

    // Ref for tracking previous cash to play sound
    const prevCashRef = useRef<number | undefined>(undefined);




    // Chat State
    const [chatMessage, setChatMessage] = useState('');

    // Bank Recipient State
    const [bankRecipientId, setBankRecipientId] = useState<string>('');



    useEffect(() => {
        setVolume(sfx.getVolume());
        setIsMuted(sfx.getMute());
    }, []);

    const handleVolumeChange = (val: number) => {
        setVolume(val);
        sfx.setVolume(val);
    };

    const toggleMute = () => {
        const newVal = !isMuted;
        setIsMuted(newVal);
        sfx.setMute(newVal);
    };

    // Zoom State
    const [zoom, setZoom] = useState(1.0);

    // Animation & Popup States
    const [showDice, setShowDice] = useState(false);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [diceBreakdown, setDiceBreakdown] = useState<string | null>(null);
    const [mlmMessage, setMlmMessage] = useState<string | null>(null);
    const [pendingState, setPendingState] = useState<any | null>(null);
    const [squareInfo, setSquareInfo] = useState<any>(null);
    const [babyNotification, setBabyNotification] = useState<string | null>(null);
    const [turnNotification, setTurnNotification] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Card Modal Visibility (Local Override)
    const [isCardModalOpen, setIsCardModalOpen] = useState(true);

    // Congratulate Modal State
    const [congratulateData, setCongratulateData] = useState<{ isOpen: boolean, targetName: string, targetId: string } | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showYouWon, setShowYouWon] = useState(false);
    const [victoryPlayer, setVictoryPlayer] = useState<any>(null);

    // Auto-open modal when a new card appears
    useEffect(() => {
        if (state?.currentCard) {
            // User Request: Delay Expense/Market cards by 1s (to see token stop)
            const type = state.currentCard.type || '';
            const isDelayedType = type.includes('EXPENSE') || type === 'DOODAD' || type.includes('MARKET');

            if (isDelayedType) {
                // Reset first creates effect of "appearing" later?
                // Actually ActiveCardZone might already show it if we don't block it.
                // We need to ensure `canShowCard` (passed to ActiveCardZone) uses this state.
                // Currently `canShowCard` isn't used to HIDE the card content in ActiveCardZone completely? 
                // Let's check: ActiveCardZone uses `canShowCard={canShowCard}`.
                // In board.tsx: `const canShowCard = isCardModalOpen || forceShow;` (I need to verify this variable existence)
                // Wait, I saw `canShowCard={canShowCard}` in the props passed to ActiveCardZone in previous view.

                setIsCardModalOpen(false); // Hide initially
                const timer = setTimeout(() => {
                    setIsCardModalOpen(true);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                setIsCardModalOpen(true);
            }
        }
    }, [state?.currentCard]);

    // Host Menu State
    const [selectedPlayerForMenu, setSelectedPlayerForMenu] = useState<PlayerState | null>(null);

    // Timer State removed - using GameTimer component to isolate re-renders

    // LAYOUT MODE: Default to 'auto' (responsive). 'landscape' forces desktop layout.
    const [forceLandscape, setForceLandscape] = useState(false);

    // Auto-detect orientation changes
    useEffect(() => {
        const handleResize = () => {
            // If width > height and Width is small (mobile landscape), force desktop mode
            // We use 900 as a safe breakpoint for phones. Tablets often trigger lg anyway.
            if (window.innerWidth > window.innerHeight && window.innerWidth < 1024) {
                setForceLandscape(true);
            } else {
                setForceLandscape(false);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    // Fetch Partnership Data
    const { webApp } = useTelegram();
    useEffect(() => {
        // Use userId from props to fetch user data and get telegram_id
        if (userId && webApp?.initData) {
            console.log('[Board] Fetching user data for userId:', userId);

            // Fetch user data from backend to get telegram_id
            fetch(`/api/user/${userId}`)
                .then(res => res.json())
                .then((userData: any) => {
                    if (userData && userData.telegram_id) {
                        const telegramId = userData.telegram_id.toString();
                        console.log('[Board] Got telegram_id:', telegramId, 'username:', userData.username);

                        // Now fetch partnership data
                        return partnershipApi.login(telegramId, userData.username)
                            .then((dbUser: any) => {
                                console.log('[Board] Partnership data loaded:', dbUser);
                                setPartnershipUser(dbUser);

                                // Auto-sync legacy balance if needed
                                if (dbUser.greenBalance === 0 && userData.referralBalance > 0) {
                                    console.log('[Board] Syncing legacy balance:', userData.referralBalance);
                                    return partnershipApi.syncLegacyBalance(webApp.initData)
                                        .then((syncRes: any) => {
                                            if (syncRes.success && syncRes.synced > 0) {
                                                console.log('[Board] Synced $' + syncRes.synced);
                                                // Refresh data
                                                return partnershipApi.login(telegramId, userData.username)
                                                    .then((updated: any) => setPartnershipUser(updated));
                                            }
                                        });
                                }
                            });
                    } else {
                        console.warn('[Board] No telegram_id in user data');
                        setPartnershipUser({ greenBalance: 0 });
                    }
                })
                .catch((err: any) => {
                    console.error("[Board] Failed to fetch partnership data:", err);
                    setPartnershipUser({ greenBalance: 0 });
                });
        }
    }, [userId, webApp]);

    // ... (existing effects) hasRolled when turn changes or Phase resets to ROLL
    // Local state to track if player has rolled this turn
    const [hasRolled, setHasRolled] = useState(false);

    // Reset hasRolled when turn changes or Phase resets to ROLL
    useEffect(() => {
        setHasRolled(false);
    }, [state.currentPlayerIndex]);

    useEffect(() => {
        if (state.phase === 'ROLL') {
            setHasRolled(false);
        }
    }, [state.phase]);

    useEffect(() => {
        if (state.lastEvent?.type === 'BABY_BORN') {
            sfx.play('baby');
            setBabyNotification(`👶 Поздравляем! В семье ${state.lastEvent.payload?.player} пополнение!`);

            const currentPlayer = state.players[state.currentPlayerIndex];
            const isMe = currentPlayer?.id === socket.id || (userId && currentPlayer?.userId === userId);

            if (!isMe) {
                // Show Congratulate Modal for others
                setCongratulateData({
                    isOpen: true,
                    targetName: state.lastEvent.payload?.player,
                    targetId: state.lastEvent.payload?.playerId
                });
                // Hide notification after 3s but keep modal
                setTimeout(() => setBabyNotification(null), 3000);
            } else {
                // I am the parent
                // Auto End Turn Logic (4s delay to allow sound/visual to finish)
                setTimeout(() => {
                    setBabyNotification(null);
                    socket.emit('end_turn', { roomId });
                }, 4000);
            }

        } else if (state.lastEvent?.type === 'BABY_MISSED') {
            setBabyNotification(`🎲 Семья ${state.lastEvent.payload?.player} пока не растет.`);

            // Auto End Turn Logic (3s delay)
            const currentPlayer = state.players[state.currentPlayerIndex];
            if (currentPlayer?.id === socket.id) {
                setTimeout(() => {
                    setBabyNotification(null);
                    socket.emit('end_turn', { roomId });
                }, 3000);
            } else {
                setTimeout(() => setBabyNotification(null), 3000);
            }
        } else if (state.lastEvent?.type === 'LOTTERY_WIN') {
            sfx.play('victory');
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#00FF00', '#ffffff']
            });
            // Construct a "Square-like" object to show in the info modal
            const wonCard = state.lastEvent.payload.card;
            setSquareInfo({
                ...wonCard,
                name: `🏆 WON: ${wonCard.title}`,
                description: `Вы выиграли этот актив в лотерею! ${wonCard.description || ''}`,
                cost: 0 // Show as free? Or show original value? UI shows cost as RED. Maybe show Cashflow only?
                // If I set cost to null, it won't show "Cost -$X".
                // If I set cashflow, it will show GREEN.
            });
            // No timeout to close, let user close it.
        } else if (state.lastEvent?.type === 'TURN_SKIPPED') {
            setTurnNotification(`🚫 ${state.lastEvent.payload?.player} пропускает ход! (Осталось: ${state.lastEvent.payload?.remaining})`);
            setTimeout(() => setTurnNotification(null), 3000);

            // Critical Fix: If opponent skipped and turn passed back to localPlayer, reset local rolled state
            if (state.players[state.currentPlayerIndex].id === socket.id) {
                setHasRolled(false);
            }
        } else if (state.lastEvent?.type === 'WINNER') {
            setTurnNotification(`🏆 ${state.lastEvent.payload?.player} ПОБЕДИЛ!`);
            sfx.play('win');

            // Fireworks
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
        }
    }, [state.lastEvent]);

    const handleRoll = (diceCount?: number) => {
        sfx.play('roll');
        socket.emit('roll_dice', { roomId, diceCount });
        setHasRolled(true);
    };

    const handleBuy = () => {
        if (state.currentCard?.outcomeDescription) {
            alert(state.currentCard.outcomeDescription);
        }
        socket.emit('buy_asset', { roomId });
    };

    // Auto-close Market Preview if card is removed (e.g. bought)
    useEffect(() => {
        if (squareInfo?.type === 'MARKET' && squareInfo.card) {
            const exists = state.activeMarketCards?.some((mc: any) => mc.card.id === squareInfo.card.id);
            if (!exists) {
                setSquareInfo(null);
            }
        }
    }, [state.activeMarketCards, squareInfo]);

    // Timer Sync & Countdown Logic
    // Timer Sync & Countdown Logic MOVED to GameTimer component

    // Track rolling state to prevent efficient handling of 'state_updated' race conditions
    const isRollingRef = useRef(false);

    // Tutorial Refs
    const desktopBankButtonRef = useRef<HTMLButtonElement>(null);

    // --- SOUND EFFECTS ---
    const [showRankings, setShowRankings] = useState(false);
    const [rankings, setRankings] = useState<any[]>([]);
    const [transferTarget, setTransferTarget] = useState<any>(null);

    useEffect(() => {
        socket.on('dice_rolled', (data: { type: string; roll: number; diceValues?: number[]; message?: string; state?: any }) => {
            if (data.type === 'MLM') {
                setDiceValue(data.roll);
                setShowDice(true);
                setMlmMessage(data.message || null);

                setTimeout(() => {
                    setShowDice(false);
                    setMlmMessage(null);
                    if (data.state) setState(data.state);
                }, 4000);
                return;
            }

            // Standard Roll
            isRollingRef.current = true; // Block external updates
            setDiceValue(data.roll);

            if (data.diceValues && data.diceValues.length > 1) {
                setDiceBreakdown(data.diceValues.join(' + '));
            } else {
                setDiceBreakdown(null);
            }

            setShowDice(true);
            setIsAnimating(true);

            const DICE_DURATION = 3000; // User Request: 3 seconds
            const POST_MOVE_WAIT = 2000; // User Request: 2 seconds wait on last cell

            const moveDuration = (data.roll || 0) * 500;

            setTimeout(() => {
                setShowDice(false);
                isRollingRef.current = false;

                // Start Move
                // Initial State Sync
                setTimeout(() => {
                    setState(data.state);
                }, 500);

                // End Move + Wait
                setTimeout(() => {
                    const currentPlayer = data.state.players[data.state.currentPlayerIndex];
                    if (!currentPlayer) return;

                    const squareIndex = currentPlayer.position;
                    // Check if player is on fast track for square finding
                    let square;
                    if (currentPlayer.isFastTrack) {
                        square = data.state.board[24 + squareIndex];
                    } else {
                        square = data.state.board.find((s: any) => s.index === squareIndex);
                    }

                    // Show popup only if phase allows
                    const isMe = currentPlayer?.id === socket.id || (typeof window !== 'undefined' && currentPlayer?.userId === userId);

                    if (isMe && square && !['roll_dice'].includes(data.state.phase)) {
                        // Don't show generic info for interactive squares that have their own UI
                        if (!['EXPENSE', 'MARKET', 'CHARITY', 'DEAL'].includes(square.type)) {
                            setSquareInfo(square);
                        }
                    }
                    setIsAnimating(false); // Allow cards to show now
                }, moveDuration + POST_MOVE_WAIT); // Wait for move + 2s
            }, DICE_DURATION);
        });

        socket.on('game_over', (data: any) => {
            setState(data.state);
            setRankings(data.rankings);
            setShowRankings(true);
            setIsAnimating(false);
            setShowDice(false);
            sfx.play('victory');
        });

        socket.on('state_updated', (data: any) => {
            if (!isRollingRef.current) {
                // SOUNDS DISABLED per user request - too many sound effects
                // // My Turn Check
                // const oldIdx = state?.currentPlayerIndex;
                // const newIdx = data.state?.currentPlayerIndex;
                // const meInList = data.state?.players?.findIndex((p: any) => p.id === socket.id);
                // 
                // // If turn passed TO localPlayer
                // if (typeof oldIdx === 'number' && typeof newIdx === 'number' && oldIdx !== newIdx && newIdx === meInList) {
                //     sfx.play('turn');
                // }
                //
                // if (data.state.lastEvent?.type === 'PAYDAY') {
                //     sfx.play('payday');
                // }
                // if (data.state.lastEvent?.type === 'DOWNSIZED') {
                //     sfx.play('fired');
                // }
                // if (data.state.lastEvent?.type === 'FAST_TRACK') sfx.play('fasttrack');
                // if (data.state.lastEvent?.type === 'STOCK') sfx.play('stock');

                setState(data.state);

                // Check if current player just won
                const currentMe = data.state.players.find((p: any) => p.id === socket.id);
                const previousMe = state?.players?.find((p: any) => p.id === socket.id);

                // If I just won (and wasn't winning before)
                if (currentMe?.hasWon && !previousMe?.hasWon) {
                    setVictoryPlayer(currentMe);
                    // Use new WinnerModal instead of VictoryModal or generic notification
                    setShowYouWon(true);
                } else if (!currentMe?.hasWon && data.state.lastEvent?.type === 'WINNER') {
                    // Someone ELSE won
                    setTurnNotification(`🏆 ${data.state.lastEvent.payload?.player} ЗАНЯЛ ${data.state.rankings?.length || 1}-Е МЕСТО!`);
                }
            }
        });

        socket.on('turn_ended', (data: any) => {
            isRollingRef.current = false;

            // My Turn Check - SOUND DISABLED per user request
            // const meInList = data.state?.players?.findIndex((p: any) => p.id === socket.id);
            // if (data.state?.currentPlayerIndex === meInList) {
            //     sfx.play('turn');
            // }

            setState(data.state);
            setSquareInfo(null);
        });

        socket.on('game_started', (data: any) => {
            isRollingRef.current = false;
            setState(data.state);
            sfx.play('start');
        });

        socket.on('room_deleted', () => {
            alert('Игра была отменена организатором.');
            router.push('/lobby');
        });

        return () => {
            socket.off('dice_rolled');
            socket.off('game_over');
            socket.off('turn_ended');
            socket.off('state_updated');
            socket.off('game_started');
            socket.off('room_deleted');
        };
    }, []);


    // Duplicates removed - these are now handled via engineRef or were redefined at the top level

    // Card Reveal Logic moved lower to access isAnimatingMove

    const handleBuyStock = () => {
        socket.emit('buy_asset', { roomId, quantity: stockQty });
        setStockQty(1);
    };

    const handleSellStock = () => {
        socket.emit('sell_stock', { roomId, quantity: stockQty });
        setStockQty(1);
    };

    const handleResolveOpportunity = (choice: string) => {
        // if (choice === 'buy') sfx.play('stock');
        socket.emit('resolve_opportunity', { roomId: state.roomId, choice });
    };

    const handleTransferFunds = (toId: string, amount: number) => {
        // sfx.play('transfer');
        socket.emit('transfer_funds', { roomId: state.roomId, toId, amount });
    };
    const handleLoan = (amount: number) => socket.emit('take_loan', { roomId, amount });
    const handleRepay = (amount: number) => socket.emit('repay_loan', { roomId, amount });
    const handleEndTurn = () => socket.emit('end_turn', { roomId });

    const handleSendChat = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatMessage.trim()) return;
        socket.emit('chat_message', { roomId, message: chatMessage });
        setChatMessage('');
    };

    const handleTransferAsset = (toId: string, quantity?: number) => {
        if (!transferAssetItem) return;
        socket.emit('transfer_asset', { roomId, toPlayerId: toId, assetIndex: transferAssetItem.index, quantity });
        setTransferAssetItem(null);
    };

    const handleDismissCard = () => {
        socket.emit('dismiss_card', { roomId });
    };

    const handleExit = () => {
        if (window.confirm("Вы уверены, что хотите выйти? Если вы организатор, комната будет удалена.")) {
            socket.emit('leave_room', { roomId });
            router.push('/lobby');
        }
    };

    const handleEnterFastTrack = () => {
        if (!localPlayer) return;
        socket.emit('enter_fast_track', { roomId, userId: localPlayer?.id });
    };

    const handleEndGame = () => {
        if (!localPlayer) return;
        if (window.confirm("Вы уверены, что хотите принудительно завершить игру и подсчитать рейтинги?")) {
            socket.emit('host_end_game', { roomId, userId: localPlayer?.userId || localPlayer?.id });
        }
    };

    const handleKickPlayer = (playerId: string) => {
        if (!localPlayer) return;
        if (!window.confirm("Вы действительно хотите удалить этого игрока из игры?")) return;
        socket.emit('kick_player', { roomId, playerId, userId: localPlayer.userId || localPlayer.id });
    };

    const handleForceSkip = () => {
        if (!localPlayer) return;
        if (!window.confirm("Принудительно завершить ход текущего игрока?")) return;
        socket.emit('host_skip_turn', { roomId, userId: localPlayer?.userId || localPlayer?.id });
    };

    const handleTogglePause = () => {
        if (!localPlayer) return;
        socket.emit('admin_toggle_pause', { roomId, userId: localPlayer?.userId || localPlayer?.id });
    };

    // Correctly identify local player
    // PRIORITY: Socket ID -> User ID -> Matching Name (fallback if strictly necessary, but risky)
    const localPlayer = state.players.find((p: any) => p.id === socket.id || (userId && p.userId === userId));

    // Debug logging for identity issues
    useEffect(() => {
        if (!localPlayer) {
            console.warn('[Board] Failed to identify myself!', { socketId: socket.id, userId, players: state.players });
        } else {
            // Debug Balance Jumping
            console.log(`[Board] 👤 MY IDENTITY: ${localPlayer.name} ($${localPlayer.cash}) | 🎲 TURN: ${state.players[state.currentPlayerIndex]?.name}`);

            if (localPlayer.id !== state.players[state.currentPlayerIndex]?.id && localPlayer.cash === state.players[state.currentPlayerIndex]?.cash) {
                console.warn('[Board] ⚠️ SUSPICIOUS: My Balance matches Active Player Balance (coincidence?)');
            }
        }
    }, [localPlayer, state.players, userId, state.currentPlayerIndex]);

    // Sound Effects for Money
    useEffect(() => {
        if (!localPlayer) return;
        const prevCash = prevCashRef.current;
        if (prevCash !== undefined && localPlayer.cash > prevCash) {
            const diff = localPlayer.cash - prevCash;
            if (diff > 0) {
                sfx.play('payday');
            }
        }
        prevCashRef.current = localPlayer.cash;
    }, [localPlayer?.cash]);

    const isMyTurn = localPlayer && state.players[state.currentPlayerIndex]?.id === localPlayer.id;
    const currentTurnPlayer = state.players[state.currentPlayerIndex];
    const currentPlayer = currentTurnPlayer; // Alias for existing code
    const showExitButton = localPlayer ? !localPlayer.isFastTrack : false;

    // Handle "Spectator" or "Loading Identity" case
    if (!localPlayer) {
        // If we can't identify, we are either a spectator or loading.
        // For now, allow rendering but with limited functionality (or fallback strictly for display?)
        // Better to return a loading screen or show board as spectator.
        // But user reported "seeing other assets", so likely just removing the fallback fixes it.
        // We let it continue, `localPlayer` will be undefined.
        // We MUST guard `localPlayer.assets` access below.
    }


    // Calculate total asset yield
    // Calculate total asset yield
    const totalAssetYield = localPlayer?.assets?.reduce((sum: number, a: any) => sum + (a.cashflow || 0), 0) || 0;

    // Animation State for Visualizer
    const [animatingPos, setAnimatingPos] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!state?.players) return;
        const newPosMap: Record<string, number> = {};
        state.players.forEach((p: any) => {
            newPosMap[p.id] = animatingPos[p.id] ?? p.position;
        });
        setAnimatingPos(prev => ({ ...prev, ...newPosMap }));
    }, [state?.players]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimatingPos(prev => {
                const next = { ...prev };
                let changed = false;

                state?.players?.forEach((p: PlayerState) => {
                    const currentDisplayPos = prev[p.id] ?? p.position;

                    if (currentDisplayPos !== p.position) {
                        const max = p.isFastTrack ? 48 : 24;
                        // Move one step forward
                        // NOTE: This handles forward movement. If a player was reset back (e.g. 5 -> 0), 
                        // they will walk 5->6...->23->0. This is usually desired visual effect.
                        next[p.id] = (currentDisplayPos + 1) % max;
                        changed = true;
                    }
                });

                return changed ? next : prev;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [state?.players]);
    // Check if any player is currently animating (visual position != logical position)
    const isAnimatingMove = state?.players?.some((p: any) =>
        (animatingPos[p.id] !== undefined && animatingPos[p.id] !== p.position)
    ) || false;

    // Card Reveal Delay Logic
    const [canShowCard, setCanShowCard] = useState(false);

    useEffect(() => {
        // If we are moving or rolling, hide card
        if (state?.phase === 'ROLL' || isAnimatingMove) {
            setCanShowCard(false);
        } else {
            // User Request: Delay Expense/Market cards by 1s AFTER animation stops
            const type = state?.currentCard?.type || '';
            const isDelayedType = type.includes('EXPENSE') || type === 'DOODAD' || type.includes('MARKET');

            if (isDelayedType && !canShowCard) { // prevent loop if already true
                const timer = setTimeout(() => {
                    setCanShowCard(true);
                }, 1000); // 1s delay
                return () => clearTimeout(timer);
            } else if (!isDelayedType) {
                // Immediate show for other types (or if already shown)
                setCanShowCard(true);
            }
        }
    }, [state?.phase, isAnimatingMove, state?.currentCard]);

    // if (!currentTurnPlayer) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Загрузка игры...</div>;



    return (
        (!state || !currentTurnPlayer) ? (
            <div className="h-[100dvh] w-full bg-[#0f172a] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <span className="text-4xl animate-spin">🎲</span>
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                        {!state ? 'Загрузка состояния...' : 'Загрузка игры...'}
                    </span>
                </div>
            </div>
        ) : (
            <div className="h-[100dvh] max-h-[100dvh] bg-[#0f172a] text-white font-sans flex flex-col overflow-hidden relative">

                {/* PLAYER ACTION MENU (Skip, Kick, Gift) */}
                {selectedPlayerForMenu && (
                    <div className="absolute inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPlayerForMenu(null)}>
                        <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedPlayerForMenu(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-16 h-16 rounded-full border-2 border-slate-600 shadow-lg flex items-center justify-center text-2xl bg-gradient-to-br overflow-hidden ${getAvatarColor(selectedPlayerForMenu.id)}`}>
                                    {selectedPlayerForMenu.photo_url ? (
                                        <img src={selectedPlayerForMenu.photo_url} alt={selectedPlayerForMenu.name} className="w-full h-full object-cover" />
                                    ) : getInitials(selectedPlayerForMenu.name)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white max-w-[180px] break-words leading-tight">{selectedPlayerForMenu.name}</h3>
                                    <div className="text-sm text-emerald-400 font-mono mt-1">${selectedPlayerForMenu.cash?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* GIFT ACTION (Available to everyone) */}
                                {selectedPlayerForMenu.id !== localPlayer?.id ? (
                                    <button
                                        onClick={() => {
                                            setBankRecipientId(selectedPlayerForMenu.id);
                                            setSelectedPlayerForMenu(null);
                                            setShowBank(true);
                                        }}
                                        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                                    >
                                        <span>🎁</span> Подарить
                                    </button>
                                ) : (
                                    <div className="text-center text-xs text-slate-500 italic py-2">Это ваш профиль</div>
                                )}

                                {/* HOST ACTIONS */}
                                {isHost && selectedPlayerForMenu.id !== localPlayer?.id && (
                                    <>
                                        <div className="h-px bg-slate-700/50 my-2"></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    setAdminAction({ type: 'SKIP', player: selectedPlayerForMenu });
                                                    setSelectedPlayerForMenu(null);
                                                }}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors"
                                            >
                                                🚫 Пропустить
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAdminAction({ type: 'KICK', player: selectedPlayerForMenu });
                                                    setSelectedPlayerForMenu(null);
                                                }}
                                                className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/50 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors"
                                            >
                                                👢 Выгнать
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setAdminAction({ type: 'FORCE_MOVE', player: selectedPlayerForMenu });
                                                    setSelectedPlayerForMenu(null);
                                                }}
                                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors"
                                            >
                                                🎲 Ход за него
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAdminAction({ type: 'TRANSFER_DEAL', player: selectedPlayerForMenu });
                                                    setSelectedPlayerForMenu(null);
                                                }}
                                                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors"
                                            >
                                                🤝 Передать сделку
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setAdminAction({ type: 'GIFT', player: selectedPlayerForMenu });
                                                    setSelectedPlayerForMenu(null);
                                                }}
                                                className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors col-span-2"
                                            >
                                                💵 Подарить деньги
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}







                {/* 📱 MOBILE MENU OVERLAY */}
                {
                    showMobileMenu && (
                        <div className="lg:hidden absolute inset-0 z-[60] bg-[#0f172a]/95 backdrop-blur-xl p-4 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-left duration-300">
                            {/* Profile Section */}
                            <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg relative">
                                {/* CLOSE BUTTON */}
                                <button
                                    onClick={() => setShowMobileMenu(false)}
                                    className="absolute top-4 right-4 p-2 -mr-2 -mt-2 text-slate-500 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-4xl">👷</span>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Профессия</span>
                                        <div className="text-xl font-bold text-white">
                                            {localPlayer.professionName === 'Entrepreneur' || localPlayer.professionName === 'ENTREPRENEUR' ? 'Предприниматель' :
                                                (localPlayer.professionName === 'Engineer' || localPlayer.professionName === 'ENGINEER' ? 'Инженер' : localPlayer.professionName)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Баланс</div>
                                        <div className="font-mono text-xl text-green-400 font-bold">${localPlayer.cash?.toLocaleString()}</div>
                                    </div>
                                    <div onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-xl border border-slate-800 relative">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Кредит</div>
                                        <div className="font-mono text-xl text-red-400 font-bold">${localPlayer.loanDebt?.toLocaleString()}</div>
                                        {isTutorial && state.tutorialStep === 3 && (
                                            <TutorialTip
                                                text="Банк / Кредиты"
                                                position="top-full mt-2 left-1/2 -translate-x-1/2"
                                                arrow="top-[-6px] border-b-emerald-500 border-t-0"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800/50 mb-3">
                                    <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Пассивный доход</div>
                                        <div className="font-mono text-green-400 font-medium">+${localPlayer.passiveIncome?.toLocaleString() || 0}</div>
                                    </div>
                                    <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Денежный поток</div>
                                        <div className="font-mono text-green-400 font-medium">+${localPlayer.cashflow?.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Доход</div>
                                        <div className="font-mono text-slate-300 font-medium">${localPlayer.income?.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-[#0B0E14]/30 p-2.5 rounded-lg border border-slate-800/50">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Расходы</div>
                                        <div className="font-mono text-slate-300 font-medium">${localPlayer.expenses?.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Payday / Cashflow Status Bar */}
                                <div className="bg-[#0B0E14]/50 p-4 rounded-xl border border-l-4 border-l-green-500 mb-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl -mr-8 -mt-8"></div>
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">PAYDAY (Денежный поток)</span>
                                            <div className="text-2xl font-mono text-green-400 font-bold tracking-tight">
                                                +${(localPlayer.cashflow || 0).toLocaleString()} <span className="text-xs text-slate-500 font-normal">/мес</span>
                                            </div>
                                        </div>
                                        <div className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">💰</div>
                                    </div>
                                    <div className="w-full bg-slate-800/50 h-1.5 mt-3 rounded-full overflow-hidden">
                                        {/* Progress visual: ratio of passive to expenses? or just filled */}
                                        {localPlayer.isFastTrack ? (
                                            // FAST TRACK PROGRESS
                                            <>
                                                <div className="w-full bg-slate-800/50 h-1.5 mt-3 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                                        style={{ width: `${Math.min(100, (localPlayer.cashflow / 50000) * 100)}%` }} // Rough estimate if no start captured
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[9px] text-slate-500">Цель: +$50,000 (Нужно еще)</span>
                                                    <span className="text-[9px] text-pink-400 font-bold">
                                                        ${Math.max(0, 50000 - (localPlayer.passiveIncome - (localPlayer.fastTrackStartIncome || 0))).toLocaleString()}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            // RAT RACE PROGRESS
                                            <>
                                                <div className="w-full bg-slate-800/50 h-1.5 mt-3 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                        style={{ width: `${Math.min(100, (localPlayer.passiveIncome / Math.max(1, localPlayer.expenses)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[9px] text-slate-500">Финансовая свобода</span>
                                                    <span className="text-[9px] text-green-400 font-bold">{Math.floor((localPlayer.passiveIncome / Math.max(1, localPlayer.expenses)) * 100)}%</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Assets Section */}
                                <div id="tutorial-assets" className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2"><span>🏠</span> Ваши Активы</span>
                                        <span className="font-mono text-green-400">+${totalAssetYield}</span>
                                    </h3>

                                    {/* TUTORIAL ONLY: Get Asset Button */}
                                    {isTutorial && (
                                        <button
                                            onClick={() => socket.emit('tutorial_add_asset', { roomId })}
                                            className="w-full mb-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold py-2 rounded-lg text-xs uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                        >
                                            🎲 Получить актив (Обучение)
                                        </button>
                                    )}

                                    {localPlayer.assets?.length > 0 ? (
                                        <div className="space-y-2">
                                            {localPlayer.assets.map((a: any, i: number) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setTransferAssetItem({ item: a, index: i })}
                                                    className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 cursor-pointer hover:border-slate-500 active:scale-[0.98] transition-all"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-300 font-medium">
                                                            {a.title}
                                                        </span>
                                                        {a.quantity > 0 && (
                                                            <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                                                <span className="bg-slate-800 px-1.5 rounded">{a.quantity} шт</span>
                                                                {a.cost && <span className="text-slate-500">Позиция: ${(a.cost * a.quantity).toLocaleString()}</span>}
                                                            </div>
                                                        )}
                                                        <span className="font-mono text-green-400 font-bold text-[10px]">+$ {a.cashflow}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setTransferAssetItem({ item: a, index: i })}
                                                        className="ml-2 p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-500 hover:text-blue-400"
                                                        title="Передать актив"
                                                    >
                                                        ➡️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-xs text-slate-600 text-center py-4 italic">Нет активов</div>}
                                </div>

                                {/* Players List Section */}
                                <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                                        <span>👥</span> Игроки
                                    </h3>
                                    <div className="space-y-2">
                                        {state.players.map((p: any) => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    console.log("Player clicked:", p.name, p.id);
                                                    setSelectedPlayerForMenu(p);
                                                }}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:border-slate-500 active:scale-[0.98]
                                            ${p.id === currentPlayer.id ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-slate-900/30 border-slate-800/50'}
                                            ${p.hasWon ? 'ring-2 ring-yellow-500' : ''}
                                            ${p.isBankrupted ? 'opacity-50 grayscale' : ''}
                                        `}
                                            >
                                                <div className={`text-lg w-10 h-10 flex items-center justify-center rounded-full border-2 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)] text-white font-bold bg-gradient-to-br relative ${getAvatarColor(p.id)}`}>
                                                    {p.photo_url ? (
                                                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getInitials(p.name)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="text-sm font-bold text-slate-200 truncate flex items-center gap-2">
                                                            {p.name}
                                                            {(p.skippedTurns || 0) > 0 && <span className="text-[10px] bg-red-900/50 text-red-200 px-1.5 py-0.5 rounded border border-red-500/30" title="Пропуск хода">⛔ {p.skippedTurns}</span>}
                                                        </div>
                                                        {p.id === currentPlayer.id && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Ходит</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                                                        <span>${p.cash?.toLocaleString()}</span>
                                                        {p.loanDebt > 0 && <span className="text-red-400">-${p.loanDebt?.toLocaleString()}</span>}
                                                    </div>
                                                </div>

                                                {/* Host Hint */}
                                                {isHost && (
                                                    <div className="text-slate-600">⋮</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Logs Section (Mobile) */}
                                <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg">
                                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                                        <span>📝</span> Лог событий
                                    </h3>
                                    <div className="bg-[#0B0E14]/30 rounded-xl border border-slate-800/50 p-3 overflow-y-auto font-mono text-[9px] space-y-2 custom-scrollbar h-[150px]">
                                        {state.log?.slice().reverse().map((entry: string, i: number) => (
                                            <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-2 last:border-0 leading-relaxed">
                                                <span className="text-slate-600 mr-2">#{state.log.length - i}</span>
                                                {entry}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Chat Input */}
                                    <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
                                        <input
                                            type="text"
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            placeholder="Сообщение..."
                                            className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatMessage.trim()}
                                            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            ➤
                                        </button>
                                    </form>
                                </div>

                                {/* Rules Button in Menu */}
                                <button
                                    onClick={() => setShowRules(true)}
                                    className="w-full py-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold uppercase tracking-widest text-sm hover:bg-violet-500/20 active:bg-violet-500/30 transition-all flex items-center justify-center gap-3"
                                >
                                    <span>📜</span> Правила
                                    {isTutorial && showRules && <TutorialTip text="Прочитайте и закройте" position="bottom-full mb-2" arrow="bottom-[-6px] border-t-emerald-500 border-b-0" />}
                                </button>

                                {/* Sound Settings in Mobile Menu */}
                                <div className="bg-[#1e293b] rounded-2xl p-5 border border-slate-700/50 shadow-lg mb-4">
                                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                                        <span>🔊</span> Звук
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <button onClick={toggleMute} className="p-2 bg-slate-800 rounded-lg text-white">
                                            {isMuted ? '🔇' : '🔊'}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={volume}
                                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* NEW: MOBILE SETTINGS ACTIONS */}
                                <div className="flex flex-col gap-2 mt-4 pb-8">
                                    <button
                                        onClick={() => {
                                            setShowMobileMenu(false);
                                            setForceLandscape(!forceLandscape);
                                        }}
                                        className="w-full py-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center gap-3 transition-colors uppercase tracking-widest text-xs"
                                    >
                                        <span className="text-xl">🔄</span> Перевернуть экран
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowMobileMenu(false);
                                            setShowMenuModal(true);
                                        }}
                                        className="w-full py-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                    >
                                        <span>⚙️</span> Полные Настройки
                                    </button>

                                    {isHost && (
                                        <button
                                            onClick={() => {
                                                setShowMobileMenu(false);
                                                handleTogglePause();
                                            }}
                                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2
                                                ${state.isPaused ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}
                                        >
                                            <span>{state.isPaused ? '▶️' : '⏸'}</span>
                                            <span>{state.isPaused ? 'ПРОДОЛЖИТЬ' : 'ПАУЗА'}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Exit Button in Menu */}
                                <button
                                    onClick={handleExit}
                                    className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest text-sm hover:bg-red-500/20 active:bg-red-500/30 transition-all flex items-center justify-center gap-3"
                                >
                                    <span>🚪</span> Выйти из игры
                                </button>

                                {/* Spacer for bottom nav */}
                                <div className="h-20"></div>
                            </div>
                        </div>
                    )
                }







                {/* MAIN GRID */}
                {/* MAIN LAYOUT CONTAINER - FLEXBOX for Aspect Ratio Control */}
                <div className="flex-1 w-full max-w-[1920px] mx-auto p-0 lg:p-4 flex flex-col lg:flex-row gap-0 lg:gap-4 h-full overflow-hidden justify-start lg:justify-center items-center">

                    {/* 📱 MOBILE TOP ZONE (Cards + Stats) */}
                    <div className="lg:hidden w-full bg-[#1e293b]/90 backdrop-blur-md border-b border-white/5 p-2 flex flex-col gap-2 shrink-0 z-40 max-h-[30vh] overflow-y-auto">

                        {/* 1. Status Row (Top Priority) */}
                        <div className="flex items-center justify-between px-1 bg-slate-800/50 p-2 rounded-xl mb-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${state.turnExpiresAt && (new Date(state.turnExpiresAt).getTime() - Date.now()) / 1000 < 15 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-400 uppercase font-bold leading-none">Ход</span>
                                    <span className="font-bold text-white text-sm max-w-[150px] truncate leading-tight">{currentPlayer?.name}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <GameTimer
                                    expiresAt={state.turnExpiresAt}
                                    currentTurnTime={state.currentTurnTime}
                                    className="font-mono font-black text-2xl text-white"
                                />
                            </div>
                        </div>

                        {/* 2. Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div onClick={() => setShowBank(true)} className="bg-[#0f172a]/80 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 shadow-sm cursor-pointer active:scale-95 transition-transform relative">
                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Баланс</span>
                                <span className="text-sm font-black text-green-400 font-mono tracking-tight">${localPlayer?.cash?.toLocaleString() || 0}</span>
                                {isTutorial && state.tutorialStep === 3 && (
                                    <TutorialTip
                                        text="Нажмите на банк"
                                        position="top-full mt-2 left-1/2 -translate-x-1/2 absolute z-[3000] w-[200px]"
                                        arrow="top-[-6px] border-b-emerald-500 border-t-0"
                                    />
                                )}
                            </div>
                            <div className="bg-[#0f172a]/80 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 shadow-sm">
                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Выплата</span>
                                <span className="text-sm font-black text-green-400 font-mono tracking-tight">+${(localPlayer?.cashflow || 0).toLocaleString()}</span>
                            </div>
                            <div onClick={() => setShowBank(true)} className="bg-[#0f172a]/80 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 shadow-sm cursor-pointer active:scale-95 transition-transform relative">
                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Кредит</span>
                                <span className="text-sm font-black text-red-400 font-mono tracking-tight">-${localPlayer?.loanDebt?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* LEFT SIDEBAR - PLAYER INFO (Fills remaining space) */}
                    <div className="hidden lg:flex flex-col gap-4 h-full overflow-hidden w-[350px] pt-0 shrink-0">

                        {/* 1. PROFILE PANEL (TOP) */}
                        <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-700/50 shadow-2xl flex flex-col gap-4 relative overflow-hidden group shrink-0">
                            {/* Glow effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-500"></div>

                            {/* Header: Profession + Payday */}
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl filter drop-shadow-md">👷</span>
                                    <div>
                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Профессия</span>
                                        <div className="text-lg font-bold text-white leading-tight tracking-tight max-w-[140px] truncate" title={localPlayer?.professionName || ''}>{localPlayer?.professionName || 'Загрузка...'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Payday Bar */}
                            <div className="bg-[#0B0E14]/50 p-3 rounded-2xl border border-slate-800/80 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">PAYDAY</span>
                                    <span className="font-mono text-green-400 font-bold text-lg leading-none">+${(localPlayer?.cashflow || 0).toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: '100%' }} // Always full for Cashflow? Or progress?
                                    ></div>
                                </div>
                            </div>

                            {/* Stats Grid: Cash & Credit */}
                            <div className="grid grid-cols-2 gap-3" id="tutorial-balance">
                                <button onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-2xl border border-slate-800 hover:bg-slate-800 hover:border-green-500/30 transition-all text-left group/btn relative">
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Баланс 🏦</div>
                                    <div className="font-mono text-xl text-green-400 font-black tracking-tight group-hover/btn:scale-105 transition-transform origin-left relative">
                                        <AnimatedNumber value={localPlayer?.cash || 0} />
                                        <CashChangeIndicator currentCash={localPlayer?.cash || 0} />
                                    </div>
                                    {isTutorial && state.tutorialStep === 3 && (
                                        <TutorialTip
                                            text="Нажмите на банк"
                                            position="top-full mt-4 left-1/2 -translate-x-1/2 absolute z-[3000] w-[200px]"
                                            arrow="top-[-6px] border-b-emerald-500 border-t-0"
                                        />
                                    )}
                                </button>
                                <button onClick={() => setShowBank(true)} className="bg-[#0B0E14]/50 p-3 rounded-2xl border border-slate-800 hover:bg-slate-800 hover:border-red-500/30 transition-all text-left group/btn">
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Кредит 💳</div>
                                    <div className="font-mono text-xl text-red-400 font-black tracking-tight group-hover/btn:scale-105 transition-transform origin-left">
                                        ${localPlayer?.loanDebt?.toLocaleString() || 0}
                                    </div>
                                </button>
                            </div>

                            {/* Income/Expense Mini Grid */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Доход</span>
                                    <span className="font-mono text-slate-300 font-bold">${localPlayer?.income?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setShowExpenseBreakdown(true)}
                                            className="w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-[10px] text-slate-300 transition-colors"
                                        >
                                            ?
                                        </button>
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">Расходы</span>
                                    </div>
                                    <span className="font-mono text-slate-400 font-bold">${localPlayer?.expenses?.toLocaleString() || 0}</span>
                                </div>
                            </div>

                        </div>

                        {/* 2. ASSETS PANEL (BOTTOM, Fills Remaining) */}
                        <div className="bg-[#151b2b] rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col min-h-0 flex-1 relative overflow-hidden">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 flex items-center justify-between gap-2 flex-shrink-0">
                                <span className="flex items-center gap-2"><span>🏠</span> Ваши Активы</span>
                                <span className="font-mono text-green-400 bg-green-900/20 px-2 py-0.5 rounded-lg">+${totalAssetYield}</span>
                            </h3>

                            {localPlayer?.assets?.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 -mr-2">
                                    {localPlayer.assets.map((a: any, i: number) => (
                                        <div
                                            key={i}
                                            onClick={() => setTransferAssetItem({ item: a, index: i })}
                                            className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 hover:border-slate-500 active:scale-[0.98] transition-all cursor-pointer group"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className="text-slate-200 font-bold text-sm leading-tight">
                                                    {a.title}
                                                </span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    {a.quantity > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{a.quantity} шт</span>}
                                                    {a.symbol && a.averageCost && <span className="text-blue-400">Ср: ${a.averageCost.toFixed(2)}</span>}
                                                    {a.cost && <span>Поз: ${(a.cost * a.quantity).toLocaleString()}</span>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-mono text-green-400 font-black text-xs">+${a.cashflow}</span>
                                                <button
                                                    className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                                    title="Передать актив"
                                                >
                                                    Передать
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic gap-2 opacity-50">
                                    <span className="text-3xl grayscale">📉</span>
                                    <span className="text-xs">Нет активов</span>
                                </div>
                            )}
                        </div>

                        {/* 3. MENU BUTTON (Fixed Bottom Sidebar) */}
                        <button
                            id="tutorial-menu"
                            onClick={() => setShowMenuModal(true)}
                            className="bg-[#1e293b] hover:bg-slate-700 text-slate-300 py-4 rounded-3xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-slate-700/50 shadow-lg hover:shadow-xl hover:border-slate-600 group shrink-0"
                        >
                            <span className="text-xl group-hover:rotate-90 transition-transform duration-500">⚙️</span>
                            <span>Меню Игры</span>
                        </button>

                    </div>

                    {/* CENTER BOARD (Responsive Square) */}
                    <div className={`${forceLandscape ? 'w-auto h-full' : 'w-full lg:w-auto lg:h-full'} aspect-square max-w-full flex-shrink-0 relative bg-[#0f172a] overflow-hidden flex flex-col lg:rounded-3xl lg:border border-slate-800/50 shadow-2xl max-h-full`}>
                        <div className="flex-1 relative overflow-hidden p-0 lg:p-4 flex items-center justify-center">
                            <ErrorBoundary name="BoardVisualizer">
                                <BoardVisualizer
                                    board={state.board}
                                    players={state.players}
                                    animatingPos={animatingPos}
                                    currentPlayerId={currentPlayer.id}
                                    zoom={zoom}
                                    onSquareClick={(sq: any) => setSquareInfo(sq)}
                                    showExitButton={showExitButton}
                                    onExitClick={() => {
                                        setHasClickedFastTrack(true);
                                        if (localPlayer?.isFastTrack) {
                                            setShowFastTrackInfo(true);
                                        } else {
                                            setShowFastTrackModal(true);
                                        }
                                    }}
                                    isTutorial={isTutorial}
                                    hideFastTrackHint={hasClickedFastTrack}
                                />
                            </ErrorBoundary>

                            {/* ActiveCardZone Overlay - Center */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-6 py-2 z-[60]">
                                <div className="pointer-events-auto w-full max-w-xl mx-auto">
                                    <ErrorBoundary name="ActiveCardZone">
                                        <ActiveCardZone
                                            state={state}
                                            isMyTurn={isMyTurn}
                                            me={localPlayer}
                                            roomId={roomId}
                                            onDismissMarket={handleDismissCard}
                                            onMarketCardClick={(card) => setSquareInfo({
                                                type: 'MARKET',
                                                card: card.card,
                                                title: card.card.title,
                                                description: card.card.description
                                            })}
                                            // Fix Animation Sync: Don't show card while animating move or rolling dice
                                            canShowCard={canShowCard && !isAnimating && !showDice}
                                            previewCard={squareInfo?.card ? squareInfo : null}
                                            onDismissPreview={() => setSquareInfo(null)}
                                            // Force remount on tutorial step change to avoid hook consistency issues
                                            key={`acz-${isTutorial ? state.tutorialStep : 'main'}`}
                                            isTutorial={isTutorial}
                                            tutorialStep={state.tutorialStep}
                                        />
                                    </ErrorBoundary>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR (Redesigned) - Flex Column */}
                    <div id="tutorial-players" className="hidden lg:flex flex-col w-[350px] h-full bg-[#0f172a]/50 relative z-40 overflow-hidden shrink-0 pt-0 gap-4">

                        {/* 1. TURN INFO & TIMER */}
                        <div id="tutorial-turn-timer" className="bg-[#151b2b] rounded-3xl p-6 border border-slate-800 shadow-lg flex items-center justify-between shrink-0">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${state.turnExpiresAt && (new Date(state.turnExpiresAt).getTime() - Date.now()) / 1000 < 15 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ХОД ИГРОКА</span>
                                </div>
                                <div className="text-xl font-black text-white leading-none truncate max-w-[180px]">{currentPlayer.name}</div>
                            </div>
                            <GameTimer
                                expiresAt={state.turnExpiresAt}
                                currentTurnTime={state.currentTurnTime}
                                className="text-4xl font-mono font-black text-slate-200"
                            />
                        </div>

                        {/* 2. GAME CONTROLS GRID (Dice & Skip) */}
                        {/* 2. GAME CONTROLS GRID (Dice & Skip) */}
                        <div id="tutorial-roll-action" className="grid grid-cols-2 gap-3 shrink-0 h-[100px]">
                            {(() => {
                                // Manual Draw Phases
                                if (state.phase === 'MARKET_WAITING') {
                                    return (
                                        <button
                                            onClick={() => socket.emit('draw_card', { roomId, type: 'MARKET' })}
                                            disabled={!isMyTurn}
                                            className="col-span-2 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-xl font-black uppercase tracking-widest"
                                        >
                                            <span>🏪</span>
                                            <span>Открыть Рынок</span>
                                        </button>
                                    );
                                }
                                if (state.phase === 'OPPORTUNITY_CHOICE') {
                                    return (
                                        <>
                                            <button
                                                onClick={() => socket.emit('draw_deal', { roomId, type: 'SMALL' })}
                                                disabled={!isMyTurn || (localPlayer?.cash || 0) < 0} // Allow even if low cash, engine checks cost? Small Deal usually cost $0 to draw but >0 to buy.
                                                className="rounded-3xl bg-green-700 hover:bg-green-600 text-white flex flex-col items-center justify-center gap-1 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                <span className="text-xl">🟢</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Small Deal</span>
                                                <span className="text-[9px] opacity-70">Cost &lt; $5k</span>
                                            </button>
                                            <button
                                                onClick={() => socket.emit('draw_deal', { roomId, type: 'BIG' })}
                                                disabled={!isMyTurn || (localPlayer?.cash || 0) < 6000} // Big Deal requires $6000 cash at hand usually? Rule: "You can only do Big Deal if you have $6000"
                                                className={`rounded-3xl flex flex-col items-center justify-center gap-1 shadow-lg transition-all
                                        ${(localPlayer?.cash || 0) >= 6000
                                                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white hover:scale-[1.02] active:scale-95'
                                                        : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}
                                            >
                                                <span className="text-xl">🟡</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Big Deal</span>
                                                <span className="text-[9px] opacity-70">Cost &gt; $6k</span>
                                            </button>
                                        </>
                                    );
                                }
                                if (state.phase === 'EXPENSE_WAITING') {
                                    return (
                                        <button
                                            onClick={() => socket.emit('draw_card', { roomId, type: 'EXPENSE' })}
                                            disabled={!isMyTurn}
                                            className="col-span-2 rounded-3xl bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-xl font-black uppercase tracking-widest"
                                        >
                                            <span>💸</span>
                                            <span>Открыть Трату</span>
                                        </button>
                                    );
                                }

                                const diceCount = (localPlayer?.charityTurns > 0 || localPlayer?.isFastTrack) ? 2 : 1;
                                return (
                                    <>
                                        {/* ROLL BUTTON (Left, Big) */}
                                        <button
                                            onClick={() => handleRoll()}
                                            disabled={!isMyTurn || state.phase !== 'ROLL' || isRollingRef.current}
                                            className={`rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all shadow-xl relative overflow-hidden group
                                ${isMyTurn && state.phase === 'ROLL' && !isRollingRef.current
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50 text-white hover:scale-[1.02] active:scale-95'
                                                    : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed opacity-50'}`}
                                        >
                                            <span className="text-3xl group-hover:rotate-12 transition-transform">🎲</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {diceCount > 1 ? `Бросить (${diceCount})` : 'Бросить'}
                                            </span>
                                            {(isTutorial && isMyTurn && state.phase === 'ROLL' && state.tutorialStep <= 1) && (
                                                <TutorialTip
                                                    text={state.tutorialStep === 0 ? "1. Бросайте кубик, чтобы ходить" : "7. Бросьте кубик снова!"}
                                                    position="right-full mr-4 top-1/2 -translate-y-1/2"
                                                    arrow="right-[-6px] border-l-emerald-500 border-r-0 border-y-transparent border-y-[6px] top-1/2 -translate-y-1/2"
                                                />
                                            )}
                                            {/* Dice Value Overlay */}
                                            {showDice && diceValue && (
                                                <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center z-10 animate-in fade-in zoom-in duration-200">
                                                    <span className="text-4xl font-black text-white">{diceValue}</span>
                                                    {diceBreakdown && <span className="text-xs font-mono text-emerald-200 font-bold mt-1">({diceBreakdown})</span>}
                                                </div>
                                            )}
                                        </button>

                                        {/* SKIP / NEXT BUTTON (Right, Big) */}
                                        <button
                                            onClick={handleEndTurn}
                                            disabled={!isMyTurn || (state.phase === 'ROLL') || isAnimating}
                                            className={`rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all shadow-xl relative
                                 ${isMyTurn && state.phase !== 'ROLL' && !isAnimating
                                                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-500/50 text-white hover:scale-[1.02] active:scale-95'
                                                    : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed opacity-50'}`}
                                        >
                                            <span className="text-3xl">⏭</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Далее</span>
                                            {isTutorial && isMyTurn && (state.phase === 'ACTION' || state.phase === 'MARKET' || state.phase === 'RESOLVE') && (
                                                <TutorialTip
                                                    text="Нажмите, чтобы продолжить"
                                                    position="top-full mt-4"
                                                    arrow="top-[-6px] border-b-emerald-500 border-t-0"
                                                />
                                            )}
                                        </button>
                                    </>
                                );
                            })()}
                        </div>

                        {/* BANK BUTTON (Desktop) */}
                        <button
                            ref={desktopBankButtonRef}
                            onClick={() => setShowBank(true)}
                            className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shrink-0 mb-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white relative"
                        >
                            <span className="text-lg">🏦</span>
                            <span>БАНК</span>
                            {isTutorial && state.tutorialStep === 3 && (
                                <PortalTutorialTip
                                    text="Нажмите Банк 🏦"
                                    targetRef={desktopBankButtonRef}
                                    position="left"
                                    offset={16}
                                />
                            )}
                        </button>

                        {/* DESKTOP SKIP / PAUSE TOGGLE */}
                        {
                            !localPlayer?.isBankrupted && (
                                <button
                                    onClick={() => socket.emit('toggle_skip_turns', { roomId, userId })}
                                    className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shrink-0
                                    ${localPlayer.isSkippingTurns
                                            ? 'bg-blue-600 hover:bg-blue-500 text-white animate-pulse'
                                            : 'bg-slate-800 hover:bg-indigo-600/50 border border-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    <span className="text-sm">{localPlayer.isSkippingTurns ? '▶️' : '⏸'}</span>
                                    <span>{localPlayer.isSkippingTurns ? 'ВЕРНУТЬСЯ В ИГРУ' : 'ОТОЙТИ (AFK)'}</span>
                                </button>
                            )
                        }

                        {/* HOST PAUSE CONTROL */}
                        {
                            isHost && (
                                <button
                                    onClick={handleTogglePause}
                                    className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shrink-0 mb-2
                                    ${state.isPaused
                                            ? 'bg-blue-600 hover:bg-blue-500 text-white animate-pulse'
                                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    <span className="text-sm">{state.isPaused ? '▶️' : '⏸'}</span>
                                    <span>{state.isPaused ? 'RESUME GAME' : 'PAUSE GAME'}</span>
                                </button>
                            )
                        }

                        {/* 3. PLAYERS GRID (Small Cards) */}
                        <div className="grid grid-cols-2 gap-2 shrink-0 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {state.players.filter((p: any) => p.id !== localPlayer?.id).map((p: any) => {
                                const isCurrent = p.id === currentPlayer.id;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedPlayerForMenu(p)}
                                        className={`bg-[#1e293b] rounded-2xl p-2.5 border flex items-center gap-3 cursor-pointer hover:border-slate-500 transition-all
                                        ${isCurrent ? 'border-green-500 ring-1 ring-green-500/20 shadow-lg shadow-green-900/10' : 'border-slate-700/50'}
                                    `}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${getAvatarColor(p.id)}`}>
                                            {p.photo_url ? <img src={p.photo_url} className="w-full h-full rounded-full object-cover" /> : getInitials(p.name)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-200 truncate">{p.name}</span>
                                            <span className="text-[10px] text-green-400 font-mono">${p.cash?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Placeholder for "Myself" if I want to see localPlayer in list? Probably duplicate. User asked for "Players" grid. */}
                            <div
                                className="bg-[#1e293b]/50 rounded-2xl p-2.5 border border-slate-700/30 flex items-center justify-center gap-2 text-slate-500 italic text-[10px] cursor-help"
                                title="Это вы"
                            >
                                <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">👤</span>
                                <span>Вы (Баланс выше)</span>
                            </div>
                        </div>

                        {/* 4. CHAT (Fills remaining) */}
                        <div className="flex-1 bg-[#1e293b] rounded-3xl border border-slate-700/50 overflow-hidden flex flex-col shadow-inner relative">
                            <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#1e293b] to-transparent z-10 pointer-events-none"></div>

                            <div className="flex-1 overflow-hidden relative">
                                <TextChat
                                    roomId={roomId}
                                    socket={socket}
                                    messages={state.chat || []}
                                    currentUser={localPlayer}
                                    gameLogs={state.log || []}
                                    className="w-full h-full"
                                />
                            </div>

                            {/* Chat Input Area Inside TextChat Usually, but if TextChat handles it, good. 
                            Wait, TextChat typically has input. 
                            Let's check TextChat usage previously.
                            It was just <TextChat ... />. 
                            So it should be self-contained. 
                        */}
                        </div>

                        {
                            state.isPaused && (
                                <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                                    <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center max-w-md w-full text-center">
                                        <div className="text-6xl mb-4 animate-bounce">⏸</div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Game Paused</h2>
                                        <p className="text-slate-400 mb-8">Игра приостановлена администратором. Пожалуйста, ожидайте.</p>

                                        {isHost && (
                                            <button
                                                onClick={handleTogglePause}
                                                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                ▶️ Resume Game
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                    </div>



                    {/* 📱 MOBILE CONTROLS (Floating Bottom Bar) */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 pt-2 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 z-[150] flex flex-col gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">

                        {/* 1. MINI PLAYERS STRIP */}
                        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar px-1 pb-2">
                            {state.players.map((p: any) => {
                                const isCurrent = p.id === currentPlayer?.id;
                                const isMe = p.id === localPlayer?.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            if (isMe) {
                                                setShowBank(true);
                                            } else {
                                                setTransferTarget(p);
                                            }
                                        }}
                                        className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border shrink-0 transition-all cursor-pointer ${isCurrent
                                            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                            : 'bg-slate-800/50 border-slate-700'
                                            } active:scale-95`}
                                    >
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 relative">
                                                {(p.avatar || p.photo_url) ? (
                                                    <img src={p.avatar || p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold">{p.name?.[0]}</div>
                                                )}
                                            </div>
                                            {isCurrent && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>}
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className={`text-[10px] font-bold leading-none ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                                                {isMe ? 'Вы' : p.name}
                                            </span>
                                            <span className="text-[10px] font-mono text-green-400 leading-none">
                                                ${(p.cash || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 2. MAIN CONTROLS */}
                        <div className="flex gap-3">
                            {/* Roll / Action Logic */}
                            {state.phase === 'MARKET_WAITING' ? (
                                <button
                                    onClick={() => socket.emit('draw_card', { roomId, type: 'MARKET' })}
                                    disabled={!isMyTurn}
                                    className="flex-1 bg-blue-600 active:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <span className="text-2xl">🏪</span>
                                    <span>ОТКРЫТЬ</span>
                                </button>
                            ) : state.phase === 'OPPORTUNITY_CHOICE' ? (
                                <div className="flex gap-2 flex-1">
                                    <button
                                        onClick={() => socket.emit('draw_deal', { roomId, type: 'SMALL' })}
                                        disabled={!isMyTurn}
                                        className="flex-1 bg-green-700 active:bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all"
                                    >
                                        <span className="text-xl">🟢</span>
                                        <span>SMALL</span>
                                        <span className="text-[9px] opacity-80">{'< $5k'}</span>
                                    </button>
                                    <button
                                        onClick={() => socket.emit('draw_deal', { roomId, type: 'BIG' })}
                                        disabled={!isMyTurn || (localPlayer?.cash || 0) < 6000} // Rule Check
                                        className={`flex-1 rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all
                                        ${(localPlayer?.cash || 0) >= 6000
                                                ? 'bg-yellow-600 active:bg-yellow-500 text-white'
                                                : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                    >
                                        <span className="text-xl">🟡</span>
                                        <span>BIG</span>
                                        <span className="text-[9px] opacity-80">{'> $6k'}</span>
                                    </button>
                                </div>
                            ) : state.phase === 'EXPENSE_WAITING' ? (
                                <button
                                    onClick={() => socket.emit('draw_card', { roomId, type: 'EXPENSE' })}
                                    disabled={!isMyTurn}
                                    className="flex-1 bg-pink-600 active:bg-pink-500 text-white rounded-xl font-bold text-sm shadow-lg flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <span className="text-2xl">💸</span>
                                    <span>ОТКРЫТЬ</span>
                                </button>
                            ) : (localPlayer?.charityTurns || 0) > 0 && isMyTurn && state.phase === 'ROLL' && !hasRolled ? (
                                <div className="flex gap-2 flex-1 h-16">
                                    <button onClick={() => handleRoll(1)} className="flex-1 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                        <span className="text-xl">🎲</span>
                                        <span>1</span>
                                    </button>
                                    <button onClick={() => handleRoll(2)} className="flex-1 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                        <span className="text-xl">🎲🎲</span>
                                        <span>2</span>
                                    </button>
                                    {(localPlayer?.isFastTrack) && (
                                        <button onClick={() => handleRoll(3)} className="flex-1 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-1 transition-all">
                                            <span className="text-xl">🎲×3</span>
                                            <span>3</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleRoll()}
                                    disabled={!isMyTurn || (state.phase !== 'ROLL' && state.phase !== 'BABY_ROLL') || !!state.currentCard || hasRolled}
                                    className={`flex-1 h-16 rounded-xl border flex items-center justify-center gap-2 transition-all shadow-lg relative overflow-hidden
                                ${isMyTurn && (state.phase === 'ROLL' || state.phase === 'BABY_ROLL') && !state.currentCard && !hasRolled
                                            ? 'bg-emerald-600 active:bg-emerald-500 border-emerald-400/50 text-white shadow-emerald-900/30'
                                            : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'}`}
                                >
                                    {/* Dice Value Overlay - Mobile */}
                                    {showDice && diceValue && (
                                        <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center z-20 animate-in fade-in zoom-in duration-200">
                                            <span className="text-4xl font-black text-white leading-none">{diceValue}</span>
                                            {diceBreakdown && <span className="text-xs font-mono text-emerald-200 font-bold mt-1">({diceBreakdown})</span>}
                                        </div>
                                    )}

                                    {hasRolled ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-black">{diceValue}</span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Выпало</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-2xl">🎲</span>
                                            <span className="text-sm font-black uppercase tracking-widest">БРОСОК</span>
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleEndTurn}
                                disabled={
                                    !isMyTurn ||
                                    isAnimating ||
                                    state.phase === 'BABY_ROLL' ||
                                    (state.phase === 'ROLL' && !state.currentCard && !hasRolled)
                                }
                                className={`flex-1 h-16 rounded-xl border flex items-center justify-center gap-2 transition-all shadow-lg
                        ${isMyTurn && (state.phase !== 'ROLL' && state.phase !== 'BABY_ROLL' || !!state.currentCard || hasRolled) && !isAnimating && state.phase !== 'BABY_ROLL'
                                        ? 'bg-blue-600 active:bg-blue-500 border-blue-400/50 text-white shadow-blue-900/30'
                                        : 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'}`}
                            >
                                <span className="text-2xl">➡</span>
                                <span className="text-sm font-black uppercase tracking-widest">ДАЛЕЕ</span>
                            </button>

                            {/* Fast Track Button (Mobile) */}
                            {localPlayer?.canEnterFastTrack && isMyTurn && (
                                <button
                                    onClick={() => setShowFastTrackModal(true)}
                                    className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-lg animate-pulse"
                                >
                                    🚀
                                </button>
                            )}

                            {/* Sandbox Toggle Removed per user request */}

                            {/* BANK BUTTON (Mobile) */}
                            <button
                                onClick={() => setShowBank(true)}
                                className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-2xl transition-colors relative"
                            >
                                🏦
                                {isTutorial && state.tutorialStep === 3 && (
                                    <TutorialTip
                                        text="Нажмите Банк 🏦"
                                        position="bottom-full mb-3 left-1/2 -translate-x-1/2" // Adjusted to show ABOVE button
                                        arrow="bottom-[-6px] left-1/2 -translate-x-1/2 border-t-emerald-500 border-b-0"
                                    />
                                )}
                            </button>

                            {/* MENU TOGGLE */}
                            <button
                                onClick={() => setShowMobileMenu(true)}
                                className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-2xl"
                            >
                                🍔
                            </button>
                        </div>
                    </div>


                    {/* --- MODALS --- */}
                    <BankModal
                        isOpen={showBank}
                        onClose={() => { setShowBank(false); setBankRecipientId(''); }}
                        player={localPlayer}
                        roomId={roomId}
                        transactions={state.transactions || []}
                        players={state.players}
                        initialRecipientId={bankRecipientId}
                        isTutorial={isTutorial}
                    />

                    {
                        showMenuModal && (
                            <MenuModal
                                onClose={() => setShowMenuModal(false)}
                                onExit={handleExit}
                                onEndGame={() => socket.emit('end_game_host', { roomId, userId })}
                                toggleMute={toggleMute}
                                isMuted={isMuted}
                                volume={volume}
                                deckCounts={state.deckCounts}
                                greenBalance={partnershipUser?.greenBalance}
                                setVolume={handleVolumeChange}
                                onShowRules={() => setShowRules(true)}
                                zoom={zoom}
                                setZoom={setZoom}
                                isHost={!!isHost}
                                hasWinner={state.players.some((p: any) => p.hasWon)}
                                onSkipTurn={handleForceSkip}
                                onKickCurrent={() => handleKickPlayer(currentPlayer.id)}
                                onToggleOrientation={() => setForceLandscape(!forceLandscape)}
                                onCancelGame={() => {
                                    if (window.confirm("Вы уверены, что хотите отменить (удалить) игру? Все участники будут исключены.")) {
                                        socket.emit('delete_room', { roomId, userId: localPlayer?.userId || localPlayer?.id });
                                    }
                                }}
                            />
                        )
                    }

                    {
                        showRules && (
                            <RulesModal
                                onClose={() => setShowRules(false)}
                                isTutorial={isTutorial}
                                onConfirm={() => setShowRules(false)}
                            />
                        )
                    }

                    {showExpenseBreakdown && (
                        <ExpenseBreakdownModal
                            breakdown={localPlayer?.expenseBreakdown}
                            totalExpenses={localPlayer?.expenses || 0}
                            onClose={() => setShowExpenseBreakdown(false)}
                        />
                    )}

                    {
                        showFastTrackModal && (
                            <ExitToFastTrackModal
                                onClose={() => {
                                    console.log('[Board] Closing FastTrackModal, triggering step 3');
                                    setShowFastTrackModal(false);
                                    if (isTutorial) {
                                        console.log('[Board] Emitting set_tutorial_step: 3');
                                        socket.emit('set_tutorial_step', { roomId, step: 3 });
                                    }
                                }}
                                player={localPlayer}
                                onConfirm={() => {
                                    handleEnterFastTrack();
                                    setShowFastTrackModal(false);
                                    if (isTutorial) {
                                        socket.emit('set_tutorial_step', { roomId, step: 3 });
                                    }
                                }}
                            />
                        )
                    }

                    {showFastTrackInfo && <FastTrackInfoModal onClose={() => {
                        console.log('[Board] Closing FastTrackInfoModal, triggering step 3');
                        setShowFastTrackInfo(false);
                        if (isTutorial) {
                            console.log('[Board] Emitting set_tutorial_step: 3');
                            socket.emit('set_tutorial_step', { roomId, step: 3 });
                        }
                    }} player={localPlayer} />}

                    {
                        transferAssetItem && (
                            <TransferModal
                                isOpen={true}
                                onClose={() => setTransferAssetItem(null)}
                                asset={transferAssetItem.item}
                                players={state.players}
                                myId={localPlayer?.id}
                                onTransfer={handleTransferAsset}
                            />
                        )
                    }



                    {
                        adminAction && (
                            <AdminActionModal
                                isOpen={!!adminAction}
                                onClose={() => setAdminAction(null)}
                                type={adminAction.type}
                                targetPlayer={adminAction.player}
                                players={state.players}
                                onConfirm={(amount, targetId) => {
                                    if (adminAction.type === 'SKIP') {
                                        // Use 'userId' prop (Persistent ID) for permission check
                                        socket.emit('host_skip_turn', { roomId, userId }, (response: any) => {
                                            if (!response.success) {
                                                alert(`Ошибка: ${response.error}`);
                                            }
                                        });
                                    } else if (adminAction.type === 'KICK') {
                                        handleKickPlayer(adminAction.player.id);
                                    } else if (adminAction.type === 'GIFT' && amount) {
                                        // Use 'userId' prop for Host Auth, and adminAction.player.id as target
                                        socket.emit('host_give_cash', { roomId, userId, targetPlayerId: adminAction.player.id, amount }, (response: any) => {
                                            if (!response?.success) {
                                                console.error('Gift failed:', response?.error);
                                            }
                                        });
                                    } else if (adminAction.type === 'FORCE_MOVE') {
                                        socket.emit('host_force_move', { roomId, userId, targetPlayerId: adminAction.player.id });
                                    } else if (adminAction.type === 'TRANSFER_DEAL' && targetId) {
                                        socket.emit('host_transfer_deal', { roomId, userId, targetPlayerId: adminAction.player.id, recipientId: targetId });
                                    }
                                    setAdminAction(null);
                                }}
                            />
                        )
                    }
                    {
                        congratulateData && (
                            <CongratulateModal
                                isOpen={congratulateData.isOpen}
                                onClose={() => setCongratulateData(null)}
                                targetPlayerName={congratulateData.targetName}
                                targetPlayerId={congratulateData.targetId}
                                me={state.players.find((p: any) => p.id === socket.id) || state.players[0]}
                                roomId={roomId}
                                socket={socket}
                            />
                        )
                    }

                    {/* Victory Modal */}
                    {showVictory && victoryPlayer && (
                        <VictoryModal
                            player={victoryPlayer}
                            onClose={() => setShowVictory(false)}
                        />
                    )}

                    {showRankings && (
                        <RankingsModal
                            rankings={rankings}
                            onClose={() => router.push('/lobby')}
                            isOpen={showRankings} // Pass isOpen prop
                        />
                    )}

                    {transferTarget && (
                        <TransferCashModal
                            isOpen={!!transferTarget}
                            onClose={() => setTransferTarget(null)}
                            target={transferTarget}
                            maxCash={localPlayer?.cash || 0}
                            onTransfer={(amount) => {
                                socket.emit('transfer_cash', {
                                    roomId,
                                    fromUserId: localPlayer?.id, // Should use ID not index
                                    targetPlayerId: transferTarget.id,
                                    amount
                                });
                                setTransferTarget(null);
                            }}
                        />
                    )}

                    {/* Square Info Modal (Interactive Board Cells) */}
                    {squareInfo && !squareInfo.card && (
                        <SquareInfoModal
                            square={squareInfo}
                            onClose={() => setSquareInfo(null)}
                            player={localPlayer}
                            roomId={roomId}
                        />
                    )}
                </div>
            </div >
        )
    );
}

export default function GameBoard(props: BoardProps) {
    const [state, setState] = useState(props.initialState);

    // Initial State Sync
    useEffect(() => {
        console.log('🚀 MAIN BOARD COMPONENT MOUNTED - VERSION: FIX_HOOKS_V10 (Container/Content Split) 🚀');
        if (props.initialState) {
            setState(props.initialState);
        }
    }, [props.initialState]);

    // Derived check for loading
    const currentTurnPlayer = state?.players?.[state?.currentPlayerIndex];

    // Strict Loading Gate: Do not mount Content until we have valid state and player
    if (!state || !currentTurnPlayer) {
        return (
            <div className="h-[100dvh] w-full bg-[#0f172a] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <span className="text-4xl animate-spin">🎲</span>
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                        {!state ? 'Загрузка состояния...' : 'Загрузка игры...'}
                    </span>
                </div>
            </div>
        );
    }

    return <GameBoardContent {...props} state={state} setState={setState} />;
}

