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
    phase: 'ROLL' | 'ACTION' | 'END' | 'OPPORTUNITY_CHOICE' | 'CHARITY_CHOICE' | 'BABY_ROLL' | 'DOWNSIZED_DECISION' | 'MARKET_WAITING' | 'EXPENSE_WAITING';
    board: BoardSquare[];
    currentCard?: Card;
    log: string[];
    winner?: string;
    transactions: Transaction[];
    turnExpiresAt?: number;
    lastEvent?: { type: string, payload?: any };
    deckCounts?: {
        small: { remaining: number; discarded: number; total: number };
        big: { remaining: number; discarded: number; total: number };
        market: { remaining: number; discarded: number; total: number };
        expense: { remaining: number; discarded: number; total: number };
    };
    rankings?: { name: string; reason: string; place: number; id?: string; userId?: string }[];
    isGameEnded?: boolean;
    isPaused?: boolean;
    pauseStartTime?: number;
    chat: ChatMessage[];
    activeMarketCards?: ActiveCard[]; // Cards currently on the board (Market Offers)

    // Tutorial Mode
    isTutorial?: boolean;
    tutorialStep?: number; // 0: Start, 1: Bought Stock (Ready to Sell)
    gameMode?: 'ENGINEER' | 'ENTREPRENEUR';
    isLocked?: boolean;
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
    type: 'TRANSFER' | 'LOAN' | 'REPAY' | 'PAYDAY' | 'EXPENSE' | 'INCOME';
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
    isSkippingTurns?: boolean; // Sandbox mode for winners
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

export interface BoardSquare {
    index: number;
    type: 'DEAL' | 'MARKET' | 'EXPENSE' | 'PAYDAY' | 'BABY' | 'CHARITY' | 'DOWNSIZED' | 'DREAM' | 'BUSINESS' | 'LOSS' | 'STOCK_EXCHANGE' | 'LOTTERY' | 'DOODAD';
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
    { index: 66, type: 'BUSINESS', name: 'Франшиза', cost: 100000, cashflow: 10000, description: 'Франшиза MONEO' },
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

