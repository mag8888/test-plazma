import { IPlayer } from '../models/room.model';
import { v4 as uuidv4 } from 'uuid';
import { CardManager, Card } from './card.manager';
import { DbCardManager } from './db.card.manager';
import { PROFESSIONS } from './professions';

export interface GameState {
    roomId: string;
    creatorId?: string;
    players: PlayerState[];
    currentPlayerIndex: number;
    currentTurnTime: number;
    phase: 'ROLL' | 'ACTION' | 'END' | 'OPPORTUNITY_CHOICE' | 'CHARITY_CHOICE' | 'BABY_ROLL' | 'DOWNSIZED_DECISION';
    board: BoardSquare[];
    currentCard?: Card;
    log: string[];
    winner?: string;
    transactions: Transaction[];
    turnExpiresAt?: number;
    lastEvent?: { type: string, payload?: any };
    deckCounts?: {
        small: { remaining: number; total: number };
        big: { remaining: number; total: number };
        market: { remaining: number; total: number };
        expense: { remaining: number; total: number };
    };
    rankings?: { name: string; reason: string; place: number; id?: string; userId?: string }[];
    isGameEnded?: boolean;
    chat: ChatMessage[];
    activeMarketCards?: ActiveCard[];
}

export interface ActiveCard {
    id: string;
    card: Card;
    expiresAt: number;
    sourcePlayerId: string;
    dismissedBy?: string[]; // Player IDs who dismissed this card
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    avatar?: string;
}

export interface Transaction {
    id: string;
    timestamp: number;
    from: string; // Player Name or 'Bank'
    to: string;   // Player Name or 'Bank'
    amount: number;
    description: string;
    type: 'TRANSFER' | 'LOAN' | 'REPAY' | 'PAYDAY' | 'EXPENSE';
}

export interface PlayerState extends IPlayer {
    cash: number;
    cashflow: number;
    income: number;
    expenses: number;
    assets: any[];
    liabilities: any[];
    loanDebt: number; // Total bank loans
    position: number; // Square index (0-23 for Rat Race)
    isFastTrack: boolean;
    childrenCount: number;
    childCost: number;
    salary: number;
    passiveIncome: number;
    skippedTurns: number;
    charityTurns: number; // Turns remaining for extra dice
    canEnterFastTrack?: boolean;
    fastTrackStartIncome?: number;
    hasWon?: boolean;
    loanLimitFactor?: number; // 0.5 if bankrupted previously
}

export interface BoardSquare {
    index: number;
    type: 'DEAL' | 'MARKET' | 'EXPENSE' | 'PAYDAY' | 'BABY' | 'CHARITY' | 'DOWNSIZED' | 'DREAM' | 'BUSINESS' | 'LOSS' | 'STOCK_EXCHANGE' | 'LOTTERY';
    name: string;
    cost?: number;
    cashflow?: number;
    description?: string;
    action?: 'AUDIT' | 'THEFT' | 'DIVORCE' | 'FIRE' | 'RAID' | 'LOSE_TURN';
    ownerId?: string;
}