    constructor(roomId: string, players: IPlayer[], creatorId?: string, options: { isTutorial?: boolean; gameMode?: 'ENGINEER' | 'ENTREPRENEUR'; availableDreams?: string[] } = {}) {
        // Init CardManager with DB Templates
        const templates = DbCardManager.getInstance().getTemplates();
        this.cardManager = new CardManager(templates);
        this.state = {
            roomId,
            creatorId,
            players: players.map(p => this.initPlayer(p, options.gameMode)),
            currentPlayerIndex: 0,
            currentTurnTime: 120,
            phase: 'ROLL',
            isPaused: true,
            board: this.initializeBoardWithDreams(options.availableDreams),
            log: ['Game Started'],
            chat: [],
            transactions: [],
            turnExpiresAt: Date.now() + 120000, // Init first turn timer
            isTutorial: options.isTutorial || false,
            tutorialStep: 0,
            gameMode: options.gameMode || 'ENGINEER',
            isLocked: false,
        };

        // USER REQUEST 1: Initial Savings Transaction
        this.state.players.forEach(p => {
            if (p.cash > 0) {
                this.state.transactions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now(),
                    from: 'Bank',
                    to: p.name,
                    amount: p.cash,
                    description: 'Стартовый капитал',
                    type: 'INCOME'
                });
            }
        });
    }

    startGame() {
        if (!this.state.isPaused) return; // Already started
        this.state.isPaused = false;
        this.addLog(`🏁 Игра запущена Хостом!`);
        // Ensure phase is ROLL or valid start phase
        if (this.state.phase !== 'ROLL') {
            this.state.phase = 'ROLL';
        }
        // Init timer for first turn
        this.state.turnExpiresAt = Date.now() + (this.state.currentTurnTime * 1000);
    }

    getCurrentPlayer(): PlayerState {
        return this.state.players[this.state.currentPlayerIndex];
    }

    // Alias for consistency if Gateway calls handleRoll
    handleRoll(callerId: string) {
        const player = this.getCurrentPlayer();
        if (player.id !== callerId) {
            throw new Error("Not your turn");
        }
        return this.rollDice(2);
    }




    initPlayer(p: IPlayer, gameMode: string = 'ENGINEER'): PlayerState {
        // Assign Profession based on Mode
        let profession = PROFESSIONS.find(prof => prof.name === 'Manager'); // Default

        if (gameMode === 'ENTREPRENEUR') {
            const ent = PROFESSIONS.find(prof => prof.name === 'Entrepreneur');
            if (ent) profession = ent;
        } else {
            // Ensure Manager
            const eng = PROFESSIONS.find(prof => prof.name === 'Manager');
            if (eng) profession = eng;
        }

        // Fallback (should not happen if professions.ts is correct)
        if (!profession) profession = PROFESSIONS[0];

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

    initializeBoardWithDreams(availableDreams?: string[]): BoardSquare[] {
        // Return static board with fixed dreams (no shuffling/overwriting)
        return FULL_BOARD.map(sq => ({ ...sq }));
    }

    getDeckContent(type: string) {
        const templates = DbCardManager.getInstance().getTemplates();
        if (type === 'SMALL') {
            return templates.small;
        }
        if (type === 'BIG') {
            return templates.big;
        }
        return [];
    }

    // --- Helper for Consistency ---
    recalculateFinancials(player: PlayerState) {
        if (player.isFastTrack) {
            this.recalculateFastTrackFinancials(player);
            return;
        }

        // 1. Calculate Passive Income from Assets
        let totalPassive = 0;
        player.assets.forEach(asset => {
            // Usually cashflow is "Total" for that asset line
            if (asset.cashflow) {
                totalPassive += Number(asset.cashflow);
            }
        });
        if (isNaN(totalPassive)) totalPassive = 0;

        // 2. Update Passive Income
        if (player.passiveIncome !== totalPassive) {
            console.log(`[Sync] Correcting Passive Income for ${player.name}: ${player.passiveIncome} -> ${totalPassive}`);
            player.passiveIncome = totalPassive;
        }

        // 3. Optional: Recalculate Expenses based on Profession + Children + Loans
        // This is safer to ensure expenses don't drift (e.g. child added but expense missed)
        const prof = PROFESSIONS.find(p => p.name === player.professionName);
        if (prof) {
            // Sync Child Cost
            if (player.childCost !== prof.perChildCost) {
                player.childCost = prof.perChildCost;
            }
            player.salary = prof.salary;
            player.income = player.salary + player.passiveIncome;
            // Determine expenses components
            const taxes = prof.taxes || 0;
            const otherExpenses = prof.otherExpenses || 0;
            const childExpenses = player.childrenCount * player.childCost;

            // Static liabilities from profession (if they still exist in player's liabilities list)
            // We should check if player HAS the liability before adding cost, or use the liability list directly.
            // Best way: Sum up specific liabilities by name to match Profession structure, 
            // OR just trust the liability list for everything except Taxes/Other/Child.

            let homeMortgage = 0;
            let schoolLoanPayment = 0;
            let carLoanPayment = 0;
            let creditCardPayment = 0;
            let retailPayment = 0;
            let bankLoanPayment = 0;
            let realEstateBusinessExpenses = 0;

            player.liabilities.forEach(l => {
                if (!l.expense) return;
                switch (l.name) {
                    case 'Mortgage': homeMortgage += l.expense; break;
                    case 'School Loan': schoolLoanPayment += l.expense; break;
                    case 'Car Loan': carLoanPayment += l.expense; break;
                    case 'Credit Card': creditCardPayment += l.expense; break;
                    case 'Retail Debt': retailPayment += l.expense; break;
                    case 'Bank Loan': bankLoanPayment += l.expense; break;
                    default: realEstateBusinessExpenses += l.expense; break; // Custom assets
                }
            });

            const totalLiabilityPayments = homeMortgage + schoolLoanPayment + carLoanPayment + creditCardPayment + retailPayment + bankLoanPayment + realEstateBusinessExpenses;

            // 6. Set Final Expenses
            player.expenses = taxes + otherExpenses + childExpenses + totalLiabilityPayments;

            // 7. Breakdown
            player.expenseBreakdown = {
                taxes,
                homeMortgage,
                schoolLoanPayment,
                carLoanPayment,
                creditCardPayment,
                retailPayment,
                otherExpenses,
                childExpenses,
                bankLoanPayment,
                liabilityExpenses: realEstateBusinessExpenses
            };
        }

        // 4. Update Final Cashflow
        player.income = player.salary + player.passiveIncome;
        player.cashflow = player.income - player.expenses;
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

        if (this.state.isPaused) {
            console.log(`[Bot] Game Paused. Skipping move.`);
            return;
        }

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
                    // CRITICAL FIX: Always pay for Mandatory items (Expenses, Doodads)
                    const isMandatory = c.type === 'EXPENSE' || c.mandatory;

                    if (isMandatory) {
                        shouldBuy = true;
                        this.addLog(`🤖 ${player.name} оплачивает обязательный расход: ${c.title}`);
                    } else if (isHard) {
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
                } else {
                    // Cannot afford?
                    const isMandatory = c.type === 'EXPENSE' || c.mandatory;
                    if (isMandatory) {
                        // If it's mandatory and we can't afford, we MUST still try to "buy" it 
                        // because buyAsset -> forcePayment handles bankruptcy/loans.
                        // If we just skip, we cheat death.
                        shouldBuy = true;
                        this.addLog(`🤖 ${player.name} пытается оплатить (нехватка средств): ${c.title}`);
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
            // Default Action on Timeout: Option 1 (Skip 2 turns, Free)
            this.handleDownsizedDecision(player.id, 'SKIP_TURNS');
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
        if (player.hasWon) return; // Already won

        const incomeGoalMet = player.fastTrackStartIncome !== undefined
            ? (player.passiveIncome >= player.fastTrackStartIncome + 50000)
            : (player.passiveIncome >= 50000);

        const businessCount = player.assets.filter(a => a.type === 'BUSINESS').length;
        const dreamBought = player.assets.some(a => a.type === 'DREAM' && a.title === player.dream);

        // Win Condition: +50k Income OR (Buy Dream AND 2 Businesses)
        let won = false;
        if (incomeGoalMet || (dreamBought && businessCount >= 2)) {
            won = true;
        }

        if (won) {
            player.hasWon = true;
            // Initialize rankings if missing (should be in constructor/interface)
            if (!this.state.rankings) this.state.rankings = [];

            const place = this.state.rankings.length + 1;
            this.state.rankings.push({
                name: player.name,
                reason: incomeGoalMet ? 'Достиг цели по доходу' : 'Купил Мечту и бизнесы',
                place: place,
                id: player.id,
                userId: player.userId
            });

            this.state.lastEvent = {
                type: 'WINNER',
                payload: {
                    player: player.name,
                    reason: incomeGoalMet ? 'Достиг цели по доходу' : 'Купил Мечту и бизнесы'
                }
            };
            this.addLog(`🏆 ${player.name} ЗАНЯЛ ${place}-Е МЕСТО! (${this.state.rankings[this.state.rankings.length - 1].reason})`);
            this.addLog(`✨ Игра продолжается для остальных! ✨`);

            // Allow them to continue playing ("Sandbox Mode") implicitly by not removing them
            // Optionally set isSkippingTurns = false to ensure they can roll if they want, 
            // BUT usually winners might want to spectate. 
            // Request says: "Игра продолжается...". 
            // If they keep playing, they might screw up economy? 
            // Let's leave them active but marked as won.
            player.isSkippingTurns = false;
        }
    }

    toggleSkipTurns(userId: string) {
        const player = this.state.players.find(p => p.userId === userId || p.id === userId);
        if (!player) return;

        // Allow anyone (except bankrupted) to toggle
        if (player.isBankrupted) {
            this.addLog(`⚠️ ${player.name} can't toggle skip (Bankrupted).`);
            return;
        }

        player.isSkippingTurns = !player.isSkippingTurns;
        this.addLog(`${player.name} ${player.isSkippingTurns ? 'paused playing ⏸' : 'resumed playing ▶️'}`);
    }

    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        const status = this.state.isPaused ? 'PAUSED ⏸' : 'RESUMED ▶️';
        this.addLog(`🛑 ADMIN ${status} THE GAME`);

        if (this.state.isPaused) {
            // Pausing: Save current time
            this.state.pauseStartTime = Date.now();
        } else {
            // Resuming: Add elapsed time to expiration
            if (this.state.pauseStartTime && this.state.turnExpiresAt) {
                const elapsed = Date.now() - this.state.pauseStartTime;
                this.state.turnExpiresAt += elapsed;
            }
            this.state.pauseStartTime = undefined;
        }
    }

    reshuffleCards() {
        this.addLog(`🔄 ADMIN reshuffled all decks! (Discarded cards returned to deck)`);
        this.cardManager.reshuffleAllDecks();
    }

    calculateFinalRankings() {
        // 1. Start with existing winners from state.rankings
        const finalRankings = [...(this.state.rankings || [])];

        // 2. Identify players NOT in rankings yet
        const remainingPlayers = this.state.players.filter(p => !p.hasWon);

        // 3. Sort remaining players
        // Criteria: Fast Track > Rat Race.
        // Within Fast Track: Current Cashflow.
        // Within Rat Race: Passive Income > Cash.
        remainingPlayers.sort((a, b) => {
            if (a.isFastTrack && !b.isFastTrack) return -1; // a comes first
            if (!a.isFastTrack && b.isFastTrack) return 1;

            if (a.isFastTrack) {
                // Both Fast Track: Higher Cashflow wins
                return b.cashflow - a.cashflow;
            } else {
                // Both Rat Race: Higher Passive wins, then Cash
                if (b.passiveIncome !== a.passiveIncome) return b.passiveIncome - a.passiveIncome;
                return b.cash - a.cash;
            }
        });

        // 4. Append to rankings
        let currentPlace = finalRankings.length + 1;
        remainingPlayers.forEach(p => {
            finalRankings.push({
                name: p.name,
                place: currentPlace++,
                reason: p.isFastTrack ? 'Fast Track Progress' : 'Rat Race Progress',
                id: p.id,
                userId: p.userId,
                // Additional Stats for breakdown
                // stats: { passive: p.passiveIncome, cash: p.cash }
            });
        });

        this.state.rankings = finalRankings;
        this.state.rankings = finalRankings;
        return finalRankings;
    }

    checkFastTrackVictory(player: PlayerState) {
        // Income goal: +50k passive income compared to start of Fast Track OR absolute 50k if startIncome is missing
        const incomeGoalMet = player.isFastTrack
            ? (player.passiveIncome >= (player.fastTrackStartIncome || 0) + 50000)
            : (player.passiveIncome >= 50000);

        const businessCount = player.assets.filter(a => a.sourceType === 'BUSINESS' || a.type === 'BUSINESS').length;
        const dreamBought = player.assets.some(a => (a.sourceType === 'DREAM' || a.type === 'DREAM') && a.title === player.dream);

        // Win Condition: +50k Income OR (Buy Dream + 2 Businesses)
        let won = false;
        if (incomeGoalMet || (dreamBought && businessCount >= 2)) {
            won = true;
        }

        if (won) {
            player.hasWon = true;
            // Initialize rankings if missing (should be in constructor/interface)
            if (!this.state.rankings) this.state.rankings = [];

            const place = this.state.rankings.length + 1;
            // distinct reasons
            const reason = incomeGoalMet ? 'Достиг цели по доходу' : 'Купил Мечту и бизнесы';

            // Check if already in rankings?
            if (!this.state.rankings.some(r => r.id === player.id)) {
                this.state.rankings.push({
                    name: player.name,
                    reason: reason,
                    place: place,
                    id: player.id,
                    userId: player.userId
                });

                this.state.lastEvent = {
                    type: 'WINNER',
                    payload: {
                        player: player.name,
                        reason: reason
                    }
                };
                this.addLog(`🏆 ${player.name} ЗАНЯЛ ${place}-Е МЕСТО! (${reason})`);
                this.addLog(`✨ Игра продолжается для остальных! ✨`);
            }

            player.isSkippingTurns = false;
        }
    }


    recalculateFastTrackFinancials(player: PlayerState) {
        // Base: Start Income + Sum of Fast Track Business/Dream Cashflows
        const startIncome = player.fastTrackStartIncome || 0;

        let additionalIncome = 0;
        player.assets.forEach(a => {
            // Identify Fast Track assets by sourceType (BUSINESS/DREAM)
            // Note: Rat Race assets usually have type DEAL_SMALL / DEAL_BIG / REAL_ESTATE
            // FAST_TRACK_SQUARES use type 'BUSINESS' or 'DREAM'
            if (a.sourceType === 'BUSINESS' || a.sourceType === 'DREAM') {
                additionalIncome += (Number(a.cashflow) || 0);
            }
        });

        player.passiveIncome = startIncome + additionalIncome;

        // Fast Track: Expenses are 0 (unless specific events add them temporarily?)
        // Standard rule: Cashflow = Passive Income (since Expenses 0)
        // Ensure manual expense additions (like Tax Audit?) are preserved?
        // Usually Expenses are reset to 0 in enterFastTrack.
        // If we have dynamic Fast Track expenses (suits, etc.), we should sum them.
        // For now, assuming expenses are 0 or controlled elsewhere.
        // But `recalculateFinancials` typically overwrites derived stats.
        // Let's keep `player.expenses` if it was set by events?
        // Or should we recalcluate liabilities? 
        // Fast Track Liabilities? "Mortgage (Biz)"?
        // If we added Mortgage, we should sum it.

        let totalExpenses = 0;
        player.liabilities.forEach(l => {
            totalExpenses += (Number(l.expense) || 0);
        });
        player.expenses = totalExpenses;

        player.income = player.passiveIncome;
        player.cashflow = player.income - player.expenses;
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

    public rollDice(count: number = 1): number | { total: number, values: number[] } {
        // Tutorial Rigging
        if (this.state.isTutorial) {
            const step = this.state.tutorialStep || 0;
            // Step 0: Force Roll 2 (Land on Opportunity)
            if (step === 0) {
                this.addLog(`🎲 (Tutorial) Forced Roll: 2`);
                this.movePlayer(2);
                return { total: 2, values: [2] };
            }
            // Step 1: Force Roll 5 (Land on Market)
            // Start (0) ->(2)-> Opp(2) ->(5)-> Market(7)
            if (step === 1) {
                this.addLog(`🎲 (Tutorial) Forced Roll: 5`);
                this.movePlayer(5);
                return { total: 5, values: [5] };
            }
        }

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

        if (this.state.isPaused) {
            console.log(`[Engine.rollDice] BLOCKED: Game is Paused.`);
            return { total: 0, values: [] };
        }

        // Validate dice count
        let validCount = 1;
        if (player.isFastTrack) validCount = 2; // Default 2 for FT

        // Charity Bonus (Overrides default limitation if active)
        if (player.charityTurns > 0) {
            // Rat Race: Can roll 1 or 2.
            // Fast Track: Can roll 1, 2, or 3 - PERMANENT (no countdown)
            const maxDice = player.isFastTrack ? 3 : 2;
            if (count >= 1 && count <= maxDice) {
                validCount = count;
            } else {
                validCount = maxDice;
                if (count > 0 && count <= maxDice) validCount = count;
            }
            // Decrement moved to endTurn to prevent double counting
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

        // Log the roll details
        if (values.length > 1) {
            this.addLog(`${player.name} выбросил ${values.join('+')} (= ${total})`);
        } else {
            this.addLog(`${player.name} выбросил ${total}`);
        }

        console.log(`[Engine.rollDice] SUCCESS: ${player.name} rolled ${total}, Phase now: ${this.state.phase}`);
        return { total, values };
    }

    handleDownsizedDecision(playerId: string, decision: 'SKIP_TURNS' | 'PAY_1M' | 'PAY_2M' | 'BANKRUPT') {
        const player = this.state.players.find(p => p.id === playerId);
        console.log(`[Downsized] Request from ${playerId}. Decision: ${decision}`);

        if (!player) {
            console.error(`[Downsized] Player not found: ${playerId}`);
            return;
        }

        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (player.id !== currentPlayer.id) {
            console.error(`[Downsized] Not turn owner. Request: ${player.id}, Current: ${currentPlayer.id}`);
            return;
        }

        // Relaxed Check: Currently phase is likely DOWNSIZED_DECISION, but let's log if mismatch
        if (this.state.phase !== 'DOWNSIZED_DECISION') {
            console.warn(`[Downsized] Phase mismatch: ${this.state.phase}. Proceeding anyway if logically consistent.`);
            // Force allow if it looks like we are stuck? 
            // But normally strictly enforced.
            // Let's strict return but with log to identify issue.
            // return; 
            // Actually, if phase is wrong, maybe that's why it fails? 
            // User reports "doesn't work". 
            // If phase was reset to ACTION/ROLL, button wouldn't show?
            // FiredView only shows if phase is correct? No, FiredView depends on... what?
            // ActiveCardZone renders FiredView if `state.phase === 'DOWNSIZED_DECISION'` (checked implicitly by grep not confirming).
            // Wait, strictly check phase.
        }

        const expenses = player.expenses;

        if (decision === 'SKIP_TURNS') {
            // Option 1: Free, Skip 2 turns
            player.skippedTurns = 2;
            this.addLog(`🤒 ${player.name} пропускает 2 хода (Заболел).`);
            console.log(`[Downsized] ${player.name} skipping 2 turns. Calling endTurn.`);
            this.endTurn();

        } else if (decision === 'PAY_1M') {
            const cost = expenses * 1;

            if (player.cash >= cost) {
                player.cash -= cost;
                player.skippedTurns = 1; // "pay 1 month, skip 1 turn"
                this.addLog(`📉 ${player.name} Оплатил расходы за месяц ($${cost}) и пропускает 1 ход.`);
                this.endTurn();
            } else {
                this.addLog(`⚠️ Не может оплатить 1 месяц ($${cost}). Недостаточно средств.`);
            }

        } else if (decision === 'PAY_2M') {
            const cost = expenses * 2;

            if (player.cash >= cost) {
                player.cash -= cost;
                player.skippedTurns = 0; // "pay 2 months, skip 0"
                this.addLog(`🛡️ ${player.name} Оплатил расходы за 2 месяца ($${cost}), чтобы не пропускать ходы!`);
                this.state.phase = 'ACTION'; // Reset phase before ending turn? endTurn sets to ROLL.
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
                    this.addLog(`💰 ${player.name} прошел день расплаты! Доход: $${player.income}, Расходы: $${player.expenses} -> Итог: +$${player.cashflow}`);
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
                    this.addLog(`💰 ${player.name} прошел день расплаты! Доход: $${player.income}, Расходы: $${player.expenses} -> Итог: +$${player.cashflow}`);
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

            case 'DOODAD':
            case 'EXPENSE':
                // Treat Fast Track Doodads/Expenses as mandatory payments
                const ftExpenseCost = square.cost || 0;
                this.addLog(`💸 ${player.name} попал на ТРАТУ: ${square.name} ($${ftExpenseCost})`);

                this.state.currentCard = {
                    id: `ft_exp_${square.index}_${Date.now()}`,
                    type: 'EXPENSE',
                    title: square.name,
                    description: square.description || 'Обязательный расход',
                    cost: ftExpenseCost,
                    mandatory: true,
                    // Synthesize properties
                    cashflow: 0
                } as any;

                // Allow UI to show the card
                this.state.phase = 'ACTION';
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
                this.addLog(`💰 День расплаты! Доход: $${player.income}, Расходы: $${player.expenses} -> Итог: +$${player.cashflow}`);
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
            // Tutorial Override handled separately or inside Draw?
            // Let's keep Tutorial Override inside the DRAW logic to ensure consistent flow.
            // Or here? If we pause here, user clicks Draw, then we see tutorial card.
            this.addLog(`${player.name} попал на РЫНОК. Ждем открытия карты...`);
            this.state.phase = 'MARKET_WAITING';

        } else if (square.type === 'EXPENSE') {
            this.addLog(`${player.name} попал на ТРАТУ. Ждем открытия карты...`);
            this.state.phase = 'EXPENSE_WAITING';



        } else if (square.type === 'BABY') {
            if (player.childrenCount >= 3) {
                this.addLog(`${player.name} уже имеет максимум детей.`);
                this.state.phase = 'ACTION';
            } else {
                this.addLog(`👶 ${player.name} попал на Ребенка! Бросаем кубик...`);
                // Auto-roll for baby immediately
                this.resolveBabyRoll();
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
            const diceOptions = player.isFastTrack ? '1-3 кубиков' : '1-2 кубиков';
            this.addLog(`❤️ Благотворительность: Пожертвуйте ${player.isFastTrack ? '$100k' : '10% от дохода'} ради ${diceOptions} на 3 хода.`);
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
        if (this.state.isTutorial && this.state.tutorialStep === 0) {
            // Force Small Deal: Stock
            card = {
                id: 'tutorial_stock_1',
                type: 'DEAL_SMALL',
                title: 'MYT4U Electronics',
                description: 'Penny Stock! High potential.',
                symbol: 'MYT4U',
                cost: 5,
                cashflow: 0,
                rule: 'Trading range $5-$30'
            } as any;
            // Increment Step
            this.state.tutorialStep = 1;
        } else if (type === 'SMALL') {
            card = this.cardManager.drawSmallDeal();
        } else {
            card = this.cardManager.drawBigDeal();
        }

        if (card) {
            // MLM Pre-Roll Logic to ensure consistency between UI and Transaction
            if (card.subtype === 'MLM_ROLL') {
                const partners = Math.floor(Math.random() * 6) + 1; // 1-6
                const costPerPartner = 1000;
                const cashflowPerPartner = 500; // 500 per partner

                // Store original values if needed, simpler to just override for the instance
                (card as any).baseCost = card.cost;
                (card as any).partners = partners;
                card.cost = partners * costPerPartner;
                card.cashflow = partners * cashflowPerPartner;
                card.title = `${card.title} (${partners} Partners)`;
                card.description = `Roll: ${partners}. Income: +$${card.cashflow}. Cost: $${card.cost}`;
            }

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

        // CHECK OWNERSHIP: Is this asset already owned by someone else?
        // We match by Title AND Type (to avoid generic collisions if any, though Business/Real Estate are key)
        if (card.type === 'REAL_ESTATE' || card.type === 'BUSINESS') {
            for (const p of this.state.players) {
                // Check if player owns this asset
                // We use loose title matching or exact logic?
                // Let's us loose includes for safety or exact ID if available
                // If ID is unique per card template, two players can have "Condo 2Br".
                // BUT "Buyout" implies buying THIS specific instance? 
                // Actually, in Rat Race, cards are drawn from deck. If Player A has "Condo 2Br", and Player B draws "Condo 2Br", 
                // is it the SAME condo? In board games, usually "You found a DEAL".
                // However, user REQUEST is "re-buying". This implies specific targetability.
                // OR it implies "If someone has this card, you can buy it from them".
                // Let's assume if anyone owns an asset with SAME TITLE, it is candidate for buyout.
                // EXCEPT: Multiple people can own "3Br House"?
                // If unique (e.g. "Yoga Center"), then yes.
                // Let's start with strict Title match.
                const existingAsset = p.assets.find(a => a.title === card.title && a.type === card.type);
                if (existingAsset) {
                    card.ownerId = p.id; // Socket ID for UI
                    card.ownerName = p.name;
                    card.isBuyout = true;
                    card.originalCost = existingAsset.cost; // Save original cost basis
                    this.addLog(`🔍 Эту возможность (${card.title}) уже имеет ${p.name}. Возможен выкуп!`);
                    break; // Found owner
                }
            }
        }

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
            // Update source passive income
            if (transferCashflow > 0) {
                this.recalculateFinancials(fromPlayer);
            }
        } else {
            // Full Transfer
            // 1. Remove from source
            fromPlayer.assets.splice(assetIndex, 1);

            // 2. Remove Cashflow from source
            this.recalculateFinancials(fromPlayer);

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
        // Check if target has same stock to merge? (Only for STOCKS)
        const isStock = transferAsset.type === 'STOCK' || transferAsset.type === 'MUTUAL' || transferAsset.type === 'MYSTERY_COIN';
        const existingStock = isStock ? toPlayer.assets.find(a => a.symbol === transferAsset.symbol && a.symbol !== undefined) : undefined;
        if (existingStock) {
            existingStock.quantity = (existingStock.quantity || 0) + (transferAsset.quantity || 1);
            existingStock.cashflow = (existingStock.cashflow || 0) + (transferAsset.cashflow || 0);
            // Add Cashflow to target
            this.recalculateFinancials(toPlayer);
        } else {
            toPlayer.assets.push(transferAsset);
            // Add Cashflow to target
            this.recalculateFinancials(toPlayer);
        }

        // 7. Check Fast Track for both
        this.checkFastTrackCondition(fromPlayer);
        this.checkFastTrackCondition(toPlayer);

        // 8. Log and Record
        const cashflowStr = asset.cashflow ? ` (Поток: $${asset.cashflow})` : '';
        this.addLog(`🤝 ${fromPlayer.name} передал ${quantity}x ${asset.title}${cashflowStr} игроку ${toPlayer.name}`);

    }

    dismissCard() {
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];

        // Auto-deduct Expense or Mandatory Card if not paid
        if (this.state.currentCard && (this.state.currentCard.type === 'EXPENSE' || this.state.currentCard.mandatory) && currentPlayer) {
            const expenseCost = this.state.currentCard.cost || 0;

            // If player hasn't paid (we're dismissing), force payment
            if (expenseCost > 0) {
                // Check if player can afford
                // LOGIC UPDATE: User requested "If Illness and Skipped -> Lose 2 Turns".
                // We identify "Illness" cards by title keywords.
                const title = (this.state.currentCard.title || '').toLowerCase();
                const isIllness = title.includes('болезнь') || title.includes('illness') || title.includes('sick') || title.includes('hospital') || title.includes('ветеринар') || title.includes('стоматолог');

                if (isIllness) {
                    // Apply Penalty instead of Force Pay
                    currentPlayer.skippedTurns = 2; // "пропустить 2 хода"
                    this.addLog(`🤒 ${currentPlayer.name} пропустил карту "${this.state.currentCard.title}" и пропускает 2 хода.`);
                    // Do NOT force payment. Just Skip.
                } else {
                    // Standard Expenses: Force Payment
                    // Directly deduct if possible to avoid internal checks in forcePayment failing?
                    // Or fix forcePayment.
                    // Let's implement direct deduction here for safety, consistent with Charity logic.
                    if (currentPlayer.cash >= expenseCost) {
                        currentPlayer.cash -= expenseCost;
                        this.addLog(`💸 ${currentPlayer.name} оплатил обязательный расход: ${this.state.currentCard.title} ($${expenseCost})`);
                    } else {
                        // Bankrupt logic or Debt?
                        // Usually auto-loan or bankrupt.
                        // Let's rely on takeLoan if possible, or just force negative cash?
                        // Monopoly style: Force negative, must resolve before end turn?
                        // But dismissCard IS end turn essentially.
                        // Let's deduct into negative.
                        currentPlayer.cash -= expenseCost;
                        this.addLog(`💸 ${currentPlayer.name} оплатил (в долг) обязательный расход: ${this.state.currentCard.title} ($${expenseCost})`);
                    }
                }

                // If Bankrupt, stop?
                // dismissCard falls through to discard card and end turn.
                // If bankrupt, endTurn might skip player? 
                // Engine handles bankruptcy state in endTurn.
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
                    expiresAt: Date.now() + 120000, // 2 Minutes
                    dismissedBy: [currentPlayer.id] // CRITICAL FIX: Don't show to the person who just dismissed it
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

        // Find players by userId OR socket id (robust lookup)
        let fromPlayer = this.state.players.find(p => p.userId === fromUserId);
        if (!fromPlayer) {
            // Fallback: Check if fromUserId is actually a socket ID (guest)
            fromPlayer = this.state.players.find(p => p.id === fromUserId);
        }

        const toPlayer = this.state.players.find(p => p.id === toPlayerId); // toPlayerId might be socket.id from UI

        if (!fromPlayer || !toPlayer) {
            console.error(`Transfer Deal Player Not Found: From=${fromUserId}, To=${toPlayerId}`);
            // Log available players for debug
            console.log('Available Players:', this.state.players.map(p => ({ id: p.id, userId: p.userId, name: p.name })));
            throw new Error("Player not found");
        }

        // Check ownership using userId
        if (activeCard.sourcePlayerId !== fromPlayer.id) {
            throw new Error("You are not the owner of this deal");
        }

        // Transfer Ownership to target player's socket.id
        activeCard.sourcePlayerId = toPlayer.id;

        // User Request: "Do not reset turn... let time continue until it ends"
        // OLD Logic: Extend Timer if < 60s
        // NEW Logic: Keep original expiration.
        // const now = Date.now();
        // const timeRemaining = activeCard.expiresAt - now;
        // if (timeRemaining < 60000) {
        //     activeCard.expiresAt = now + 60000;
        // }

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
        this.recalculateFinancials(player);

        // Check for Mortgage (Liability) match AND Pay off
        const mortgageIndex = player.liabilities.findIndex((l: any) => l.name.includes(asset.title));
        if (mortgageIndex !== -1) {
            const mortgage = player.liabilities[mortgageIndex];
            player.cash -= mortgage.value;
            player.liabilities.splice(mortgageIndex, 1);
            // Recalculate again to update expenses after mortgage removal
            this.recalculateFinancials(player);
            // if (mortgage.expense) {
            //     player.expenses -= mortgage.expense;
            //     player.cashflow = player.income - player.expenses;
            // }
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
            amount = Math.max(1000, Math.floor(player.income * 0.1));
        }

        if (player.cash < amount) {
            this.addLog(`⚠️ Cannot afford Charity donation ($${amount}).`);
            return;
        }

        player.cash -= amount;
        // FAST TRACK: Permanent. RAT RACE: 3 Turns.
        // Set to 4 because endTurn() will decrement it immediately for this turn
        player.charityTurns = player.isFastTrack ? 999 : 4;

        const message = player.isFastTrack
            ? `❤️ ${player.name} donated $${amount}. Can now choose 1-3 dice EVERY turn!`
            : `❤️ ${player.name} donated $${amount}. Can now roll extra dice for 3 turns!`;
        this.addLog(message);

        this.recordTransaction({
            from: player.name,
            to: 'Charity',
            amount: amount,
            description: 'Благотворительность (10% от дохода)',
            type: 'EXPENSE'
        });

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

    /**
     * Generic Draw Card for Manual Phases
     */
    drawCard(playerId: string, type: 'MARKET' | 'EXPENSE') {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;
        if (playerId !== this.state.players[this.state.currentPlayerIndex].id) return;

        // Validation based on phase
        if (type === 'MARKET' && this.state.phase !== 'MARKET_WAITING') return;
        if (type === 'EXPENSE' && this.state.phase !== 'EXPENSE_WAITING') return;

        if (type === 'MARKET') {
            // Tutorial Override
            if (this.state.isTutorial && this.state.tutorialStep === 1) {
                const card = {
                    id: 'tutorial_market_1',
                    type: 'MARKET',
                    title: 'Market Boom',
                    description: 'Someone wants to buy MYT4U for $40! Everyone can sell.',
                    targetTitle: 'MYT4U',
                    offerPrice: 40,
                    cost: 0,
                    cashflow: 0
                } as any;

                this.state.currentCard = card;
                this.addLog(`🏪 MARKET (Tutorial): ${card.title} - ${card.description}`);
                if (!this.state.activeMarketCards) this.state.activeMarketCards = [];

                this.state.activeMarketCards.push({
                    id: `market_${Date.now()}`,
                    card,
                    sourcePlayerId: player.id,
                    expiresAt: Date.now() + 600000 // Long expire
                });

                this.state.tutorialStep = 2;
                this.state.phase = 'ACTION';
                return;
            }

            // Normal Market Draw
            const card = this.cardManager.drawMarket();
            if (card) {
                this.state.currentCard = card;
                this.addLog(`🏪 MARKET: ${card.title}`);
                if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
                const activeCard = {
                    id: `market_${Date.now()}`,
                    card,
                    sourcePlayerId: player.id,
                    expiresAt: Date.now() + 60000
                };
                this.state.activeMarketCards.push(activeCard);

                // Scam Logic
                if (card.id === 'mkt_btc_scam') {
                    this.state.players.forEach(p => {
                        const initialCount = p.assets.length;
                        p.assets = p.assets.filter(a => a.symbol !== 'BTC' && a.title !== 'Bitcoin');
                        if (p.assets.length < initialCount) {
                            this.recalculateFinancials(p);
                            this.addLog(`🔥 ${p.name} потерял все биткоины из-за скама биржи!`);
                        }
                    });
                }
                this.state.phase = 'ACTION';
            } else {
                this.addLog(`🏪 РЫНОК: Карты закончились.`);
                this.state.phase = 'ACTION';
                this.endTurn(); // Or specific no card logic?
            }

        } else if (type === 'EXPENSE') {
            const card = this.cardManager.drawExpense();
            if (card) {
                this.state.currentCard = card;
                this.addLog(`💸 Трата: ${card.title} (-$${card.cost || 0})`);
                this.state.phase = 'ACTION';
            } else {
                this.addLog(`💸 Трата: Нет карт расходов.`);
                this.state.phase = 'ACTION';
                // If no expense, end turn?
                this.endTurn();
            }
        }
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

                // CRITICAL: Only card owner can buy from market (UNLESS it is a Market Offer)
                const isMarketOffer = match.card.offerPrice && match.card.offerPrice > 0;

                if (!isMarketOffer && match.sourcePlayerId !== player.id) {
                    this.addLog(`⚠️ ${player.name} не может купить чужую карточку!`);
                    throw new Error('Только владелец карточки может купить!');
                }
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

        if (card.type !== 'MARKET' && card.type !== 'DEAL_SMALL' && card.type !== 'DEAL_BIG' && card.type !== 'BUSINESS' && card.type !== 'DREAM' && card.type !== 'EXPENSE' && card.type !== 'STOCK') return;

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

                this.recalculateFinancials(player);
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
                this.recalculateFinancials(player);
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

        // Check Affordability (Skip for mandatory - handled by forcePayment)
        let isMandatory = card.type === 'EXPENSE' || card.mandatory;

        // Patch for stale DB data: Force mandatory for known damage cards
        if (!isMandatory && (card.title.includes('Roof') || card.title.includes('Крыша') || card.title.includes('Sewer') || card.title.includes('Прорыв'))) {
            isMandatory = true;
        }

        console.log(`[BuyAsset] processing ${card.title} for ${player.name}. Cost: ${costToPay}. Mandatory: ${isMandatory}. Type: ${card.type}`);

        if (player.cash < costToPay && !isMandatory) {
            this.addLog(`${player.name} cannot afford ${card.title} ($${costToPay})`);
            return;
        }

        let mlmResult = undefined;
        let shouldAddAsset = true;

        // MLM Logic (Subtype check)
        // MLM Logic (Subtype check)
        if (card.subtype === 'MLM_ROLL') {
            // Use pre-calculated values from draw time
            const partners = (card as any).partners || (Math.floor(Math.random() * 6) + 1);

            // If fallback (shouldn't happen with new deal logic), apply updates
            if (!(card as any).partners) {
                const cashflowPerPartner = (card.cost || 0) * 0.5;
                card.cashflow = partners * cashflowPerPartner;
                card.title = `${card.title} (${partners} Partners)`;
            }

            this.addLog(`🎲 Выпало ${partners}! Привлечено ${partners} партнеров.`);
            mlmResult = { mlmRoll: partners, mlmCashflow: card.cashflow };
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

        // Handle Payment
        if (isMandatory && card.subtype !== 'CHARITY_ROLL') {
            // Use Force Payment for Expenses/Mandatory
            this.forcePayment(player, costToPay, card.title);

            // If player went bankrupt in forcePayment, stop
            if (this.state.lastEvent?.type === 'BANKRUPTCY') {
                // But wait, forcePayment calls bankruptPlayer which resets state.
                // We should probably end turn immediately or return.
                // engine usually expects turn end.
                this.state.currentCard = undefined;
                this.endTurn();
                return;
            }
        } else {
            // Standard Asset Buy
            player.cash -= costToPay;
        }

        // Handle Expense Payment (No Asset added)
        // Exception: CHARITY_ROLL has its own outcome logic (shouldAddAsset flag)
        if (isMandatory && card.subtype !== 'CHARITY_ROLL') {
            // Logic moved above to forcePayment. 
            // Just clean up.
            // this.addLog(`${player.name} paid: ${card.title} (-$${costToPay})`); // Logged in forcePayment

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
            // Prevent duplicate ownership of Fast Track businesses
            const cardAny = card as any;
            if (cardAny.targetSquareIndex !== undefined) {
                const alreadyOwned = player.assets.some(a => a.title === card.title);
                if (alreadyOwned) {
                    this.addLog(`❌ ${player.name} уже владеет ${card.title}!`);
                    this.state.currentCard = undefined;
                    this.state.phase = 'ACTION';
                    return;
                }
            }

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
            // Standard Rat Race assets handled by recalculateFinancials (called below).
            // Fast Track assets also handled by recalculateFinancials (via new method).
            // So we can remove manual delta updates if we are sure recalculateFinancials is called.
            // It IS called at end of buyCard.
            // So, just trigger victory check.

            this.recalculateFinancials(player);

            if (player.isFastTrack) {
                this.checkFastTrackVictory(player);
            }
        }

        // Handling Discard/Clean up after buy
        // Keep card visible for other players - move to activeMarketCards if it's currentCard
        // EXCEPT for private cards (MLM, CHARITY_ROLL) which should only be visible to buyer
        const isPrivateCard = card.subtype === 'MLM_ROLL' || card.subtype === 'CHARITY_ROLL';

        if (this.state.currentCard?.id === card.id && !isPrivateCard && (card.assetType === 'STOCK' || card.symbol)) {
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
                    dismissedBy: [this.state.players[this.state.currentPlayerIndex].id]
                });
            }
        }

        // Clear currentCard (for all cards including private ones)
        if (this.state.currentCard?.id === card.id) {
            this.state.currentCard = undefined;
            this.state.phase = 'ACTION';
        } else if (isMarketCard) {
            // CRITICAL FIX: If we bought a Deal/Business from Market, it must be removed!
            // Stocks are handled earlier. This block is for unique assets.
            this.state.activeMarketCards = this.state.activeMarketCards?.filter(mc => mc.card.id !== card.id);
            // Optionally discard if needed, but asset is already created.
            // this.cardManager.discard(card); // Only if we want to recycle it immediately? 
            // Better to just remove from active interactions.
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
        this.recalculateFinancials(player);
        // if (card.cashflow) {
        //     player.passiveIncome += card.cashflow;
        //     player.income = player.salary + player.passiveIncome;
        //     player.cashflow = player.income - player.expenses;
        // }

        // Add Liability (Mortgage) if downpayment was used
        if (card.downPayment !== undefined && (card.cost || 0) > card.downPayment) {
            const mortgage = (card.cost || 0) - card.downPayment;
            player.liabilities.push({ name: `Mortgage (${card.title})`, value: mortgage });
        }

        this.addLog(`${player.name} купил ${card.title}. Пассивный доход +$${card.cashflow || 0}`);

        // Critical Fix: Check Win Condition immediately after buying asset (e.g. Dream or Business)
        this.checkWinCondition(player);

        // Clear card so it isn't discarded in endTurn
        this.state.currentCard = undefined;

        this.checkFastTrackCondition(player);
        this.checkWinCondition(player);
        // Do NOT end turn. Allow player to continue actions.
        this.state.phase = 'ACTION';

        return mlmResult;
    }

    giftCash(fromPlayerId: string, toPlayerId: string, amount: number) {
        const fromPlayer = this.state.players.find(p => p.id === fromPlayerId);
        const toPlayer = this.state.players.find(p => p.id === toPlayerId);

        if (!fromPlayer || !toPlayer) throw new Error("Player not found");
        if (amount <= 0) throw new Error("Invalid amount");
        if (fromPlayer.cash < amount) throw new Error("Insufficient funds");

        fromPlayer.cash -= amount;
        toPlayer.cash += amount;

        this.recordTransaction({
            from: fromPlayer.name,
            to: toPlayer.name,
            amount: amount,
            description: 'Gift for Baby 👶',
            type: 'PAYDAY'
        });

        this.addLog(`🎁 ${fromPlayer.name} подарил $${amount.toLocaleString()} игроку ${toPlayer.name}`);

        // Check Fast Track for recipient
        this.checkFastTrackCondition(toPlayer);
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

        // Reduce Cashflow (assuming proportional) - Actually Recalc handles it cleaner
        this.recalculateFinancials(player);

        // if (stock.cashflow) {
        //     const cashflowPerShare = stock.cashflow / (stock.quantity + quantity);
        //     const lostCashflow = cashflowPerShare * quantity;
        //     stock.cashflow -= lostCashflow;
        //     player.passiveIncome -= lostCashflow;
        //     player.income = player.salary + player.passiveIncome;
        //     player.cashflow = player.income - player.expenses;
        // }

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
        if (this.state.isPaused) return false;

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
        if (!this.state.isPaused && this.state.turnExpiresAt && Date.now() > this.state.turnExpiresAt) {
            if (player) {
                this.addLog(`⌛ Turn timeout for ${player.name}`);

                // Auto-Pay Mandatory Expense on Timeout
                if (this.state.currentCard && (this.state.currentCard.type === 'EXPENSE' || this.state.currentCard.mandatory)) {
                    const cost = this.state.currentCard.cost || 0;
                    // Only pay if cost > 0
                    if (cost > 0) {
                        this.addLog(`🤖 Timeout Auto-Pay: ${this.state.currentCard.title}`);
                        this.forcePayment(player, cost, this.state.currentCard.title);
                    }
                }
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
        // CRITICAL FIX: If user clicks "Next" (Skip) on a Mandatory Card (Expense/Doodad), force payment!
        if (this.state.currentCard && (this.state.currentCard.type === 'EXPENSE' || this.state.currentCard.mandatory)) {
            const player = this.state.players[this.state.currentPlayerIndex];
            const cost = this.state.currentCard.cost || 0;

            // Force Deduct
            player.cash -= cost;

            this.addLog(`⚠️ ${player.name} пропустил оплату, списание: ${this.state.currentCard.title} (-$${cost})`);

            this.recordTransaction({
                from: player.name,
                to: 'Bank',
                amount: cost,
                description: `Forced Payment: ${this.state.currentCard.title}`,
                type: 'EXPENSE'
            });
        }
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
            const card = this.state.currentCard;
            const isMarket = card.type === 'MARKET';
            const isStock = !!card.symbol; // Stocks can be sold by anyone
            const isPrivate = card.subtype === 'MLM_ROLL' || card.subtype === 'CHARITY_ROLL';

            // Persist MARKET cards or STOCKS (excluding private ones)
            if ((isMarket || isStock) && !isPrivate) {
                const alreadyActive = this.state.activeMarketCards?.some(ac => ac.card.id === card.id);
                if (!alreadyActive) {
                    if (!this.state.activeMarketCards) this.state.activeMarketCards = [];
                    this.state.activeMarketCards.push({
                        id: `market_${card.id}_${Date.now()}`,
                        card: card,
                        expiresAt: Date.now() + 120000, // 2 mins
                        sourcePlayerId: this.state.players[this.state.currentPlayerIndex].id,
                        dismissedBy: []
                    });
                }
            }

            const isPersistent = this.state.activeMarketCards?.some(ac => ac.card.id === card.id);
            if (!isPersistent) {
                this.cardManager.discard(card);
            }
            this.state.currentCard = undefined;
        }

        // Clear events
        this.state.lastEvent = undefined;

        let attempts = 0;
        const totalPlayers = this.state.players.length;

        // Decrement Charity Turns for the finishing player
        // This ensures the turn they just finished counts against the limit.
        const finishingPlayer = this.state.players[this.state.currentPlayerIndex];
        if (finishingPlayer.charityTurns > 0 && !finishingPlayer.isFastTrack) {
            finishingPlayer.charityTurns--;
        }

        // Safely iterate to find next valid player
        while (attempts < totalPlayers * 2) { // Cap at 2 loops to prevent infinite freezes
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % totalPlayers;
            const nextPlayer = this.state.players[this.state.currentPlayerIndex];

            // 1. Bankrupted -> SKIP PERMANENTLY
            // Winner -> Only skip if they explicitly chose to skip (Sandbox Mode)
            if (nextPlayer.isBankrupted || (nextPlayer.hasWon && nextPlayer.isSkippingTurns)) {
                // Log only if skipping winner
                // if (nextPlayer.hasWon) this.addLog(`⏩ Skipping winner ${nextPlayer.name}`);
                attempts++;
                continue;
            }

            // 2. AFK Players (isSkippingTurns) -> AUTO-SKIP TURN
            if (nextPlayer.isSkippingTurns) {
                this.addLog(`⏸ ${nextPlayer.name} пропускает ход (AFK)`);
                attempts++;
                continue;
            }

            // 3. Skipped Turns -> Decrement and Skip
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

        // Decrement Charity Turns - MOVED TO END_TURN
        // if (activePlayer.charityTurns > 0) {
        //     activePlayer.charityTurns--;
        // }

        if (activePlayer.charityTurns > 0) {
            this.addLog(`🎲 ${activePlayer.name}: Благотворительность активна (осталось ходов: ${activePlayer.charityTurns})`);
        } else if (activePlayer.charityTurns === 0 && this.state.lastEvent?.type === 'CHARITY_EXPIRED') {
            // Optional: Log expiration if we tracked it
        }

        // this.addLog(`Now it is ${activePlayer.name}'s turn.`);
    }

    private forcePayment(player: PlayerState, amount: number, description: string) {
        console.log(`[ForcePayment] Processing for ${player.name}: Amount $${amount}, Desc: ${description}, Cash: ${player.cash}`);
        if (amount <= 0) return;

        if (player.cash >= amount) {
            player.cash -= amount;
            this.addLog(`💸 ${player.name} paid $${amount} for ${description}`);
            console.log(`[ForcePayment] Paid directly. New Cash: ${player.cash}`);
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

    transferCash(fromId: string, toId: string, amount: number) {
        if (amount <= 0) return;

        // Try finding by ID (socket) or userId
        let fromPlayer = this.state.players.find(p => p.id === fromId);
        if (!fromPlayer) fromPlayer = this.state.players.find(p => p.userId === fromId);

        let toPlayer = this.state.players.find(p => p.id === toId);
        if (!toPlayer) toPlayer = this.state.players.find(p => p.userId === toId);

        if (!fromPlayer || !toPlayer) {
            console.error(`[TransferCash] Player not found. From: ${fromId}, To: ${toId}`);
            return;
        }

        if (fromPlayer.cash < amount) {
            this.addLog(`⚠️ ${fromPlayer.name} не хватает денег для перевода ($${amount}).`);
            return;
        }

        fromPlayer.cash -= amount;
        toPlayer.cash += amount;

        this.addLog(`💸 ${fromPlayer.name} перевел $${amount.toLocaleString()} игроку ${toPlayer.name}`);
        this.recordTransaction({
            from: fromPlayer.name,
            to: toPlayer.name,
            amount: amount,
            description: `Перевод средств`,
            type: 'TRANSFER'
        });
        // this.emitState(); // Usually called by gateway after action returns? No, gateway calls getState. 
        // Gateway: game.transferDeal -> state updated -> emit. 
        // So we don't need emitState here if gateway handles it. 
        // Gateway `handleTransferDeal` calls `game.getState` and emits.
        // My new `handleTransferCash` in gateway does NOT emit yet! 
        // Wait, I checked `game.gateway.ts` changes. I added `game.transferCash(...)` but didn't add emit logic!
        // I must fix gateway to emit state!
    }

    resolveBabyRoll(): number | { total: number, values: number[] } {
        const player = this.state.players[this.state.currentPlayerIndex];
        const roll = Math.floor(Math.random() * 6) + 1;
        const rollResult = { total: roll, values: [roll] };

        // User requested 100% success for now
        const success = true;

        if (success) {
            if (player.childrenCount < 3) {
                player.childrenCount++;
                const currentChild = player.childrenCount; // 1, 2, or 3

                const expenseIncrease = 500;
                this.recalculateFinancials(player);

                // 2. Cash Bonus Logic ($5k / $10k / $20k)
                let bonus = 0;
                if (currentChild === 1) bonus = 5000;
                else if (currentChild === 2) bonus = 10000;
                else if (currentChild === 3) bonus = 20000;

                player.cash += bonus;
                this.recordTransaction({
                    from: 'Bank',
                    to: player.name,
                    amount: bonus,
                    description: `Выплата на ребенка #${currentChild}`,
                    type: 'INCOME'
                });

                // 3. Add Non-Transferable Child Asset
                // We define Asset interface here locally or use 'any' if global type missing. 
                // Using 'any' to avoid build errors with missing import.
                const childAsset: any = {
                    id: `child_${Date.now()}_${currentChild}`,
                    title: `Ребенок #${currentChild}`,
                    type: 'OTHER',
                    cost: 0,
                    cashflow: 0,
                    value: 0,
                    quantity: 1,
                    isTransferable: false
                };
                if (!player.assets) player.assets = [];
                player.assets.push(childAsset);

                this.addLog(`👶 Поздравляем! Родился ребёнок #${currentChild}! (Кубик: ${roll})`);
                this.addLog(`💰 Получен бонус: $${bonus.toLocaleString()}`);
                this.addLog(`📉 Расходы увеличены на $${expenseIncrease}`);

                this.state.lastEvent = {
                    type: 'BABY_BORN',
                    payload: {
                        player: player.name,
                        playerId: player.id,
                        roll,
                        childCost: expenseIncrease,
                        bonus: bonus,
                        totalChildren: currentChild
                    }
                };


            } else {
                this.addLog(`👶 У вас уже 3 детей! (Кубик: ${roll}). Больше 3 нельзя.`);
                this.state.lastEvent = {
                    type: 'BABY_BORN',
                    payload: {
                        player: player.name,
                        playerId: player.id,
                        roll,
                        childCost: 0,
                        message: "Максимум детей достигнут"
                    }
                };
            }
        } else {
            this.addLog(`🎲 ${player.name} выбросил ${roll}. Ребёнок не родился.`);
        }

        this.state.phase = 'ACTION'; // Enable Next
        return rollResult;
    }



    getState(): GameState {
        return {
            ...this.state,
            deckCounts: this.cardManager.getDeckCounts()
        };
    }
    // --- Charity Logic ---
    handleCharityChoice(socketId: string, accept: boolean) {
        if (this.state.phase !== 'CHARITY_CHOICE') throw new Error("Not in charity phase");
        const player = this.state.players[this.state.currentPlayerIndex];
        if (player.id !== socketId) throw new Error("Not your turn");

        if (accept) {
            let cost = 0;
            if (player.isFastTrack) {
                cost = 100000;
            } else {
                cost = Math.max(1000, Math.ceil((player.salary + (player.passiveIncome || 0)) * 0.1));
            }

            // Double check validation
            if (player.cash < cost) {
                this.addLog(`⚠️ ${player.name} пытался пожертвовать $${cost}, но имеет только $${player.cash}`);
                throw new Error("Not enough cash");
            }

            player.cash -= cost;
            player.charityTurns = 3; // >0 enables bonus. For FT, it doesn't decrement.

            this.recordTransaction({
                from: player.name,
                to: 'Charity',
                amount: cost,
                description: player.isFastTrack ? 'Charity (Fast Track)' : 'Charity Donation',
                type: 'EXPENSE'
            });

            const bonusText = player.isFastTrack ? "1-3 кубика навсегда" : "2 кубика на 3 хода";
            this.addLog(`💖 ${player.name} пожертвовал $${cost} на благотворительность! (${bonusText})`);
        } else {
            this.addLog(`🤷 ${player.name} отказался от благотворительности.`);
        }

        // After choice, end turn immediately
        this.endTurn();
    }



    // =========================================
    // ADMIN ACTIONS
    // =========================================

    public adminGiveCash(targetPlayerId: string, amount: number) {
        const player = this.state.players.find(p => p.id === targetPlayerId);
        if (!player) throw new Error("Player not found");

        player.cash += amount;
        this.addLog(`💰 ${player.name} получил $${amount.toLocaleString()} от Банка (Админ)`);

        this.recordTransaction({
            from: 'Bank (Admin)',
            to: player.name,
            amount: amount,
            description: 'Admin Grant',
            type: 'INCOME'
        });
        return player;
    }

    public adminSkipTurn(targetPlayerId: string, turns: number, isSkipping: boolean) {
        const player = this.state.players.find(p => p.id === targetPlayerId);
        if (!player) throw new Error("Player not found");

        player.skippedTurns = turns;
        if (isSkipping !== undefined) {
            player.isSkippingTurns = isSkipping;
        }

        if (isSkipping) {
            this.addLog(`🛑 Администратор включил пропуск ходов для ${player.name} (AFK)`);
        } else {
            this.addLog(`▶️ Администратор вернул ${player.name} в игру`);
        }
    }

    public adminForceMove(targetPlayerId: string) {
        // Only allow forcing the CURRENT player
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer.id !== targetPlayerId) {
            throw new Error("Can only force move the active player");
        }

        // Return instructions to Gateway, as we can't emit from here easily without refactor
        // Actually, we can just throw if invalid, and let Gateway call handleRoll
        return true;
    }

}