// Mock Board Configuration (Rat Race - 24 Squares)
export const RAT_RACE_SQUARES: BoardSquare[] = [
    { index: 0, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 1, type: 'EXPENSE', name: 'Doodad', description: 'Трата: Ненужные расходы.' },
    { index: 2, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 3, type: 'CHARITY', name: 'Charity', description: 'Благотворительность: Пожертвуйте 10% дохода для ускорения.' },
    { index: 4, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 5, type: 'PAYDAY', name: 'Payday', description: 'Деньги: Получите ваш месячный денежный поток.' },
    { index: 6, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 7, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' },
    { index: 8, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 9, type: 'EXPENSE', name: 'Doodad', description: 'Трата: Ненужные расходы.' },
    { index: 10, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 11, type: 'BABY', name: 'Baby', description: 'Ребенок: Новые расходы и радость в семье.' },
    { index: 12, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 13, type: 'PAYDAY', name: 'Payday', description: 'Деньги: Получите ваш месячный денежный поток.' },
    { index: 14, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 15, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' },
    { index: 16, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 17, type: 'EXPENSE', name: 'Doodad', description: 'Трата: Ненужные расходы.' },
    { index: 18, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 19, type: 'DOWNSIZED', name: 'Sick', description: 'Заболел: Пропуск 2 ходов и оплата расходов.' },
    { index: 20, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 21, type: 'PAYDAY', name: 'Payday', description: 'Деньги: Получите ваш месячный денежный поток.' },
    { index: 22, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 23, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' },
];

// 47 Items from User List (Mapped to Global Indices 24-70)
export const FAST_TRACK_SQUARES: BoardSquare[] = [
    // 1 (24) Geld/Payday
    { index: 24, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 2 (25) Dream
    { index: 25, type: 'DREAM', name: 'Дом мечты', cost: 100000, description: 'Построить дом мечты для семьи' },
    // 3 (26) Business
    { index: 26, type: 'BUSINESS', name: 'Кофейня', cost: 100000, cashflow: 3000, description: 'Кофейня в центре города' },
    // 4 (27) Loss (Audit)
    { index: 27, type: 'LOSS', name: 'Аудит', description: 'Налоговая проверка. Вы теряете 50% наличных.', action: 'AUDIT' },
    // 5 (28) Business
    { index: 28, type: 'BUSINESS', name: 'Центр здоровья и спа', cost: 270000, cashflow: 5000, description: 'Элитный спа-комплекс.' },
    // 6 (29) Dream
    { index: 29, type: 'DREAM', name: 'Посетить Антарктиду', cost: 150000, description: 'Экспедиция к Южному полюсу.' },
    // 7 (30) Business
    { index: 30, type: 'BUSINESS', name: 'Мобильное приложение', cost: 420000, cashflow: 10000, description: 'Сервис по подписке' },
    // 8 (31) Charity
    { index: 31, type: 'CHARITY', name: 'Благотворительность', description: 'Пожертвуйте 10% от общего дохода' },
    // 9 (32) Business
    { index: 32, type: 'BUSINESS', name: 'Агентство маркетинга', cost: 160000, cashflow: 4000, description: 'Агентство цифрового маркетинга' },
    // 10 (33) Loss (Theft)
    { index: 33, type: 'LOSS', name: 'Кража', description: 'Вас обокрали! Вы теряете 100% наличных.', action: 'THEFT' },
    // 11 (34) Business
    { index: 34, type: 'BUSINESS', name: 'Мини-отель', cost: 200000, cashflow: 5000, description: 'Бутик-гостиница' },
    // 12 (35) Payday
    { index: 35, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 13 (36) Business
    { index: 36, type: 'BUSINESS', name: 'Ресторан', cost: 320000, cashflow: 8000, description: 'Франшиза популярного ресторана' },
    // 14 (37) Dream
    { index: 37, type: 'DREAM', name: 'Высочайшие вершины', cost: 500000, description: 'Подняться на все высочайшие вершины мира' },
    // 15 (38) Business
    { index: 38, type: 'BUSINESS', name: 'Мини-отель', cost: 200000, cashflow: 4000, description: 'Бутик-гостиница' },
    // 16 (39) Dream
    { index: 39, type: 'DREAM', name: 'Автор бестселлера', cost: 300000, description: 'Стать автором книги-бестселлера' },
    // 17 (40) Business
    { index: 40, type: 'BUSINESS', name: 'Йога-центр', cost: 170000, cashflow: 4500, description: 'Йога- и медитационный центр' },
    // 18 (41) Loss (Divorce)
    { index: 41, type: 'LOSS', name: 'Развод', description: 'Раздел имущества. Вы теряете 50% наличных.', action: 'DIVORCE' },
    // 19 (42) Business
    { index: 42, type: 'BUSINESS', name: 'Автомойки', cost: 120000, cashflow: 3000, description: 'Сеть автомоек самообслуживания' },
    // 20 (43) Dream
    { index: 43, type: 'DREAM', name: 'Яхта в Средиземном', cost: 300000, description: 'Жить год на яхте в Средиземном море' },
    // 21 (44) Business
    { index: 44, type: 'BUSINESS', name: 'Салон красоты', cost: 500000, cashflow: 15000, description: 'Салон красоты / Барбершоп' },
    // 22 (45) Dream
    { index: 45, type: 'DREAM', name: 'Мировой фестиваль', cost: 200000, description: 'Организовать мировой фестиваль' },
    // 23 (46)
    { index: 46, type: 'LOSS', name: 'Пожар', description: 'Вы теряете бизнес с минимальным доходом.', action: 'FIRE' },
    // 24
    { index: 47, type: 'BUSINESS', name: 'Онлайн-магазин', cost: 110000, cashflow: 3000, description: 'Онлайн-магазин одежды' },
    // 25 (48)
    { index: 48, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 26 (49)
    { index: 49, type: 'DREAM', name: 'Фонд талантов', cost: 300000, description: 'Создать фонд поддержки талантов' },
    // 27 (50)
    { index: 50, type: 'BUSINESS', name: 'Ретрит-центр', cost: 500000, cashflow: 5000, description: 'Построить ретрит-центр' },
    // 28
    { index: 51, type: 'DREAM', name: 'Кругосветка', cost: 200000, description: 'Кругосветное плавание на паруснике' },
    // 29
    { index: 52, type: 'BUSINESS', name: 'Эко-ранчо', cost: 1000000, cashflow: 20000, description: 'Туристический комплекс (эко-ранчо)' },
    // 30
    { index: 53, type: 'DREAM', name: 'Кругосветка (Люкс)', cost: 300000, description: 'Кругосветное плавание на паруснике (Premium)' },
    // 31
    { index: 54, type: 'STOCK_EXCHANGE', name: 'Биржа', description: 'Бросьте кубик. Если выпадет 5 или 6, вы получите $500,000.' },
    // 32
    { index: 55, type: 'DREAM', name: 'Частный самолёт', cost: 1000000, description: 'Купить частный самолёт' },
    // 33
    { index: 56, type: 'BUSINESS', name: 'NFT-платформа', cost: 400000, cashflow: 12000, description: 'Платформа для торговли цифровым искусством.' },
    // 34
    { index: 57, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 35
    { index: 58, type: 'BUSINESS', name: 'Школа языков', cost: 20000, cashflow: 3000, description: 'Школа иностранных языков' },
    // 36
    { index: 59, type: 'DREAM', name: 'Коллекция суперкаров', cost: 1000000, description: 'Гараж с редкими автомобилями.' },
    // 37
    { index: 60, type: 'BUSINESS', name: 'Школа будущего', cost: 300000, cashflow: 10000, description: 'Создать школу будущего для детей' },
    // 38
    { index: 61, type: 'DREAM', name: 'Снять фильм', cost: 500000, description: 'Снять полнометражный фильм' },
    // 39
    { index: 62, type: 'LOSS', name: 'Рейдерский захват', description: 'Вы теряете бизнес с самым крупным доходом.', action: 'RAID' },
    // 40
    { index: 63, type: 'DREAM', name: 'Лидер мнений', cost: 1000000, description: 'Стать мировым лидером мнений' },
    // 41
    { index: 64, type: 'BUSINESS', name: 'Автомойки', cost: 120000, cashflow: 3500, description: 'Сеть автомоек самообслуживания' },
    // 42
    { index: 65, type: 'DREAM', name: 'Белоснежная Яхта', cost: 300000, description: 'Роскошная яхта для путешествий.' },
    // 43
    { index: 66, type: 'BUSINESS', name: 'Франшиза', cost: 100000, cashflow: 10000, description: 'Франшиза "Поток денег"' },
    // 44
    { index: 67, type: 'DREAM', name: 'Полёт в космос', cost: 250000, description: 'Туристический полет на орбиту.' },
    // 45
    { index: 68, type: 'BUSINESS', name: 'Пекарня', cost: 300000, cashflow: 7000, description: 'Пекарня с доставкой' },
    // 46
    { index: 69, type: 'DREAM', name: 'Благотворительный фонд', cost: 200000, description: 'Организовать благотворительный фонд' },
    // 47
    { index: 70, type: 'BUSINESS', name: 'Образовательная платформа', cost: 200000, cashflow: 5000, description: 'Онлайн-образовательная платформа' },
    // 48 (Padding to complete loop - Index 71)
    { index: 71, type: 'LOTTERY', name: 'Лотерея', description: 'Выпадет любая сделка внешнего круга.' }
];

export const FULL_BOARD = [...RAT_RACE_SQUARES, ...FAST_TRACK_SQUARES];

export class GameEngine {
    state: GameState;
    cardManager: CardManager;
    botNextActionAt?: number; // Hook for Bot Pacing

    constructor(roomId: string, players: IPlayer[], creatorId?: string) {
        // Init CardManager with DB Templates
        const templates = DbCardManager.getInstance().getTemplates();
        this.cardManager = new CardManager(templates);
        this.state = {
            roomId,
            creatorId,
            players: players.map(p => this.initPlayer(p)),
            currentPlayerIndex: 0,
            currentTurnTime: 120,
            phase: 'ROLL',
            board: FULL_BOARD,
            log: ['Game Started'],
            chat: [],
            transactions: [],
            turnExpiresAt: Date.now() + 120000 // Init first turn timer
        };
    }

    initPlayer(p: IPlayer): PlayerState {
        // Randomly assign a profession
        const profession = PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];

        // Populate liabilities from profession details
        const liabilities = [];
        if (profession.carLoan) liabilities.push({ name: 'Car Loan', value: profession.carLoan.cost, expense: profession.carLoan.payment });
        if (profession.creditCard) liabilities.push({ name: 'Credit Card', value: profession.creditCard.cost, expense: profession.creditCard.payment });
        if (profession.schoolLoan) liabilities.push({ name: 'School Loan', value: profession.schoolLoan.cost, expense: profession.schoolLoan.payment });
        if (profession.mortgage) liabilities.push({ name: 'Mortgage', value: profession.mortgage.cost, expense: profession.mortgage.payment });
        if (profession.retailDebt) liabilities.push({ name: 'Retail Debt', value: profession.retailDebt.cost, expense: profession.retailDebt.payment });

        return {
            ...p,
            professionName: profession.name,
            cash: profession.savings,
            assets: [],
            liabilities: liabilities,
            loanDebt: 0,
            position: 0,
            isFastTrack: false,
            childrenCount: 0,
            childCost: profession.perChildCost,
            salary: profession.salary,
            passiveIncome: 0,
            income: profession.salary,
            expenses: profession.expenses,
            cashflow: profession.salary - profession.expenses,
            skippedTurns: 0,
            charityTurns: 0,
            isBankrupted: false,
            loanLimitFactor: 1
        };
    }

    updatePlayerId(userId: string, newSocketId: string) {
        const player = this.state.players.find(p => p.userId === userId);
        if (player) {
            console.log(`Updating socket ID for user ${userId} from ${player.id} to ${newSocketId}`);
            player.id = newSocketId;
        }
    }

    addPlayer(player: IPlayer) {
        // Prevent duplicates
        if (this.state.players.some(p => p.userId === player.userId)) {
            console.log(`[Engine] Prevented duplicate: Player ${player.name}(${player.userId}) already exists`);
            return;
        }

        console.log(`[Engine] Adding player ${player.name}(${player.userId})`);
        const newPlayerState = this.initPlayer(player);
        this.state.players.push(newPlayerState);
        this.state.log.push(`👋 ${player.name} присоединился к игре!`);
    }

    addBot(player: IPlayer) {
        this.addPlayer(player);
        // Trigger immediate move if it's their turn (unlikely on join, but safe)
        if (this.state.players[this.state.currentPlayerIndex]?.userId === player.userId) {
            this.makeBotMove();
        }
    }

    async makeBotMove() {
        const player = this.state.players[this.state.currentPlayerIndex];
        if (!player || !player.userId || !player.userId.startsWith('bot_')) return;

        const isHard = player.name.includes('Hard');
        // Simulate "Thinking" time
        // We can't use await delay in sync engine flow easily unless we make this async and caller handles it.
        // But checkTurnTimeout call site expects sync return? No, `checkTurnTimeout` just returns boolean.
        // We shouldn't block the loop.
        // Better: `checkTurnTimeout` calls this, validation happens, `makeBotMove` performs ONE step and returns.
        // It relies on the next loop tick for next step? Or we can chain actions?
        // Let's chain actions with minimal delay or just instant actions for V1.

        console.log(`🤖 Bot ${player.name} думает... (Фаза: ${this.state.phase})`);

        if (this.state.phase === 'ROLL') {
            this.rollDice(); // Returns result, logs it
            // After roll, phase becomes ACTION (or specific event)
            // We need to re-evaluate for next move, maybe in next tick or immediately?
            // Let's rely on next tick/external call for animation pacing?
            // Actually, if we do everything instantly, the user sees nothing.
            // Let's allow `checkTurnTimeout` to effectively "poll" the bot.
            return;
        }

        if (this.state.phase === 'ACTION') {
            if (this.state.currentCard) {
                // DECISION TIME
                const c = this.state.currentCard;
                const canAfford = player.cash >= (c.cost || 0);
                let shouldBuy = false;

                if (canAfford) {
                    if (isHard) {
                        // Smart Logic: Buy if Cashflow is positive OR it's a Big Deal/Dream worth it
                        // Always buy Assets that give cashflow
                        if ((c.cashflow || 0) > 0) shouldBuy = true;
                        // For Big Deals (Dreams/Biz), check if it drains us too much
                        // Keep $2000 buffer
                        if (player.cash - (c.cost || 0) < 2000) shouldBuy = (c.cashflow || 0) > 1000; // Risk it for big return
                    } else {
                        // Easy: Random
                        shouldBuy = Math.random() > 0.5;
                    }
                }

                if (shouldBuy) {
                    this.buyAsset(player.userId); // This ends turn usually or clears card
                } else {
                    this.addLog(`🤖 ${player.name} пропускает сделку.`);
                    this.endTurn();
                }
            } else {
                // No card? Just end turn
                this.endTurn();
            }
            return;
        }

        if (this.state.phase === 'CHARITY_CHOICE') {
            if (player.cash > 3000) {
                // Donate
                player.cash -= (player.income * 0.1);
                player.charityTurns = 3;
                this.addLog(`🤖 ${player.name} пожертвовал на благотворительность.`);
            } else {
                this.addLog(`🤖 ${player.name} отказался от благотворительности.`);
            }
            this.state.phase = 'ROLL';
            // End turn? Charity usually implies roll next? 
            // Logic says: Charity is optional action BEFORE roll? Or instead of?
            // Usually it's an option. After choice, you ROLL.
            // Wait, `CHARITY` square index 3 creates `CHARITY_CHOICE` phase?
            // Looking at board: Index 3 is CHARITY.
            // Handler: Phase = CHARITY_CHOICE.
            // After choice, phase should be ROLL? Or END?
            // Usually Charity is "Land here, choose to donate, then turn ends"?
            // Or "Donate to get benefits for next turns".
            // Let's assume End Turn after decision.
            this.endTurn();
            return;
        }

        if (this.state.phase === 'DOWNSIZED_DECISION') {
            // Hard bot pays if can
            const cost2 = player.expenses * 2;
            if (player.cash >= cost2) {
                this.handleDownsizedDecision(player.id, 'PAY_2M');
            } else {
                // Try pay 1m?
                const cost1 = player.expenses;
                if (player.cash >= cost1) {
                    this.handleDownsizedDecision(player.id, 'PAY_1M');
                } else {
                    // Skip
                    // Logic handles auto skip if no choice? 
                    // `handleDownsizedDecision` ... wait, if I can't pay, do I just sit?
                    // If I can't pay, I must skip turns?
                    // Let's just force End Turn if can't pay.
                    // Actually, `handleDownsizedDecision` doesn't support 'SKIP' explicit?
                    // If I just `endTurn`, what happens?
                    // Downsized puts turns on us.
                    this.endTurn();
                }
            }
            return;
        }

        if (this.state.phase === 'BABY_ROLL') {
            this.rollDice();
            return;
        }

        if (this.state.phase === 'OPPORTUNITY_CHOICE') {
            let choice: 'SMALL' | 'BIG' = 'SMALL';

            if (isHard) {
                // Hard Bot Strategy: Go Big if we have cash buffer
                // Cost of Big Deals usually 6k-30k+
                if (player.cash >= 5000) {
                    choice = 'BIG';
                }
            } else {
                // Easy Bot: Mostly Small
                if (player.cash >= 10000 && Math.random() > 0.8) {
                    choice = 'BIG';
                }
            }

            this.addLog(`🤖 ${player.name} выбирает ${choice === 'SMALL' ? 'МАЛУЮ' : 'КРУПНУЮ'} СДЕЛКУ.`);
            try {
                this.drawDeal(player.id, choice);
            } catch (e) {
                console.error("Bot failed to draw deal:", e);
                this.endTurn();
            }
            return;
        }

        // Catch all
        this.endTurn();
    }

    addLog(message: string) {
        this.state.log.push(message);
        if (this.state.log.length > 200) {
            this.state.log.shift();
        }
    }

    checkFastTrackCondition(player: PlayerState) {
        if (player.isFastTrack) return;

        // Condition: 
        // 1. Credits 0
        // 2. 200 000+ on balance
        // 3. Passive income >= 10,000 (User Request Revert)

        // Reset flag
        const wasCanEnter = player.canEnterFastTrack;
        player.canEnterFastTrack = false;

        if (player.passiveIncome >= 10000) {
            if (player.loanDebt === 0 && player.cash >= 200000) {
                player.canEnterFastTrack = true;
                if (!wasCanEnter) {
                    this.addLog(`🚀 ${player.name} готов к Скоростной Дорожке! (Пассив >= $10k, Нет долгов, $200k+)`);
                }
            }
        }
    }

    checkWinCondition(player: PlayerState) {
        if (!player.isFastTrack) return;

        const incomeGoalMet = player.fastTrackStartIncome !== undefined
            ? (player.passiveIncome >= player.fastTrackStartIncome + 50000)
            : (player.passiveIncome >= 50000);

        const businessCount = player.assets.filter(a => a.type === 'BUSINESS').length;
        const dreamBought = player.assets.some(a => a.type === 'DREAM' && a.title === player.dream);

        // Win Condition: +50k Income OR (Buy Dream AND 2 Businesses)
        // User Screenshot shows they have +$54,000 but didn't win, implying OR logic was desired but AND was implemented.
        let won = false;
        if (incomeGoalMet || (dreamBought && businessCount >= 2)) {
            won = true;
        }

        if (won && !player.hasWon) {
            player.hasWon = true;
            this.addLog(`🏆 ${player.name} ВЫИГРАЛ ИГРУ! (+50k Поток, Мечта, 2 Бизнеса)`);
            this.addLog(`✨ ПОЗДРАВЛЯЕМ! ✨`);
        }
    }

    public enterFastTrack(userId: string) {
        const player = this.state.players.find(p => p.userId === userId || p.id === userId); // robust check
        if (!player) return;
        if (!player.canEnterFastTrack) {
            this.addLog(`⚠️ ${player.name} cannot enter Fast Track yet.`);
            return;
        }

        // Transition Logic
        player.isFastTrack = true;
        player.canEnterFastTrack = false; // Clear flag
        player.position = 0; // Reset to start of Outer Track
        player.charityTurns = 0;

        const oldPassive = player.passiveIncome;

        // "Cash zeros"
        player.cash = 0;

        // "Only passive income accrues which is equal to small track passive income * 10"
        player.passiveIncome = oldPassive * 10;
        player.salary = 0;
        player.income = player.passiveIncome;
        player.expenses = 0; // Financial Freedom
        player.cashflow = player.income;

        // Store starting income effectively to track the +$50k goal
        // Goal: Increase PASSIVE INCOME by 50,000. 
        // Current Passive is `oldPassive * 10`.
        // So target Passive is `(oldPassive * 10) + 50000`.
        player.fastTrackStartIncome = player.passiveIncome;

        // User Request: "1 старт должен быть с первой суммой"
        // Interpret: When entering, you get the first Cashflow Day payment immediately.
        player.cash += player.cashflow;

        // Return Rat Race Assets to Deck (Rule: "When moving to Big Track, all cards return to discard")
        for (const asset of player.assets) {
            // Use stored sourceType or fallback heuristic
            const discardType = (asset as any).sourceType || ((asset.cost || 0) > 5000 ? 'DEAL_BIG' : 'DEAL_SMALL');

            this.cardManager.discard({
                id: `returned_ft_${Date.now()}_${Math.random()}`,
                type: discardType,
                title: asset.title,
                cost: asset.cost,
                cashflow: asset.cashflow
            } as any);
        }

        // Clear Lists
        player.assets = [];
        player.liabilities = [];

        this.addLog(`🚀 ${player.name} ВЫШЕЛ НА СКОРОСТНУЮ ДОРОЖКУ! (Цель: +$50k Пассивного дохода)`);
        this.addLog(`💰 Стартовый бонус: +$${player.cashflow}`);

        // Ensure Log Update
        // this.emitState(); // Handled by Gateway
    }

    rollDice(diceCount: number = 1): number | { total: number, values: number[] } {
        const player = this.state.players[this.state.currentPlayerIndex];

        // Baby Roll Logic
        if (this.state.phase === 'BABY_ROLL') {
            return this.resolveBabyRoll();
        }

        if (player.skippedTurns > 0) {
            player.skippedTurns--;
            this.addLog(`${player.name} пропускает ход (Осталось: ${player.skippedTurns})`);
            // Do NOT auto end turn. Let user click Next.
            this.state.phase = 'ACTION';
            return 0;
        }

        // Phase check BEFORE rolling
        if (this.state.phase !== 'ROLL') {
            console.log(`[Engine.rollDice] BLOCKED: Phase is ${this.state.phase}, expected ROLL. Current player: ${player.name}`);
            return { total: 0, values: [] }; // Prevent double roll
        }

        // Validate dice count
        let validCount = 1;
        if (player.isFastTrack) validCount = 2; // Default 2 for FT

        // Charity Bonus (Overrides default limitation if active)
        if (player.charityTurns > 0) {
            // Rat Race: Can roll 1 or 2.
            // Fast Track: Can roll 1, 2, or 3? (User said 1-3)
            // We trust the `diceCount` requested if within limits.
            const maxDice = player.isFastTrack ? 3 : 2;
            if (diceCount >= 1 && diceCount <= maxDice) {
                validCount = diceCount;
            } else {
                // Fallback to max allowed if requested more/less weirdly
                validCount = maxDice; // Or default? Let's assume UI sends correct. 
                // If UI sends 1, validCount becomes 1.
                if (diceCount > 0 && diceCount <= maxDice) validCount = diceCount;
            }
            player.charityTurns--; // Use up a charity turn
        } else {
            // Normal Rules
            // Rat Race: 1 Die (Fixed)
            // Fast Track: 2 Dice (Fixed usually, or 1? Standard FT is 2 dice always? 
            // Actually rules say you can choose. But simplistic is 1 for RR, 2 for FT. 
            // If user forces 1 on FT without charity -> OK.
            // Let's stick to: RR=1, FT=2.
            if (player.isFastTrack) validCount = 2;
            else validCount = 1;
        }

        let total = 0;
        const values: number[] = [];

        for (let i = 0; i < validCount; i++) {
            const die = Math.floor(Math.random() * 6) + 1;
            total += die;
            values.push(die);
        }

        // Logic check: If total is somehow 0 (shouldn't happen), force 1
        if (total === 0) total = 1;

        // Move Player
        this.movePlayer(total);

        // this.state.lastRoll = total; // REMOVED: Property does not exist on type

        // Log the roll details
        if (values.length > 1) {
            this.addLog(`${player.name} выбросил ${values.join('+')} (= ${total})`);
        } else {
            this.addLog(`${player.name} выбросил ${total}`);
        }

        console.log(`[Engine.rollDice] SUCCESS: ${player.name} rolled ${total}, Phase now: ${this.state.phase}`);
        return { total, values };
    }

    handleDownsizedDecision(playerId: string, decision: 'PAY_1M' | 'PAY_2M' | 'BANKRUPT') {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player || player.id !== this.state.players[this.state.currentPlayerIndex].id) return;
        if (this.state.phase !== 'DOWNSIZED_DECISION') return;

        const expenses = player.expenses;

        if (decision === 'PAY_1M') {
            const cost = expenses * 1; // User Request: "заплатить мес 1 расход"

            if (player.cash >= cost) {
                player.cash -= cost;
                player.skippedTurns = 2; // "пропустить 2 хода"
                this.addLog(`📉 ${player.name} Оплатил расходы за месяц ($${cost}) и пропускает 2 хода.`);
                this.endTurn();
            } else {
                this.addLog(`⚠️ Не может оплатить 1 месяц ($${cost}). Недостаточно средств.`);
            }

        } else if (decision === 'PAY_2M') {
            const cost = expenses * 2; // User Request: "платит 2 расхода"

            if (player.cash >= cost) {
                player.cash -= cost;
                player.skippedTurns = 0; // "не пропускать ход"
                this.addLog(`🛡️ ${player.name} Оплатил расходы за 2 месяца ($${cost}), чтобы не пропускать ходы!`);
                this.state.phase = 'ACTION';
                this.endTurn();
            } else {
                this.addLog(`⚠️ Не может оплатить 2 месяца ($${cost}). Недостаточно средств.`);
            }
        } else if (decision === 'BANKRUPT') {
            this.bankruptPlayer(player);
            this.endTurn();
        }
    }

    movePlayer(steps: number) {
        const player = this.state.players[this.state.currentPlayerIndex];
        const oldPos = player.position;
        // Fast Track has 48 squares (Indices 24 to 71)
        const trackLength = player.isFastTrack ? 48 : 24;

        let currentPos = oldPos;

        // Iterate through each step to check for passed Paydays
        for (let i = 1; i <= steps; i++) {
            currentPos++;
            const effectivePos = currentPos % trackLength;

            // Check if passed/landed square is PAYDAY
            // Note: In Rat Race, index 24 (wrap) is NOT a square, but index 0 is Deal.
            // If we wrap, we pass logical "Start". 
            // In Cashflow, specific squares are Paydays.
            // If player is on Fast Track, check FAST_TRACK_SQUARES.
            // If player is on Rat Race, check RAT_RACE_SQUARES.

            const squareIndex = effectivePos; // already modulo'd
            let squareType = '';

            if (player.isFastTrack) {
                // Index 24-71 in global array, but 0-47 in local logic?
                // Wait, existing logic uses global indices 24+ for Fast Track in FAST_TRACK_SQUARES.
                // But player.position for Fast Track was being treated as 0-47 relative in some places?
                // Let's check:
                // FAST_TRACK_SQUARES indices are 24..71.
                // player.position initially set to 0 in checkFastTrackCondition (Line 252).
                // So player.position is 0-47 relative to Fast Track start?
                // The getSquare mock used `this.state.board[pos]`.
                // `FULL_BOARD` concat means index 0-23 (Rat), 24-71 (Fast).
                // So if player.position is 0 (Fast Track Start), that maps to global index 24.
                // We need to map local pos to global pos.

                // Let's assume player.position for FT is 0-47.
                // So we check `FAST_TRACK_SQUARES[squareIndex]`?
                // `FAST_TRACK_SQUARES` starts at index 24. 
                // We should access `this.state.board[24 + squareIndex]`.

                const globalIndex = 24 + squareIndex;
                const square = this.getSquare(globalIndex);
                if (square && square.type === 'PAYDAY' && i !== steps) {
                    player.cash += player.cashflow;
                    this.addLog(`💰 ${player.name} прошел день расплаты! +$${player.cashflow}`);
                    this.recordTransaction({
                        from: 'Bank',
                        to: player.name,
                        amount: player.cashflow,
                        description: 'Payday (Passed)',
                        type: 'PAYDAY'
                    });
                    this.state.lastEvent = { type: 'PAYDAY', payload: { player: player.name, amount: player.cashflow } };
                }

            } else {
                // Rat Race
                const square = this.getSquare(squareIndex);
                if (square && square.type === 'PAYDAY' && i !== steps) {
                    player.cash += player.cashflow;
                    this.addLog(`💰 ${player.name} прошел день расплаты! +$${player.cashflow}`);
                    this.recordTransaction({
                        from: 'Bank',
                        to: player.name,
                        amount: player.cashflow,
                        description: 'Payday (Passed)',
                        type: 'PAYDAY'
                    });
                    this.state.lastEvent = { type: 'PAYDAY', payload: { player: player.name, amount: player.cashflow } };
                }
            }
        }

        // Final Position Update
        const finalPos = (oldPos + steps) % trackLength;
        player.position = finalPos;

        // Trigger Landing Logic
        if (player.isFastTrack) {
            // Convert local 0-47 to global 24-71 for handler?
            // handleFastTrackSquare expects GLOBAL position?
            // Line 320: `handleFastTrackSquare(player, position)`
            // Line 317: `getSquare(pos)` uses `this.state.board[pos]`.
            // So `handleFastTrackSquare` MUST receive GLOBAL position.
            this.handleFastTrackSquare(player, 24 + finalPos);
        } else {
            const square = this.getSquare(finalPos);
            this.addLog(`${player.name} перешел на ${square.name}`);
            this.handleSquare(player, square);
        }
    }

    private getSquare(pos: number): BoardSquare {
        return this.state.board[pos];
    }

    handleFastTrackSquare(player: PlayerState, position: number | BoardSquare) {
        // Default to ACTION, can be overridden by specific square logic (e.g. Win -> END)
        this.state.phase = 'ACTION';

        let square: BoardSquare;
        if (typeof position === 'number') {
            square = this.getSquare(position);
        } else {
            square = position;
        }

        this.addLog(`${player.name} попал на ${square.type}: ${square.name}`);

        // WIN CONDITION:
        // 1. Passive Income +$50k
        // 2. Buy your Dream
        // 3. Buy at least 2 Businesses (User Request: "Купить 2 бизнеса и свою Мечту")
        this.checkWinCondition(player);

        switch (square.type) {
            case 'PAYDAY':
                player.cash += player.cashflow;
                this.addLog(`💰 День расплаты (Скоростная Дорожка)! +$${player.cashflow}`);
                break;

            case 'BUSINESS':
            case 'DREAM':
                // Check Ownership
                const isOwnedByMe = square.ownerId === player.id;
                const isOwnedByOther = square.ownerId && square.ownerId !== player.id;

                if (isOwnedByMe) {
                    // 1. User cannot rebuy own business
                    this.addLog(`🏢 Вы владеете ${square.name}. (Нельзя купить повторно)`);
                    this.state.phase = 'ACTION';
                    // Don't set currentCard so no "Buy" button appears.
                    // Maybe set phase to 'ACTION' or just let them end turn?
                    // Usually fast track lands, if owned, nothing happens.
                    return;
                }

                let cost = square.cost || 0;
                let description = square.description || '';
                let isBuyout = false;

                if (isOwnedByOther) {
                    // 2. Buyout Logic (2x Price)
                    cost *= 2;
                    const ownerName = this.state.players.find(p => p.id === square.ownerId)?.name || 'Unknown';
                    description = `⭐ BUYOUT from ${ownerName} (2x Price)`;
                    isBuyout = true;
                    this.addLog(`⚔️ Возможность поглощения! Купить ${square.name} у ${ownerName} за $${cost}?`);
                } else {
                    this.addLog(`Найдено ${square.type}: ${square.name}. Стоимость $${square.cost}`);
                }

                // Construct a temporary card for the UI action
                this.state.currentCard = {
                    id: `ft_${square.index}`,
                    type: square.type, // 'BUSINESS' or 'DREAM'
                    title: square.name,
                    description: description,
                    cost: cost,
                    cashflow: square.cashflow,
                    mandatory: false,
                    // Custom properties for buyAsset to know context
                    targetSquareIndex: square.index,
                    isBuyout: isBuyout,
                    ownerId: square.ownerId
                } as any; // Cast as any or extend Card interface if needed, but Card usually dynamic enough? 
                // Card interface might not support custom props properties without modification.
                // Let's rely on standard properties or extend logic in buyAsset.
                // We'll trust 'ft_INDEX' ID parsing or add transient props if Card allows.
                // TypeScript 'Card' definition check? Assuming Card is flexible or I need to update it.
                // Let's assume Card needs updating if strict. For now casting as any for safety in this tool call.

                this.state.phase = 'ACTION';
                break;

            case 'LOSS':
                this.handleFastTrackLoss(player, square);
                this.state.phase = 'ACTION';
                break;

            case 'CHARITY':
                // Prompt for Donation
                this.state.phase = 'CHARITY_CHOICE';
                this.addLog(`❤️ Благотворительность! Пожертвуйте, чтобы получить бонус к кубикам.`);
                break;

            case 'STOCK_EXCHANGE':
                // "Roll dice. If 5 or 6, get $500,000"
                // Implement as immediate roll? Or manual button? 
                // Let's do manual button logic or Phase?
                // For simplicity: Auto-Roll or "Choice"?
                // Let's treat it as an event handled by UI? 
                // Actually, let's keep it simple: Action Phase, specialized UI button "Roll Exchange"?
                // Or just auto-roll now?
                const roll = Math.floor(Math.random() * 6) + 1;
                if (roll >= 5) {
                    player.cash += 500000;
                    this.addLog(`📈 Биржа: Выпало ${roll}! Вы получаете $500,000!`);
                } else {
                    this.addLog(`📉 Биржа: Выпало ${roll}. Нет прибыли.`);
                }
                // End Turn immediately? Or allow other actions?
                // Usually end turn.
                this.state.phase = 'ACTION'; // Let user see result then click Next.
                break;

            case 'LOTTERY':
                // "Выпадет любая сделка внешнего круга"
                // Logic: Pick a random square and TRIGGER it as if landed.
                const eligibleSquares = FAST_TRACK_SQUARES.filter(sq => ['BUSINESS', 'DREAM', 'LOSS', 'PAYDAY'].includes(sq.type));
                // Note: User said "Any deal... expense (mandatory), business/dream (buy opportunity)".
                // 'LOSS' covers expenses/negative events. 'BUSINESS'/'DREAM'.
                // 'PAYDAY' is free money.

                const randomSquare = eligibleSquares[Math.floor(Math.random() * eligibleSquares.length)];

                this.addLog(`🎰 ЛОТЕРЕЯ: Выпало... ${randomSquare.name}!`);

                // Recursively handle the new square
                // Pass the square object directly
                this.handleFastTrackSquare(player, randomSquare);

                // IMPORTANT: The recursive call will handle phase/events. 
                // We should NOT endTurn here if the recursive call sets phase to ACTION.
                // If recursive call was immediate (PAYDAY/LOSS), it likely didn't endTurn either (except my LOSS change above).
                // If BUSINESS, phase is ACTION.
                break;
        }
    }

    public removePlayer(playerId: string) {
        const index = this.state.players.findIndex(p => p.id === playerId);
        if (index === -1) return;

        const player = this.state.players[index];
        this.addLog(`🚫 ${player.name} кикнут Хостом.`);

        // Remove player
        this.state.players.splice(index, 1);

        // Adjust Current Player Index
        if (index < this.state.currentPlayerIndex) {
            // Player before current was removed, shift index left
            this.state.currentPlayerIndex--;
        } else if (index === this.state.currentPlayerIndex) {
            // Current player removed
            if (this.state.players.length === 0) {
                this.state.isGameEnded = true;
                return;
            }
            // Index now points to next player (or out of bounds)
            if (this.state.currentPlayerIndex >= this.state.players.length) {
                this.state.currentPlayerIndex = 0;
            }
            // Reset phase for the new player
            this.state.phase = 'ROLL';
            this.state.turnExpiresAt = Date.now() + (this.state.currentTurnTime * 1000);

            const nextPlayer = this.state.players[this.state.currentPlayerIndex];
            this.addLog(`🎲 Ход переходит к ${nextPlayer.name}`);
        }
        // If index > current, no change needed to index
    }

    public calculateRankings() {
        // 1. Winners (hasWon) - Sorted by time? Or just grouped.
        // 2. Fast Track Players (Sorted by Income Gain? or Total Income?)
        //    User: "2nd place: most additional income on Fast Track"
        // 3. Fast Track Players (Sorted by Total Passive Income?)
        //    User: "3rd place: entered FT. tie-break: FT passive income -> Total passive"
        // 4. Rat Race Players (Sorted by Passive Income)
        // 5. Rat Race Players (Sorted by Cash)

        const players = [...this.state.players];

        return players.sort((a, b) => {
            // Criteria 1: Has Won
            if (a.hasWon && !b.hasWon) return -1;
            if (!a.hasWon && b.hasWon) return 1;

            // If both won, tie-break by Income Gain (FT Passive - Start Passive)
            // (Criteria 2 for winners too? Or just first to win? Let's assume income metric determines standing effectively)

            // Criteria 2/3: Is Fast Track
            if (a.isFastTrack && !b.isFastTrack) return -1;
            if (!a.isFastTrack && b.isFastTrack) return 1;

            if (a.isFastTrack && b.isFastTrack) {
                // Both FT. Sort by Gain on Big Track
                const gainA = (a.passiveIncome || 0) - (a.fastTrackStartIncome || 0);
                const gainB = (b.passiveIncome || 0) - (b.fastTrackStartIncome || 0);
                if (gainA !== gainB) return gainB - gainA; // Higher gain wins

                // Tie: Total Passive
                return b.passiveIncome - a.passiveIncome;
            }

            // Criteria 4: Rat Race - Passive Income
            if (a.passiveIncome !== b.passiveIncome) return b.passiveIncome - a.passiveIncome;

            // Criteria 5: Rat Race - Cash
            return b.cash - a.cash;
        }).map((p, i) => ({
            id: p.id,
            userId: p.userId,
            name: p.name,
            place: i + 1,
            reason: p.hasWon ? 'Winner' : p.isFastTrack ? 'Fast Track' : 'Rat Race'
        }));
    }


    handleFastTrackLoss(player: PlayerState, square: BoardSquare) {
        if (!square.action) return;

        if (square.action === 'AUDIT' || square.action === 'DIVORCE') {
            player.cash = Math.floor(player.cash * 0.5);
            this.addLog(`📉 ${square.name}: Потеряно 50% наличных!`);
        } else if (square.action === 'THEFT') {
            player.cash = 0;
            this.addLog(`🕵️ ${square.name}: Потеряны ВСЕ наличные!`);
        } else if (square.action === 'FIRE') {
            // Lose business with MIN income
            if (player.assets.length > 0) {
                // Sort assets by cashflow (asc)
                player.assets.sort((a, b) => a.cashflow - b.cashflow);
                const lostAsset = player.assets.shift(); // Remove first
                if (lostAsset) {
                    player.passiveIncome -= lostAsset.cashflow;
                    player.income -= lostAsset.cashflow;
                    player.cashflow -= lostAsset.cashflow;
                    this.addLog(`🔥 ${square.name}: Потерян ${lostAsset.title} (Поток: $${lostAsset.cashflow})`);
                }
            } else {
                this.addLog(`🔥 ${square.name}: Нет активов для потери.`);
            }
        } else if (square.action === 'RAID') {
            // Lose business with MAX income
            if (player.assets.length > 0) {
                // Sort assets by cashflow (desc)
                player.assets.sort((a, b) => b.cashflow - a.cashflow);
                const lostAsset = player.assets.shift(); // Remove first (max)
                if (lostAsset) {
                    player.passiveIncome -= lostAsset.cashflow;
                    player.income -= lostAsset.cashflow;
                    player.cashflow -= lostAsset.cashflow;
                    this.addLog(`👮 ${square.name}: Потерян ${lostAsset.title} (Поток: $${lostAsset.cashflow})`);
                }
            } else {
                this.addLog(`👮 ${square.name}: Нет активов для потери.`);
            }
        }
    }

    handleSquare(player: PlayerState, square: BoardSquare) {
        // Default phase to ACTION. Specific squares (Deal, Charity, Downsized) will override this.
        // Payday, Baby, etc. will remain ACTION.
        this.state.phase = 'ACTION';

        this.addLog(`${player.name} попал на ${square.type}`);

        if (square.type === 'PAYDAY') {
            // Payday on landing (Indices 6, 12, 18...). Index 0 is usually handled by lap logic (newPos >= 24).
            // To be safe and generous, we pay if it's NOT index 0, OR if we want to ensure payment.
            // Given user feedback "stood on payday", we should pay.
            // We'll skip index 0 if it was just covered by movePlayer, but handleSquare doesn't know previous state.
            // Simplest fix: Pay if square.index !== 0. Index 0 is paid by "Passing Payday" log.
            if (square.index !== 0) {
                player.cash += player.cashflow;
                this.addLog(`День расплаты! +$${player.cashflow}`);
                this.recordTransaction({
                    from: 'Bank',
                    to: player.name,
                    amount: player.cashflow,
                    description: 'Payday (Landed)',
                    type: 'PAYDAY'
                });
                this.state.lastEvent = { type: 'PAYDAY', payload: { player: player.name, amount: player.cashflow } };
            } else {
                this.addLog(`Start!`);
            }
            this.checkFastTrackCondition(player);
        } else if (square.type === 'DEAL') {
            // Prompt for Small/Big Deal.
            this.state.phase = 'OPPORTUNITY_CHOICE';
        } else if (square.type === 'MARKET') {
            // Draw Market Card
            const card = this.cardManager.drawMarket();
            console.log('[Market] Drew market card:', card ? card.title : 'NONE AVAILABLE');

            if (card) {
                this.state.currentCard = card;
                this.addLog(`🏪 MARKET: ${card.title} - ${card.description}`);
                if (!this.state.activeMarketCards) this.state.activeMarketCards = [];

                const activeCard = {
                    id: `market_${Date.now()}`,
                    card,
                    sourcePlayerId: player.id,
                    expiresAt: Date.now() + 60000 // 60s
                };

                this.state.activeMarketCards.push(activeCard);
                console.log('[Market] Added to activeMarketCards:', {
                    cardTitle: card.title,
                    expiresAt: new Date(activeCard.expiresAt).toISOString(),
                    totalActiveCards: this.state.activeMarketCards.length
                });
                this.state.phase = 'ACTION';
            } else {
                this.addLog(`🏪 РЫНОК: Карты закончились.`);
            }
        } else if (square.type === 'EXPENSE') {
            const card = this.cardManager.drawExpense();
            this.state.currentCard = card;
            // Removed automatic deduction. Now handled via buyAsset (Mandatory Pay)
            this.addLog(`💸 Трата: ${card.title} ($${card.cost})`);
            this.state.phase = 'ACTION';
        } else if (square.type === 'BABY') {
            if (player.childrenCount >= 3) {
                this.addLog(`${player.name} уже имеет максимум детей.`);
                this.state.phase = 'ACTION';
            } else {
                this.addLog(`👶 ${player.name} попал на Ребенка! Бросьте кубик (1-4).`);
                this.state.phase = 'BABY_ROLL';
            }
            return;
        } else if (square.type === 'DOWNSIZED') {
            // Logic: 
            // "1 игрок увольняется"
            // Choices:
            // A: Pay 2x Expenses -> Skip 2 Turns
            // B: Pay 4x Expenses -> Skip 0 Turns
            // If cannot pay -> Bankrupt (Restart with loanLimit 50%)

            this.state.phase = 'DOWNSIZED_DECISION';
            this.addLog(`🤒 ${player.name} заболел! Выберите вариант оплаты.`);
        } else if (square.type === 'CHARITY') {
            this.state.phase = 'CHARITY_CHOICE';
            this.addLog(`❤️ Благотворительность: Пожертвуйте 10% от общего дохода ради 2 кубиков?`);
        }
    }

    drawDeal(playerId: string, type: 'SMALL' | 'BIG') {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player || player.id !== this.state.players[this.state.currentPlayerIndex].id) {
            throw new Error("Not your turn!");
        }

        if (this.state.phase !== 'OPPORTUNITY_CHOICE') {
            throw new Error("Not in deal choice phase!");
        }

        let card: Card | undefined;
        if (type === 'SMALL') {
            card = this.cardManager.drawSmallDeal();
        } else {
            card = this.cardManager.drawBigDeal();
        }

        if (card) {
            this.state.currentCard = card;
            this.addLog(`Selected ${type} deal: ${card.title}`);
            this.state.phase = 'ACTION';
        } else {
            this.addLog(`Нет ${type === 'SMALL' ? 'МАЛЫХ' : 'КРУПНЫХ'} сделок!`);
            this.state.phase = 'ACTION';
        }
    }


    takeLoan(playerId: string, amount: number) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;

        if (amount <= 0 || amount % 1000 !== 0) {
            this.addLog(`${player.name} не удалось взять кредит: Сумма должна быть кратна 1000.`);
            return;
        }

        if (player.isBankrupted) {
            this.addLog(`${player.name} не может брать кредиты (Банкрот).`);
            return;
        }

        if (player.isFastTrack) {
            this.addLog(`${player.name} не может брать кредиты на Скоростной Дорожке!`);
            return;
        }

        // Interest 10%
        const interest = amount * 0.1;

        // Check Loan Limit (with potential penalty)
        const limitFactor = player.loanLimitFactor || 1;
        // Available Cashflow for Loans = Cashflow * Factor.
        // Wait, "Loan Limit" usually means Max Loan Amount.
        // If normal max is (Cashflow / 0.1), then new max is (Cashflow / 0.1) * 0.5.
        // This is equivalent to checking if Interest <= Cashflow * 0.5.
        // However, we must consider EXISTING interest? 
        // No, player.cashflow ALREADY deducts existing interest (it is Net Cashflow).
        // So checking (Cashflow - NewInterest >= 0) handles incremental loans.
        // If we want to restrict TOTAL debt power, we should scale the *remaining* borrowing power.
        // Yes: Effective Borrowable Cashflow = Player.Cashflow * LimitFactor.

        if ((player.cashflow * limitFactor) - interest < 0) {
            this.addLog(`${player.name} не удалось взять кредит: Недостаточный денежный поток (Лимит: ${limitFactor * 100}%).`);
            return;
        }

        player.cash += amount;
        player.loanDebt += amount;

        // Update Liability
        let bankLoan = player.liabilities.find((l: any) => l.name === 'Bank Loan');
        if (bankLoan) {
            bankLoan.value += amount;
            bankLoan.expense += interest;
        } else {
            player.liabilities.push({ name: 'Bank Loan', value: amount, expense: interest });
        }

        player.expenses += interest;
        player.cashflow = player.income - player.expenses;

        this.recordTransaction({
            from: 'Bank',
            to: player.name,
            amount: amount,
            description: 'Bank Loan',
            type: 'LOAN'
        });

        this.addLog(`${player.name} взял кредит $${amount}. Расходы +$${interest}/мес`);
    }

    resolveOpportunity(size: 'SMALL' | 'BIG') {
        if (this.state.phase !== 'OPPORTUNITY_CHOICE') return;

        const player = this.state.players[this.state.currentPlayerIndex];

        let card: Card | undefined;
        if (size === 'SMALL') {
            card = this.cardManager.drawSmallDeal();
        } else {
            card = this.cardManager.drawBigDeal();
        }

        if (!card) {
            this.addLog(`${player.name} хотел ${size === 'SMALL' ? 'МАЛУЮ' : 'КРУПНУЮ'} сделку, но колода пуста!`);
            this.state.phase = 'ACTION';
            return;
        }

        this.state.currentCard = card;

        // Persist if it offers to buy something
        if (card.offerPrice && card.offerPrice > 0) {
            if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
            this.state.activeMarketCards.push({
                id: uuidv4(),
                card: card,
                expiresAt: Date.now() + 2 * 60 * 1000,
                sourcePlayerId: player.id
            });
        }

        // Handle Mandatory Cards (Damages/Events)
        if (card.mandatory) {
            let cost = card.cost || 0;

            // Special Logic Checks
            // Special Logic Checks
            if (card.title.includes('Roof Leak') || card.title.includes('Крыша протекла')) {
                // Only pay if player owns property (Real Estate)
                const hasProperty = player.assets.some(a => a.type === 'REAL_ESTATE' || a.title.includes('Home') || a.title.includes('House') || a.title.includes('Condo') || a.title.includes('Plex') || a.title.includes('Дом') || a.title.includes('Квартира') || a.title.includes('Таунхаус'));

                if (!hasProperty) {
                    cost = 0;
                    this.addLog(`😅 ${card.title}: Нет недвижимости. Вы ничего не платите.`);
                }
            } else if (card.title.includes('Sewer') || card.title.includes('Прорыв канализации')) {
                // Also requires property ownership usually
                const hasProperty = player.assets.some(a => a.type === 'REAL_ESTATE' || a.title.includes('Home') || a.title.includes('House') || a.title.includes('Condo') || a.title.includes('Plex') || a.title.includes('Дом') || a.title.includes('Квартира') || a.title.includes('Таунхаус'));

                if (!hasProperty) {
                    cost = 0;
                    this.addLog(`😅 ${card.title}: Нет недвижимости. Вы ничего не платите.`);
                }
            }

            if (cost > 0) {
                // Do NOT force payment here. 
                // Just log it and let the UI show the card in ACTION phase.
                // The "Buy/Pay" button in UI will call buyAsset().

                // We keep card.mandatory = true so UI knows to show "PAY" instead of "BUY".
                this.state.phase = 'ACTION';
                return;
            } else {
                // Show card even if cost is 0 so user knows what happened
                card.cost = 0; // Explicitly set to 0
                this.addLog(`😅 ${card.title}: Нет недвижимости. Вы ничего не платите.`);

                // Keep card in state so UI shows it with "Pay $0" or "Ok"
                this.state.phase = 'ACTION';
                return;
            }
        }

        const details = [];
        if (card.cost) details.push(`Cost: $${card.cost}`);
        if (card.cashflow) details.push(`Flow: $${card.cashflow}`);
        if (card.downPayment) details.push(`Down: $${card.downPayment}`);
        if ((card as any).rule) details.push(`Rule: ${(card as any).rule}`); // Cast to any to avoid TS error

        const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
        this.addLog(`${player.name} chose ${size} DEAL: ${card.title}${detailsStr}`);
        this.state.phase = 'ACTION'; // Back to action phase to buy/pass
    }

    repayLoan(playerId: string, amount: number) {
        // ... (existing code, keeping unrelated logic intact if not editing it)
        // Actually, I am replacing the method or appending? 
        // I will use replace_file_content to INSERT after repayLoan block ends.
        // It's safer to target checking where repayLoan ends.
        // repayLoan ends at line 704: this.checkFastTrackCondition(player); }
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;

        if (amount <= 0 || amount % 1000 !== 0) return;
        if (player.loanDebt < amount) return; // Cannot overpay
        if (player.cash < amount) return;

        const interest = amount * 0.1;

        player.cash -= amount;
        player.loanDebt -= amount;

        // Update Liability
        const bankLoanIndex = player.liabilities.findIndex((l: any) => l.name === 'Bank Loan');
        if (bankLoanIndex !== -1) {
            player.liabilities[bankLoanIndex].value -= amount;
            player.liabilities[bankLoanIndex].expense -= interest;

            // Remove if paid off (or close to 0 due to float precision, though integers used here)
            if (player.liabilities[bankLoanIndex].value <= 0) {
                player.liabilities.splice(bankLoanIndex, 1);
            }
        }

        player.expenses -= interest;
        player.cashflow = player.income - player.expenses;

        this.recordTransaction({
            from: player.name,
            to: 'Bank',
            amount: amount,
            description: 'Repay Loan',
            type: 'REPAY'
        });

        this.addLog(`${player.name} погасил кредит $${amount}. Расходы -$${interest}/мес`);

        // Check Fast Track after repaying loan (might free up cashflow condition)
        this.checkFastTrackCondition(player);
    }

    transferAsset(fromPlayerId: string, toPlayerId: string, assetIndex: number, quantity: number = 1) {
        console.log('[TransferAsset] Called with:', { fromPlayerId, toPlayerId, assetIndex, quantity });

        // Find players by userId (not id which is socket.id)
        const fromPlayer = this.state.players.find(p => p.userId === fromPlayerId);
        const toPlayer = this.state.players.find(p => p.userId === toPlayerId);

        console.log('[TransferAsset] Found players:', {
            fromPlayer: fromPlayer ? `${fromPlayer.name} (${fromPlayer.userId})` : 'NOT FOUND',
            toPlayer: toPlayer ? `${toPlayer.name} (${toPlayer.userId})` : 'NOT FOUND',
            allPlayerUserIds: this.state.players.map(p => ({ userId: p.userId, name: p.name }))
        });

        if (!fromPlayer || !toPlayer) {
            console.error('[TransferAsset] Player not found! Aborting.');
            return;
        }
        if (assetIndex < 0 || assetIndex >= fromPlayer.assets.length) return;

        const asset = fromPlayer.assets[assetIndex];

        // Partial Transfer Logic (Stocks)
        let transferAsset: any = asset;
        let isPartial = false;

        if ((asset.symbol || (asset.quantity && asset.quantity > 1)) && quantity < (asset.quantity || 1)) {
            // Split Asset
            isPartial = true;
            // Determine cashflow part
            const totalQuantity = asset.quantity || 1;
            const transferRatio = quantity / totalQuantity;
            const transferCashflow = Math.floor((asset.cashflow || 0) * transferRatio);

            // Create new asset object to transfer
            transferAsset = {
                ...asset,
                quantity: quantity,
                cashflow: transferCashflow
            };

            // Reduce source asset
            asset.quantity -= quantity;
            asset.cashflow -= transferCashflow;

            // Update source passive income
            if (transferCashflow > 0) {
                fromPlayer.passiveIncome -= transferCashflow;
                fromPlayer.income = fromPlayer.salary + fromPlayer.passiveIncome;
                fromPlayer.cashflow = fromPlayer.income - fromPlayer.expenses;
            }
        } else {
            // Full Transfer
            // 1. Remove from source
            fromPlayer.assets.splice(assetIndex, 1);

            // 2. Remove Cashflow from source
            if (asset.cashflow) {
                fromPlayer.passiveIncome -= asset.cashflow;
                fromPlayer.income = fromPlayer.salary + fromPlayer.passiveIncome;
                fromPlayer.cashflow = fromPlayer.income - fromPlayer.expenses;
            }

            // 3. Liability Logic (Only for Full Transfer currently logic doesn't support partial mortgage split easily)
            // Assuming Stocks don't have specific mortgages linked by name usually.
            if (!asset.symbol) {
                const mortgageIndex = fromPlayer.liabilities.findIndex((l: any) => l.name.includes(asset.title));
                if (mortgageIndex !== -1) {
                    const mortgage = fromPlayer.liabilities[mortgageIndex];
                    fromPlayer.liabilities.splice(mortgageIndex, 1);
                    if (mortgage.expense) {
                        fromPlayer.expenses -= mortgage.expense;
                        fromPlayer.cashflow = fromPlayer.income - fromPlayer.expenses;
                    }
                    // Pass mortgage to dest
                    toPlayer.liabilities.push(mortgage);
                    if (mortgage.expense) {
                        toPlayer.expenses += mortgage.expense;
                        toPlayer.cashflow = toPlayer.income - toPlayer.expenses;
                    }
                }
            }
        }

        // 4. Add to target
        // Check if target has same stock to merge?
        const existingStock = toPlayer.assets.find(a => a.symbol === transferAsset.symbol && a.symbol !== undefined);
        if (existingStock) {
            existingStock.quantity = (existingStock.quantity || 0) + (transferAsset.quantity || 1);
            existingStock.cashflow = (existingStock.cashflow || 0) + (transferAsset.cashflow || 0);
            // Add Cashflow to target
            if (transferAsset.cashflow) {
                toPlayer.passiveIncome += transferAsset.cashflow;
                toPlayer.income = toPlayer.salary + toPlayer.passiveIncome;
                toPlayer.cashflow = toPlayer.income - toPlayer.expenses;
            }
        } else {
            toPlayer.assets.push(transferAsset);
            // Add Cashflow to target
            if (transferAsset.cashflow) {
                toPlayer.passiveIncome += transferAsset.cashflow;
                toPlayer.income = toPlayer.salary + toPlayer.passiveIncome;
                toPlayer.cashflow = toPlayer.income - toPlayer.expenses;
            }
        }

        // 7. Check Fast Track for both
        this.checkFastTrackCondition(fromPlayer);
        this.checkFastTrackCondition(toPlayer);

        // 8. Log and Record
        const cashflowStr = asset.cashflow ? ` (Поток: $${asset.cashflow})` : '';
        this.addLog(`🤝 ${fromPlayer.name} передал ${quantity}x ${asset.title}${cashflowStr} игроку ${toPlayer.name}`);
        this.recordTransaction({
            from: fromPlayer.name,
            to: toPlayer.name,
            amount: 0, // Asset transfer
            description: `Transferred ${quantity}x ${asset.title}`,
            type: 'TRANSFER'
        });
    }

    dismissCard() {
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];

        // Auto-deduct Expense or Mandatory Card if not paid
        if (this.state.currentCard && (this.state.currentCard.type === 'EXPENSE' || this.state.currentCard.mandatory) && currentPlayer) {
            const expenseCost = this.state.currentCard.cost || 0;

            // If player hasn't paid (we're dismissing), force payment
            if (expenseCost > 0) {
                // Check if player can afford
                if (currentPlayer.cash >= expenseCost) {
                    currentPlayer.cash -= expenseCost;
                    this.addLog(`💸 ${currentPlayer.name} paid expense: ${this.state.currentCard.title} (-$${expenseCost})`);
                } else {
                    // Auto-take loan if can't afford
                    const loanAmount = Math.ceil((expenseCost - currentPlayer.cash) / 1000) * 1000;
                    currentPlayer.loanDebt += loanAmount;
                    currentPlayer.cash += loanAmount;
                    this.addLog(`💳 ${currentPlayer.name} взял кредит $${loanAmount} на оплату расходов`);
                    currentPlayer.cash -= expenseCost;
                    this.addLog(`💸 ${currentPlayer.name} paid expense: ${this.state.currentCard.title} (-$${expenseCost})`);
                }
            }
        }

        // Discard the card before clearing it (Only if NOT persistent)
        if (this.state.currentCard) {
            const isPersistent = this.state.activeMarketCards?.some(ac => ac.card.title === this.state.currentCard?.title && ac.expiresAt > Date.now());

            // USER REQUEST FIX: Stock Deals should persist for 2 minutes for everyone
            const isStockDeal = (this.state.currentCard.type === 'DEAL_SMALL' || this.state.currentCard.type === 'DEAL_BIG') && this.state.currentCard.symbol;

            if (isStockDeal && !isPersistent) {
                // Move to Active Market Cards
                if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
                this.state.activeMarketCards.push({
                    id: `${this.state.currentCard.id}_mkt_${Date.now()}`,
                    card: this.state.currentCard,
                    sourcePlayerId: currentPlayer.id,
                    expiresAt: Date.now() + 120000 // 2 Minutes
                });
                this.addLog(`📢 ${this.state.currentCard.title} доступна всем 2 минуты!`);
            } else if (!isPersistent) {
                this.cardManager.discard(this.state.currentCard);
            }
        }
        this.state.currentCard = undefined;
        this.state.phase = 'ACTION';
    }

    transferDeal(fromUserId: string, toPlayerId: string, activeCardId: string) {
        let activeCard = this.state.activeMarketCards?.find(ac => ac.id === activeCardId);

        // CHECK IF IT IS CURRENT CARD (Transient Deal)
        if (!activeCard && this.state.currentCard && this.state.currentCard.id === activeCardId) {
            // It is the current card. We need to "keep" it by moving to activeMarketCards
            activeCard = {
                id: this.state.currentCard.id,
                card: this.state.currentCard,
                sourcePlayerId: this.state.players[this.state.currentPlayerIndex].id, // Current player is owner
                expiresAt: Date.now() + 60000 // 1 minute to decide
            };
            if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
            this.state.activeMarketCards.push(activeCard);

            // Clear current card since it's now "on the market" (transferred)
            this.state.currentCard = undefined;
            this.state.phase = 'ACTION';
        }

        if (!activeCard) {
            throw new Error("Deal not found or expired");
        }

        // Find players by userId
        const fromPlayer = this.state.players.find(p => p.userId === fromUserId);
        const toPlayer = this.state.players.find(p => p.id === toPlayerId); // toPlayerId might be socket.id from UI

        if (!fromPlayer || !toPlayer) {
            throw new Error("Player not found");
        }

        // Check ownership using userId
        if (activeCard.sourcePlayerId !== fromPlayer.id) {
            throw new Error("You are not the owner of this deal");
        }

        // Transfer Ownership to target player's socket.id
        activeCard.sourcePlayerId = toPlayer.id;

        // Extend Timer if < 60s
        const now = Date.now();
        const timeRemaining = activeCard.expiresAt - now;
        if (timeRemaining < 60000) {
            activeCard.expiresAt = now + 60000;
        }

        const card = activeCard.card;
        const details = [];
        if (card.cost) details.push(`Cost: $${card.cost}`);
        if (card.cashflow) details.push(`Flow: $${card.cashflow}`);

        const detailsStr = details.length > 0 ? ` [${details.join(', ')}]` : '';
        this.addLog(`🤝 ${fromPlayer.name} передал сделку "${card.title}"${detailsStr} игроку ${toPlayer.name}`);
    }

    sellAsset(playerId: string) {
        const player = this.state.players.find(p => p.id === playerId);
        let card = this.state.currentCard;

        if (!player) return;

        // Fallback: Check Active Market Cards if current card is invalid or missing
        if (!card || (card.type !== 'MARKET' && !card.offerPrice)) {
            // Find matching active card for any of player's assets
            const validCards = this.state.activeMarketCards?.filter(ac => ac.expiresAt > Date.now()) || [];
            for (const ac of validCards) {
                // Check matching
                if (ac.card.type === 'MARKET' || (ac.card.offerPrice && ac.card.offerPrice > 0)) {
                    // Do we have the asset?
                    const matches = player.assets.some(a => a.title === ac.card.targetTitle || a.title.includes(ac.card.targetTitle || ''));
                    if (matches) {
                        card = ac.card;
                        break;
                    }
                }
            }
        }

        if (!card) return;
        if ((card.type !== 'MARKET' && !card.offerPrice) || !card.targetTitle) return;

        const salePrice = card.offerPrice!;

        // Find Asset (Exact or Partial Match)
        let assetIndex = player.assets.findIndex(a => a.title === card.targetTitle);

        if (assetIndex === -1) {
            // Try partial match (e.g. "Mini-hotel" matches "Mini-hotel (Center)")
            assetIndex = player.assets.findIndex(a => a.title.includes(card.targetTitle || ''));
        }
        if (assetIndex === -1) {
            this.addLog(`${player.name} не может продать: Не владеет ${card.targetTitle}`);
            return;
        }

        const asset = player.assets[assetIndex];

        // Process Sale
        const oldCash = player.cash;
        player.cash += salePrice;

        // Remove Asset
        player.assets.splice(assetIndex, 1);

        // Update Stats (Remove Cashflow)
        if (asset.cashflow) {
            player.passiveIncome -= asset.cashflow;
            player.income = player.salary + player.passiveIncome;
            player.cashflow = player.income - player.expenses;
        }

        // Check for Mortgage (Liability) match AND Pay off
        const mortgageIndex = player.liabilities.findIndex((l: any) => l.name.includes(asset.title));
        if (mortgageIndex !== -1) {
            const mortgage = player.liabilities[mortgageIndex];
            player.cash -= mortgage.value;
            player.liabilities.splice(mortgageIndex, 1);
            // Wait, expense reduction?
            if (mortgage.expense) {
                player.expenses -= mortgage.expense;
                player.cashflow = player.income - player.expenses;
            }
            this.addLog(`💳 Paid off mortgage for ${asset.title} (-$${mortgage.value})`);
        }

        // Return card to deck logic
        // Use stored sourceType if available, else fallback to heuristic
        const inferredType = (asset as any).sourceType || ((asset.cost || 0) > 5000 ? 'DEAL_BIG' : 'DEAL_SMALL');

        const returnedCard: any = {
            id: `returned_${Date.now()}`, // Temporary ID
            type: inferredType,
            title: asset.title,
            description: 'Returned Asset', // Less important
            cost: asset.cost,
            cashflow: asset.cashflow,
        };

        this.cardManager.discard(returnedCard);
        this.addLog(`🔄 Returned ${asset.title} card to ${inferredType === 'DEAL_BIG' ? 'Big Deals' : 'Small Deals'} deck.`);

        this.addLog(`💰 ${player.name} sold ${asset.title} to Market for $${salePrice}`);

        this.recordTransaction({
            from: 'Market',
            to: player.name,
            amount: salePrice,
            description: `Sold ${asset.title}`,
            type: 'PAYDAY' // Use Payday type or Generic Income? Maybe new type 'SALE'? Reusing PAYDAY for Green Color in UI usually. Or 'TRANSFER'.
        });

        this.addLog(`🤝 ${player.name} SOLD ${asset.title} for $${card.offerPrice}. (Cash: ${oldCash} -> ${player.cash})`);

        // Clear card
        this.state.currentCard = undefined;
        this.state.currentCard = undefined;
        this.checkFastTrackCondition(player);
        this.endTurn();
    }

    donateCharity(playerId: string) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;

        let amount = 0;
        if (player.isFastTrack) {
            amount = 100000;
        } else {
            amount = Math.floor(player.income * 0.1);
        }

        if (player.cash < amount) {
            this.addLog(`⚠️ Cannot afford Charity donation ($${amount}).`);
            return;
        }

        player.cash -= amount;
        player.charityTurns = 3; // 3 turns of extra dice
        this.addLog(`❤️ ${player.name} donated $${amount}. Can now roll extra dice for 3 turns!`);

        this.state.phase = 'ROLL'; // Re-enable roll? No, Charity replaces turn action usually?
        // Wait, rule: "Land on Charity -> Donate -> End Turn. Next turns you roll extra."
        // Or "Donate -> Roll"? 
        // Standard: Land on Charity -> Donate (Optional) -> End Turn.
        this.endTurn();
    }

    skipCharity(playerId: string) {
        this.addLog(`${this.state.players.find(p => p.id === playerId)?.name} declined Charity.`);
        this.endTurn();
    }

    buyAsset(playerId: string, quantity: number = 1, cardId?: string) {
        const player = this.state.players.find(p => p.id === playerId);
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];

        if (!player) return;

        // Resolve Card
        let card = this.state.currentCard;
        let isMarketCard = false;

        if (cardId) {
            // Check Active Market Cards
            const match = this.state.activeMarketCards?.find(mc => mc.card.id === cardId);
            if (match) {
                card = match.card;
                isMarketCard = true;
            } else if (this.state.currentCard?.id === cardId) {
                card = this.state.currentCard;
            }
        }

        if (!card) return;

        if (player.id !== currentPlayer.id && !isMarketCard && !card.offerPrice) {
            // Basic strict check. Market cards are open to owner.
            // If I am the owner of a transferred card, I can buy it (handled by ActiveCardZone showing button, but engine must allow).
            // Validating ownership for market cards is complex here as 'activeCard' wrapper has the owner.
            // But if it's in activeMarketCards, it's generally buyable by "someone".
            // If it's a transferred deal, only the new owner should buy.
            // engine.ts earlier lines didn't restrict rigorously?
            // Line 1724 original: if (player.id !== currentPlayer.id)
            // We relax this if we found a specific market card matching the request.
        } else if (player.id !== currentPlayer.id && !isMarketCard) {
            this.addLog(`⚠️ ${player.name} попытался купить вне очереди!`);
            return;
        }

        if (card.type !== 'MARKET' && card.type !== 'DEAL_SMALL' && card.type !== 'DEAL_BIG' && card.type !== 'BUSINESS' && card.type !== 'DREAM' && card.type !== 'EXPENSE') return;

        // Stock Logic:
        if (card.symbol) {
            const costPerShare = card.cost || 0;
            const totalCost = costPerShare * quantity;

            // Check Max Quantity
            if (card.maxQuantity && quantity > card.maxQuantity) {
                this.addLog(`${player.name} cannot buy ${quantity} shares. Limit is ${card.maxQuantity}.`);
                return;
            }

            if (player.cash < totalCost) {
                this.addLog(`${player.name} cannot afford ${quantity} x ${card.title} ($${totalCost})`);
                return;
            }

            player.cash -= totalCost;

            // Find existing stock to merge
            const existingStock = player.assets.find(a => a.symbol === card.symbol);
            if (existingStock) {
                // WEIGHTED AVERAGE COST LOGIC
                const oldQty = existingStock.quantity || 0;
                const oldAvg = existingStock.averageCost || existingStock.cost || 0;
                const newQty = quantity;
                const newPrice = costPerShare;

                const totalValue = (oldQty * oldAvg) + (newQty * newPrice);
                const totalQty = oldQty + newQty;
                const newAvg = totalQty > 0 ? totalValue / totalQty : 0;

                existingStock.quantity = totalQty;
                existingStock.averageCost = newAvg;

                const additionalIncome = (card.cashflow || 0) * quantity;
                existingStock.cashflow = (existingStock.cashflow || 0) + additionalIncome;

                player.passiveIncome += additionalIncome;
                this.addLog(`📈 Bought ${quantity} more ${card.symbol}. Avg Cost: $${Math.round(newAvg)}`);

            } else {
                player.assets.push({
                    title: card.title,
                    cost: card.cost,
                    averageCost: costPerShare, // Init Avg
                    cashflow: (card.cashflow || 0) * quantity,
                    symbol: card.symbol,
                    type: 'STOCK',
                    quantity: quantity,
                    sourceType: card.type
                });
                player.passiveIncome += (card.cashflow || 0) * quantity;
                this.addLog(`📈 Bought ${quantity} x ${card.symbol} at $${costPerShare}`);
            }

            player.income = player.salary + player.passiveIncome;
            player.cashflow = player.income - player.expenses;

            this.addLog(`${player.name} bought ${quantity} ${card.symbol} @ $${card.cost}.`);

            // Discard the stock card so it returns to deck (Market Fluctuation)
            this.cardManager.discard(card);

            // Keep card visible for other players - move to activeMarketCards if it's currentCard
            // EXCEPT for private cards (MLM, CHARITY_ROLL) which should only be visible to buyer
            const isPrivateCard = card.subtype === 'MLM_ROLL' || card.subtype === 'CHARITY_ROLL';

            if (this.state.currentCard?.id === card.id && !isPrivateCard) {
                // Check if it's already in activeMarketCards
                const alreadyInMarket = this.state.activeMarketCards?.some(mc => mc.card.id === card.id);
                if (!alreadyInMarket) {
                    // Move to activeMarketCards so it stays visible
                    if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
                    this.state.activeMarketCards.push({
                        id: `market_${card.id}_${Date.now()}`,
                        card: this.state.currentCard,
                        expiresAt: Date.now() + 120000, // 2 min
                        sourcePlayerId: this.state.players[this.state.currentPlayerIndex].id,
                        dismissedBy: []
                    });
                }
            }

            // Clear currentCard (for all cards including private ones)
            if (this.state.currentCard?.id === card.id) {
                this.state.currentCard = undefined;
                this.state.phase = 'ACTION';
            }
            // Cards stay visible to other players who might want to sell (except private cards)

            return;
        }

        // Real Estate / Business Logic (Quantity always 1)
        const costToPay = card.downPayment !== undefined ? card.downPayment : (card.cost || 0);

        if (player.cash < costToPay) {
            this.addLog(`${player.name} cannot afford ${card.title} ($${costToPay})`);
            return;
        }

        let mlmResult = undefined;
        let shouldAddAsset = true;

        // MLM Logic (Subtype check)
        if (card.subtype === 'MLM_ROLL') {
            // Roll dice to determine partners
            const partners = Math.floor(Math.random() * 6) + 1; // 1-6
            // Calculate cashflow
            const cashflowPerPartner = (card.cost || 0) * 0.5;
            const totalCashflow = partners * cashflowPerPartner;

            // Modify card/asset properties for this transaction
            card.cashflow = totalCashflow;
            card.title = `${card.title} (${partners} Partners)`;

            this.addLog(`🎲 Выпало ${partners}! Привлечено ${partners} партнеров.`);
            mlmResult = { mlmRoll: partners, mlmCashflow: totalCashflow };
        } else if (card.subtype === 'CHARITY_ROLL') {
            // "Friend asks for a loan": 3 Random Outcomes
            const roll = Math.floor(Math.random() * 3) + 1; // 1, 2, 3

            if (roll === 1) {
                // 1. Friend went bust (Investments burned)
                shouldAddAsset = false;
                this.addLog(`📉 Друг прогорел... Ваши инвестиции ($${costToPay}) сгорели.`);
            } else if (roll === 2) {
                // 2. Friend succeeded (Business with $1000 income)
                shouldAddAsset = true;
                // Mutate card properties for the asset creation
                card.title = "Бизнес друга";
                card.cashflow = 1000;
                // card.cost remains what you paid
                this.addLog(`📈 Друг раскрутился! Вы получаете долю в бизнесе (+$1000/мес).`);
            } else if (roll === 3) {
                // 3. Friend shared wisdom (3x Charity Turns)
                shouldAddAsset = false;
                player.charityTurns = 3;
                this.addLog(`🎓 Друг поделился мудростью! Вы получаете 3 хода с 2 кубиками.`);
            }
        }

        player.cash -= costToPay;

        // Handle Expense Payment (No Asset added)
        // Exception: CHARITY_ROLL has its own outcome logic (shouldAddAsset flag)
        if ((card.type === 'EXPENSE' || card.mandatory) && card.subtype !== 'CHARITY_ROLL') {
            this.addLog(`${player.name} paid: ${card.title} (-$${costToPay})`);

            // Discard the paid expense card
            if (this.state.currentCard && this.state.currentCard.id === card.id) {
                this.cardManager.discard(this.state.currentCard);
                this.state.currentCard = undefined;
                this.endTurn();
                return;
            } else if (isMarketCard) {
                // Discard from market
                this.cardManager.discard(card);
                this.state.activeMarketCards = this.state.activeMarketCards?.filter(mc => mc.card.id !== card.id);
                // Don't end turn if paying off a market card (unless logic dictates)
                return;
            }

            this.state.currentCard = undefined;
            this.endTurn();
            return;
        }

        // Add Asset
        if (shouldAddAsset) {
            const assetCashflow = card.cashflow || 0;
            player.assets.push({
                title: card.title,
                cost: card.cost,
                cashflow: assetCashflow,
                symbol: card.symbol,
                type: card.assetType || (card.symbol ? 'STOCK' : 'REAL_ESTATE'), // Use explicit type or fallback
                quantity: 1,
                businessType: card.businessType, // Store business type
                sourceType: card.type // Store original card type (DEAL_SMALL, DEAL_BIG) for Discard Return logic
            });

            // Update player income stats
            if (assetCashflow > 0) {
                player.passiveIncome += assetCashflow;
                player.income = player.salary + player.passiveIncome;
                player.cashflow = player.income - player.expenses;
            }
        }

        // Handling Discard/Clean up after buy
        // Keep card visible for other players - move to activeMarketCards if it's currentCard
        // EXCEPT for private cards (MLM, CHARITY_ROLL) which should only be visible to buyer
        const isPrivateCard = card.subtype === 'MLM_ROLL' || card.subtype === 'CHARITY_ROLL';

        if (this.state.currentCard?.id === card.id && !isPrivateCard) {
            // Check if it's already in activeMarketCards
            const alreadyInMarket = this.state.activeMarketCards?.some(mc => mc.card.id === card.id);
            if (!alreadyInMarket) {
                // Move to activeMarketCards so it stays visible
                if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
                this.state.activeMarketCards.push({
                    id: `market_${card.id}_${Date.now()}`,
                    card: this.state.currentCard,
                    expiresAt: Date.now() + 120000, // 2 min
                    sourcePlayerId: this.state.players[this.state.currentPlayerIndex].id,
                    dismissedBy: []
                });
            }
        }

        // Clear currentCard (for all cards including private ones)
        if (this.state.currentCard?.id === card.id) {
            this.state.currentCard = undefined;
            this.state.phase = 'ACTION';
        }
        // Don't remove from activeMarketCards - let cleanup handle it when all players dismiss (except private cards)


        // Fast Track Board Ownership Logic
        const cardAny = card as any;
        if (cardAny.targetSquareIndex !== undefined) {
            const sqIndex = cardAny.targetSquareIndex;
            // Ensure global index is correct?
            // Since handleFastTrackSquare set it from `square.index`, checking if it's correct.
            // Usually yes.

            // Check if it was a Buyout
            if (cardAny.isBuyout && cardAny.ownerId) {
                const prevOwner = this.state.players.find(p => p.id === cardAny.ownerId);
                if (prevOwner) {
                    // Pay Previous Owner
                    prevOwner.cash += (card.cost || 0);
                    this.addLog(`💸 ${player.name} paid $${card.cost} to ${prevOwner.name} for ${card.title}`);

                    // Remove Asset from Previous Owner
                    // Need to find asset by Title? Or by Square Index if tracked?
                    // Currently Assets don't store Square Index explicitly.
                    // But Title should be unique enough for FT businesses?
                    // "Moneo Corp", "Yoga Center"...
                    const assetIdx = prevOwner.assets.findIndex(a => a.title === card.title);
                    if (assetIdx !== -1) {
                        const removed = prevOwner.assets[assetIdx];
                        prevOwner.assets.splice(assetIdx, 1);

                        // Recalc Previous Owner Stats
                        if (removed.cashflow) {
                            prevOwner.passiveIncome -= removed.cashflow;
                            prevOwner.income = prevOwner.salary + prevOwner.passiveIncome;
                            prevOwner.cashflow = prevOwner.income - prevOwner.expenses;
                        }
                    }
                }
            }

            // Set New Owner on Board
            // We need to mutate the board in state
            // We need to find the square in FULL_BOARD logic.
            // If `this.state.board` is the source of truth, we update it there.
            // `sqIndex` came from `square.index` on the board.
            const boardSq = this.state.board.find(b => b.index === sqIndex);
            if (boardSq) {
                boardSq.ownerId = player.id;
            }
        }

        // Update Stats
        if (card.cashflow) {
            player.passiveIncome += card.cashflow;
            player.income = player.salary + player.passiveIncome;
            player.cashflow = player.income - player.expenses;
        }

        // Add Liability (Mortgage) if downpayment was used
        if (card.downPayment !== undefined && (card.cost || 0) > card.downPayment) {
            const mortgage = (card.cost || 0) - card.downPayment;
            player.liabilities.push({ name: `Mortgage (${card.title})`, value: mortgage });
        }

        this.addLog(`${player.name} купил ${card.title}. Пассивный доход +$${card.cashflow || 0}`);

        // Clear card so it isn't discarded in endTurn
        this.state.currentCard = undefined;

        this.checkFastTrackCondition(player);
        this.checkWinCondition(player);
        // Do NOT end turn. Allow player to continue actions.
        this.state.phase = 'ACTION';

        return mlmResult;
    }

    giveCash(playerId: string, amount: number) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;
        if (amount <= 0) return;

        player.cash += amount;
        this.addLog(`🎁 Host gave $${amount.toLocaleString()} to ${player.name}`);

        this.recordTransaction({
            from: 'Host',
            to: player.name,
            amount: amount,
            description: 'Gift from Host',
            type: 'PAYDAY' // Green positive visual
        });

        this.checkFastTrackCondition(player);
    }

    sellStock(playerId: string, quantity: number) {
        const player = this.state.players.find(p => p.id === playerId);
        const card = this.state.currentCard;

        if (!player || !card) return;
        if (!card.symbol) return; // Must be stock card

        // Find stock in assets
        const stockIndex = player.assets.findIndex(a => a.symbol === card.symbol);
        if (stockIndex === -1) return;
        const stock = player.assets[stockIndex];

        if ((stock.quantity || 0) < quantity) {
            this.addLog(`${player.name} cannot sell ${quantity} ${stock.symbol}: Only have ${stock.quantity}`);
            return;
        }

        const price = card.cost || 0; // Current price is usually defined in card.cost for Stock Cards
        const saleTotal = price * quantity;

        player.cash += saleTotal;

        // Update Asset
        stock.quantity -= quantity;

        // Reduce Cashflow (assuming proportional)
        // If cashflow was total:
        if (stock.cashflow) {
            const cashflowPerShare = stock.cashflow / (stock.quantity + quantity);
            const lostCashflow = cashflowPerShare * quantity;
            stock.cashflow -= lostCashflow;
            player.passiveIncome -= lostCashflow;
            player.income = player.salary + player.passiveIncome;
            player.cashflow = player.income - player.expenses;
        }

        if (stock.quantity <= 0) {
            player.assets.splice(stockIndex, 1);
        }

        this.addLog(`📈 ${player.name} sold ${quantity} ${card.symbol} @ $${price} for $${saleTotal}`);

        // Do NOT end turn. Selling stock is an open market action.
        this.checkFastTrackCondition(player);
    }

    transferFunds(fromId: string, toId: string, amount: number) {
        const fromPlayer = this.state.players.find(p => p.id === fromId);
        const toPlayer = this.state.players.find(p => p.id === toId);

        if (!fromPlayer || !toPlayer) return;
        if (fromPlayer.cash < amount) {
            this.addLog(`${fromPlayer.name} failed transfer: Insufficient funds.`);
            return;
        }

        fromPlayer.cash -= amount;
        toPlayer.cash += amount;

        this.recordTransaction({
            from: fromPlayer.name,
            to: toPlayer.name,
            amount,
            description: 'Transfer',
            type: 'TRANSFER'
        });

        this.addLog(`${fromPlayer.name} transferred $${amount} to ${toPlayer.name}`);
    }

    private recordTransaction(t: Omit<Transaction, 'id' | 'timestamp'>) {
        this.state.transactions.unshift({
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            ...t
        });
        // Keep last 50 transactions
        if (this.state.transactions.length > 50) this.state.transactions.pop();
    }

    checkTurnTimeout(): boolean {
        // Bot Logic Hook
        const player = this.state.players[this.state.currentPlayerIndex];
        if (player && player.userId && player.userId.startsWith('bot_')) {
            // Check if we should move
            const now = Date.now();
            // Default 2 second delay between bot actions
            if (!this.botNextActionAt) this.botNextActionAt = now + 2000;

            if (now >= this.botNextActionAt) {
                this.makeBotMove();
                this.botNextActionAt = now + 2500; // Schedule next move
                return true; // Use return true to signal state change? 
                // Actually makeBotMove changes state, but Gateway uses return value to know if it should emit 'turn_ended'.
                // 'turn_ended' event usually just sends state.
                // If bot moves, we definitely strictly want to update state.
                // But checkTurnTimeout caller (Gateway) emits 'turn_ended' ONLY if true returned.
                // 'turn_ended' prompt might be confusing if it wasn't a timeout.
                // Gateway line 58: `this.io.to(roomId).emit('turn_ended', { state: game.getState() });`
                // It's just a state sync labeled 'turn_ended'.
                // So returning true is fine to force sync.
            }
            return false;
        } else {
            // Reset bot timer when human turn
            this.botNextActionAt = 0;
        }

        // Return true if state changed (turn ended)
        if (this.state.turnExpiresAt && Date.now() > this.state.turnExpiresAt) {
            if (player) {
                this.addLog(`⌛ Turn timeout for ${player.name}`);
            }
            this.endTurn();
            return true;
        }
        return false;
    }

    /**
     * Cleanup market cards that are expired or dismissed by all players
     */
    cleanupMarketCards() {
        if (!this.state.activeMarketCards) return;

        const now = Date.now();
        const activePlayers = this.state.players.filter(p => !p.isBankrupted && !p.hasWon);

        this.state.activeMarketCards = this.state.activeMarketCards.filter(mc => {
            // Remove if expired
            if (mc.expiresAt < now) {
                this.cardManager.discard(mc.card);
                return false;
            }

            // Remove if all active players dismissed it
            if (mc.dismissedBy && activePlayers.length > 0) {
                const allDismissed = activePlayers.every(p => mc.dismissedBy?.includes(p.id));
                if (allDismissed) {
                    this.cardManager.discard(mc.card);
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Dismiss a market card for a specific player
     */
    dismissMarketCard(playerId: string, cardId: string) {
        const marketCard = this.state.activeMarketCards?.find(mc => mc.card.id === cardId || mc.id === cardId);
        if (!marketCard) return;

        if (!marketCard.dismissedBy) {
            marketCard.dismissedBy = [];
        }

        if (!marketCard.dismissedBy.includes(playerId)) {
            marketCard.dismissedBy.push(playerId);
            this.addLog(`${this.state.players.find(p => p.id === playerId)?.name} закрыл карточку`);
        }

        this.cleanupMarketCards();
    }

    endTurn() {
        // 1. Clean up expired Active Cards
        if (this.state.activeMarketCards) {
            // Find expired ones to discard properly
            const expired = this.state.activeMarketCards.filter(ac => ac.expiresAt <= Date.now());
            // Remove expired from list
            this.state.activeMarketCards = this.state.activeMarketCards.filter(ac => ac.expiresAt > Date.now());

            // Discard them? We should discard if they are not in currentCard.
            // But simplest is: when they leave 'activeMarketCards', we discard them?
            // Actually, if we didn't discard in dismissCard, we must discard now.
            for (const exp of expired) {
                this.cardManager.discard(exp.card);
            }
        }

        // 2. Clear current card (Discard if not persistent)
        if (this.state.currentCard) {
            const isPersistent = this.state.activeMarketCards?.some(ac => ac.card.title === this.state.currentCard?.title);
            if (!isPersistent) {
                this.cardManager.discard(this.state.currentCard);
            }
            this.state.currentCard = undefined;
        }

        // Clear events
        this.state.lastEvent = undefined;

        let attempts = 0;
        const totalPlayers = this.state.players.length;

        // Safely iterate to find next valid player
        while (attempts < totalPlayers * 2) { // Cap at 2 loops to prevent infinite freezes
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % totalPlayers;
            const nextPlayer = this.state.players[this.state.currentPlayerIndex];

            // 1. Bankrupted or Won -> SKIP PERMANENTLY
            if (nextPlayer.isBankrupted || nextPlayer.hasWon) {
                // Log only once per full cycle to avoid spam? Or just log.
                // this.addLog(`⏩ Skipping ${nextPlayer.name} (${nextPlayer.isBankrupted ? 'Bankrupted' : 'Finished'})`);
                attempts++;
                continue;
            }

            // 2. Skipped Turns -> Decrement and Skip
            if ((nextPlayer.skippedTurns || 0) > 0) {
                nextPlayer.skippedTurns--;
                this.addLog(`🚫 ${nextPlayer.name} skips turn (Remaining: ${nextPlayer.skippedTurns})`);
                this.state.lastEvent = { type: 'TURN_SKIPPED', payload: { player: nextPlayer.name, remaining: nextPlayer.skippedTurns } };
                attempts++;
                continue;
            }

            // Valid player found
            break;
        }

        this.state.phase = 'ROLL';
        this.state.currentTurnTime = 120;
        this.state.turnExpiresAt = Date.now() + 120000; // Reset timer 120s

        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        // this.addLog(`Now it is ${activePlayer.name}'s turn.`);
    }

    private forcePayment(player: PlayerState, amount: number, description: string) {
        if (amount <= 0) return;

        if (player.cash >= amount) {
            player.cash -= amount;
            this.addLog(`💸 ${player.name} paid $${amount} for ${description}`);
            return;
        }

        // Insufficient Funds
        const deficit = amount - player.cash;

        // Max Loan Check: 
        // Existing logic: Loan allowed if Cashflow - Interest >= 0.
        // Interest = 10% of Loan.
        // So Max Loan = Cashflow * 10
        // But we must also support existing debt.
        // Actually, `takeLoan` checks future state.
        // `player.cashflow - interest < 0` where interest is NEW interest.
        // So we just iterate taking 1000s until covered or failed.

        // Calculate needed loan
        const neededLoan = Math.ceil(deficit / 1000) * 1000;

        // Dry run check
        const potentialInterest = neededLoan * 0.1;

        if (player.cashflow - potentialInterest >= 0 && !player.isBankrupted) {
            // Auto Take Loan through public method to ensure strict logic
            this.addLog(`⚠️ ${player.name} forcing loan $${neededLoan} for ${description}...`);

            // We need to bypass "turn check" if any? No, takeLoan is open.
            // But takeLoan uses `state.players.find...`. 
            // Better to call internal logic or just `this.takeLoan`.
            this.takeLoan(player.id, neededLoan);

            // Verify if loan was taken (cash increased)
            if (player.cash >= amount) {
                player.cash -= amount;
                this.addLog(`💸 Paid $${amount} after loan.`);
            } else {
                // Failed to take loan despite check? (Maybe block logic?)
                this.bankruptPlayer(player);
            }
        } else {
            // Cannot afford loan -> Bankrupt
            this.bankruptPlayer(player);
        }
    }

    private bankruptPlayer(player: PlayerState) {
        this.addLog(`☠️ ${player.name} IS BANKRUPT! Restarting with penalty...`);
        this.state.lastEvent = { type: 'BANKRUPTCY', payload: { player: player.name } };

        // Reset Logic
        // player.isBankrupted = true; // DO NOT set to true effectively removing them. Prompt says "начинает заново".
        // "начинает заново но уже может брать кредит только 50% от суммы пай дай"

        // Reset finances
        const profession = PROFESSIONS.find(p => p.name === player.professionName) || PROFESSIONS[0];

        player.cash = profession.savings;
        player.income = profession.salary;
        player.expenses = profession.expenses;
        player.cashflow = profession.salary - profession.expenses;
        player.passiveIncome = 0;

        player.assets = [];
        // Restore initial liabilities
        const liabilities = [];
        if (profession.carLoan) liabilities.push({ name: 'Car Loan', value: profession.carLoan.cost, expense: profession.carLoan.payment });
        if (profession.creditCard) liabilities.push({ name: 'Credit Card', value: profession.creditCard.cost, expense: profession.creditCard.payment });
        if (profession.schoolLoan) liabilities.push({ name: 'School Loan', value: profession.schoolLoan.cost, expense: profession.schoolLoan.payment });
        if (profession.mortgage) liabilities.push({ name: 'Mortgage', value: profession.mortgage.cost, expense: profession.mortgage.payment });
        if (profession.retailDebt) liabilities.push({ name: 'Retail Debt', value: profession.retailDebt.cost, expense: profession.retailDebt.payment });
        player.liabilities = liabilities;

        player.loanDebt = 0;
        player.position = 0;
        player.isFastTrack = false;
        player.childrenCount = 0;
        player.charityTurns = 0;
        player.skippedTurns = 0;

        // Penalty
        player.loanLimitFactor = 0.5;
        this.addLog(`ℹ️ ${player.name} restarted. Loan Limit reduced to 50%.`);
    }

    resolveBabyRoll(): number | { total: number, values: number[] } {
        const player = this.state.players[this.state.currentPlayerIndex];
        const roll = Math.floor(Math.random() * 6) + 1;
        const rollResult = { total: roll, values: [roll] };

        if (roll <= 4) {
            player.childrenCount++;
            const childExpense = 400; // Fixed per user rule
            player.expenses += childExpense;
            player.cashflow = player.income - player.expenses;
            // "3 разово выплачивается 5000$"
            player.cash += 5000;

            this.addLog(`👶 Baby Born! (Roll: ${roll}). +$5000 Gift. Expenses +$${childExpense}/mo`);
            this.state.lastEvent = { type: 'BABY_BORN', payload: { player: player.name } };
        } else {
            this.addLog(`No Baby (Roll: ${roll}). Better luck next time!`);
            this.state.lastEvent = { type: 'BABY_MISSED', payload: { player: player.name } };
        }

        this.state.phase = 'ACTION'; // Enable Next
        return rollResult;
    }

    // Force End Game & Calculate Rankings
    public calculateFinalRankings() {
        const sortedPlayers = [...this.state.players].sort((a, b) => {
            // 1. Fast Track Priority
            if (a.isFastTrack && !b.isFastTrack) return -1;
            if (!a.isFastTrack && b.isFastTrack) return 1;

            // 2. Passive Income
            if (a.passiveIncome !== b.passiveIncome) {
                return b.passiveIncome - a.passiveIncome;
            }

            // 3. Cash
            return b.cash - a.cash;
        });

        this.state.rankings = sortedPlayers.map((p, index) => ({
            name: p.name,
            place: index + 1,
            reason: p.isFastTrack ? 'Fast Track' : `Passive Income: $${p.passiveIncome}`
        }));

        if (sortedPlayers.length > 0) {
            this.state.winner = sortedPlayers[0].name;
            this.state.isGameEnded = true;
        }

        return this.state.rankings;
    }

    getState(): GameState {
        return {
            ...this.state,
            deckCounts: this.cardManager.getDeckCounts()
        };
    }
}
