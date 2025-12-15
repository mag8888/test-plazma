import { IPlayer } from '../models/room.model';
import { CardManager, Card } from './card.manager';
import { PROFESSIONS } from './professions';

export interface GameState {
    roomId: string;
    players: PlayerState[];
    currentPlayerIndex: number;
    currentTurnTime: number;
    phase: 'ROLL' | 'ACTION' | 'END' | 'OPPORTUNITY_CHOICE' | 'CHARITY_CHOICE';
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
    rankings?: { name: string; reason: string; place: number }[];
    isGameEnded?: boolean;
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
}

export interface BoardSquare {
    index: number;
    type: 'DEAL' | 'MARKET' | 'EXPENSE' | 'PAYDAY' | 'BABY' | 'CHARITY' | 'DOWNSIZED' | 'DREAM' | 'BUSINESS' | 'LOSS' | 'STOCK_EXCHANGE' | 'LOTTERY';
    name: string;
    cost?: number;
    cashflow?: number;
    description?: string;
    action?: 'AUDIT' | 'THEFT' | 'DIVORCE' | 'FIRE' | 'RAID' | 'LOSE_TURN';
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
    { index: 19, type: 'DOWNSIZED', name: 'Downsized', description: 'Увольнение: Пропуск 2 ходов и оплата расходов.' },
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

    constructor(roomId: string, players: IPlayer[]) {
        // Init CardManager
        this.cardManager = new CardManager();
        this.state = {
            roomId,
            players: players.map(p => this.initPlayer(p)),
            currentPlayerIndex: 0,
            currentTurnTime: 120,
            phase: 'ROLL',
            board: FULL_BOARD,
            log: ['Game Started'],
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
            isBankrupted: false
        };
    }

    // Identify user by userId (stable) and update their socket ID
    updatePlayerId(userId: string, newSocketId: string) {
        const player = this.state.players.find(p => p.userId === userId);
        if (player) {
            console.log(`Updating socket ID for user ${userId} from ${player.id} to ${newSocketId}`);
            player.id = newSocketId;
        }
    }

    private checkFastTrackCondition(player: PlayerState) {
        if (player.isFastTrack) return;

        // Condition: Passive Income > 2 * Expenses AND 2 Businesses (Classic or Network)
        // User Requirement: "Current passive income exceeds expenses by 2 times"
        const businessCount = player.assets.filter((a: any) =>
            a.businessType === 'CLASSIC' || a.businessType === 'NETWORK'
        ).length;

        // Reset flag if conditions lost
        player.canEnterFastTrack = false;

        // Check conditions
        if (player.passiveIncome >= (player.expenses * 2) && businessCount >= 2) {
            // NO AUTO TRANSITION. Just enable manual entry.
            // Crucially, Loan must be repaid? User said: "Mandatory condition ... is repayment of loan after entering big track"
            // Wait, "Must repay loan AFTER entering big track" -> No, "mandatory condition for entering is repayment of loan"
            // User text: "обязательным условиям выхода на бльшой трек является погашение кредита"
            // So if loanDebt > 0, cannot enter? Or must repay immediately? 
            // "repayment of loan" implies State: No Debt.

            if (player.loanDebt === 0 && player.cash >= 200000) {
                player.canEnterFastTrack = true;
                if (!this.state.log.some(l => l.includes(`${player.name} can now enter Fast Track`))) {
                    this.state.log.push(`🚀 ${player.name} can now enter Fast Track! (Passive > 2x Expenses, No Debt, $200k Cash)`);
                }
            }
        }
    }

    public enterFastTrack(userId: string) {
        const player = this.state.players.find(p => p.userId === userId || p.id === userId); // robust check
        if (!player) return;
        if (!player.canEnterFastTrack) {
            this.state.log.push(`⚠️ ${player.name} cannot enter Fast Track yet.`);
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

        this.state.log.push(`🚀 ${player.name} ENTERED FAST TRACK! (Goal: +$50k Passive)`);

        // Ensure Log Update
        // this.emitState(); // Handled by Gateway
    }

    rollDice(diceCount: number = 1): number | { total: number, values: number[] } {
        const player = this.state.players[this.state.currentPlayerIndex];

        if (player.skippedTurns > 0) {
            player.skippedTurns--;
            this.state.log.push(`${player.name} skips turn (Remaining: ${player.skippedTurns})`);
            // Do NOT auto end turn. Let user click Next.
            this.state.phase = 'ACTION';
            return 0;
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

        // Phase check? 
        if (this.state.phase !== 'ROLL') return { total: 0, values: [] }; // Prevent double roll

        // Move Player
        this.movePlayer(total);

        // this.state.lastRoll = total; // REMOVED: Property does not exist on type

        // Log the roll details
        if (values.length > 1) {
            this.state.log.push(`${player.name} rolled ${values.join('+')} (= ${total})`);
        } else {
            this.state.log.push(`${player.name} rolled ${total}`);
        }

        return { total, values };
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
                    this.state.log.push(`💰 ${player.name} passed Payday! +$${player.cashflow}`);
                    this.recordTransaction({
                        from: 'Bank',
                        to: player.name,
                        amount: player.cashflow,
                        description: 'Payday (Passed)',
                        type: 'PAYDAY'
                    });
                }

            } else {
                // Rat Race
                const square = this.getSquare(squareIndex);
                if (square && square.type === 'PAYDAY' && i !== steps) {
                    player.cash += player.cashflow;
                    this.state.log.push(`💰 ${player.name} passed Payday! +$${player.cashflow}`);
                    this.recordTransaction({
                        from: 'Bank',
                        to: player.name,
                        amount: player.cashflow,
                        description: 'Payday (Passed)',
                        type: 'PAYDAY'
                    });
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
            this.state.log.push(`${player.name} moved to ${square.name}`);
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

        this.state.log.push(`${player.name} landed on ${square.type}: ${square.name}`);

        // WIN CONDITION:
        // 1. Passive Income +$50k
        // 2. Buy your Dream
        // 3. Buy at least 2 Businesses (User Request: "Купить 2 бизнеса и свою Мечту")

        let won = false;

        const incomeGoalMet = player.fastTrackStartIncome !== undefined
            ? (player.passiveIncome >= player.fastTrackStartIncome + 50000)
            : (player.passiveIncome >= 50000);

        const businessCount = player.assets.filter(a => a.type === 'BUSINESS').length;
        const dreamBought = player.assets.some(a => a.type === 'DREAM' && a.title === player.dream);

        if (incomeGoalMet && dreamBought && businessCount >= 2) {
            won = true;
        }

        if (won && !player.hasWon) {
            player.hasWon = true;
            this.state.log.push(`🏆 ${player.name} HAS WON THE GAME! (+50k Flow, Dream, 2 Businesses)`);
            this.state.log.push(`Game continues for others...`);

            // Broadcast End Game event if needed or handled by state change
        }

        switch (square.type) {
            case 'PAYDAY':
                player.cash += player.cashflow;
                this.state.log.push(`💰 Fast Track Payday! +$${player.cashflow}`);
                break;

            case 'BUSINESS':
            case 'DREAM':
                // Manual Buy Option (User Request)
                // Construct a temporary card for the UI action
                this.state.currentCard = {
                    id: `ft_${square.index}`,
                    type: square.type, // 'BUSINESS' or 'DREAM'
                    title: square.name,
                    description: square.description || '',
                    cost: square.cost,
                    cashflow: square.cashflow,
                    mandatory: false
                } as Card;

                this.state.phase = 'ACTION';
                this.state.log.push(`Found ${square.type}: ${square.name}. Cost $${square.cost}`);
                break;

            case 'LOSS':
                this.handleFastTrackLoss(player, square);
                this.state.phase = 'ACTION';
                break;

            case 'CHARITY':
                // Prompt for Donation
                this.state.phase = 'CHARITY_CHOICE';
                this.state.log.push(`❤️ Charity Opportunity! Donate to gain dice bonus.`);
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
                    this.state.log.push(`📈 Stock Exchange: Rolled ${roll}! You gain $500,000!`);
                } else {
                    this.state.log.push(`📉 Stock Exchange: Rolled ${roll}. No profit.`);
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

                this.state.log.push(`🎰 LOTTERY: Rolled... ${randomSquare.name}!`);

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
            name: p.name,
            place: i + 1,
            reason: p.hasWon ? 'Winner' : p.isFastTrack ? 'Fast Track' : 'Rat Race'
        }));
    }


    handleFastTrackLoss(player: PlayerState, square: BoardSquare) {
        if (!square.action) return;

        if (square.action === 'AUDIT' || square.action === 'DIVORCE') {
            player.cash = Math.floor(player.cash * 0.5);
            this.state.log.push(`📉 ${square.name}: Lost 50% of cash!`);
        } else if (square.action === 'THEFT') {
            player.cash = 0;
            this.state.log.push(`🕵️ ${square.name}: Lost ALL cash!`);
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
                    this.state.log.push(`🔥 ${square.name}: Lost ${lostAsset.title} (Flow: $${lostAsset.cashflow})`);
                }
            } else {
                this.state.log.push(`🔥 ${square.name}: No assets to lose.`);
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
                    this.state.log.push(`👮 ${square.name}: Lost ${lostAsset.title} (Flow: $${lostAsset.cashflow})`);
                }
            } else {
                this.state.log.push(`👮 ${square.name}: No assets to lose.`);
            }
        }
    }

    handleSquare(player: PlayerState, square: BoardSquare) {
        // Default phase to ACTION. Specific squares (Deal, Charity, Downsized) will override this.
        // Payday, Baby, etc. will remain ACTION.
        this.state.phase = 'ACTION';

        this.state.log.push(`${player.name} landed on ${square.type}`);

        if (square.type === 'PAYDAY') {
            // Payday on landing (Indices 6, 12, 18...). Index 0 is usually handled by lap logic (newPos >= 24).
            // To be safe and generous, we pay if it's NOT index 0, OR if we want to ensure payment.
            // Given user feedback "stood on payday", we should pay.
            // We'll skip index 0 if it was just covered by movePlayer, but handleSquare doesn't know previous state.
            // Simplest fix: Pay if square.index !== 0. Index 0 is paid by "Passing Payday" log.
            if (square.index !== 0) {
                player.cash += player.cashflow;
                this.state.log.push(`Checking Day! +$${player.cashflow}`);
                this.recordTransaction({
                    from: 'Bank',
                    to: player.name,
                    amount: player.cashflow,
                    description: 'Payday (Landed)',
                    type: 'PAYDAY'
                });
            } else {
                this.state.log.push(`Entered Payday (Start)!`);
            }
        } else if (square.type === 'DEAL') {
            // Prompt for Small/Big Deal.
            this.state.phase = 'OPPORTUNITY_CHOICE';
        } else if (square.type === 'MARKET') {
            // Draw Market Card immediately
            const card = this.cardManager.drawMarket();
            if (card) {
                this.state.currentCard = card;
                this.state.log.push(`🏪 MARKET: ${card.title} - ${card.description}`);
                // Check if player has the asset?
                // Visuals will handle "Sell" button visibility.
                this.state.phase = 'ACTION';
            } else {
                this.state.log.push(`🏪 MARKET: No cards left.`);
            }
        } else if (square.type === 'EXPENSE') {
            const card = this.cardManager.drawExpense();
            this.state.currentCard = card;
            // Removed automatic deduction. Now handled via buyAsset (Mandatory Pay)
            this.state.log.push(`💸 Expense: ${card.title} ($${card.cost})`);
            this.state.phase = 'ACTION';
        } else if (square.type === 'BABY') {
            if (player.childrenCount >= 3) {
                this.state.log.push(`${player.name} already has max children.`);
            } else {
                // Roll for baby: 1-4 = Born, 5-6 = Not
                const roll = Math.floor(Math.random() * 6) + 1;
                if (roll <= 4) {
                    player.childrenCount++;
                    const childExpense = 400; // Fixed per user rule
                    player.expenses += childExpense;
                    player.cashflow = player.income - player.expenses;
                    // "3 разово выплачивается 5000$"
                    player.cash += 5000;

                    this.state.log.push(`👶 Baby Born! (Roll: ${roll}). +$5000 Gift. Expenses +$${childExpense}/mo`);
                    this.state.lastEvent = { type: 'BABY_BORN', payload: { player: player.name } };
                } else {
                    this.state.log.push(`No Baby (Roll: ${roll}).`);
                }
            }
        } else if (square.type === 'DOWNSIZED') {
            player.skippedTurns = 2; // Fixed 2 turns
            const expenses = player.expenses;
            this.state.log.push(`📉 ${player.name} Downsized! Due: $${expenses}.`);
            this.forcePayment(player, expenses, 'Downsized Expenses');
            // Do NOT end turn automatically. Let user see the popup.
        } else if (square.type === 'CHARITY') {
            this.state.phase = 'CHARITY_CHOICE';
            this.state.log.push(`❤️ Charity: Donate 10% of total income to roll extra dice?`);
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
            this.state.log.push(`Selected ${type} deal: ${card.title}`);
            this.state.phase = 'ACTION';
        } else {
            this.state.log.push(`No ${type} deals left!`);
            this.state.phase = 'ACTION';
        }
    }


    takeLoan(playerId: string, amount: number) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;

        if (amount <= 0 || amount % 1000 !== 0) {
            this.state.log.push(`${player.name} failed to take loan: Amount must be a multiple of 1000.`);
            return;
        }

        if (player.isBankrupted) {
            this.state.log.push(`${player.name} cannot take loans (Bankrupt).`);
            return;
        }

        // Interest 10%
        const interest = amount * 0.1;

        if (player.cashflow - interest < 0) {
            this.state.log.push(`${player.name} failed to take loan: Insufficient Cashflow.`);
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

        this.state.log.push(`${player.name} took loan $${amount}. Expenses +$${interest}/mo`);
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
            this.state.log.push(`${player.name} wanted ${size} deal, but deck is empty!`);
            this.state.phase = 'ACTION';
            return;
        }

        this.state.currentCard = card;

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
                    this.state.log.push(`😅 ${card.title}: Нет недвижимости. Вы ничего не платите.`);
                }
            } else if (card.title.includes('Sewer') || card.title.includes('Прорыв канализации')) {
                // Also requires property ownership usually
                const hasProperty = player.assets.some(a => a.type === 'REAL_ESTATE' || a.title.includes('Home') || a.title.includes('House') || a.title.includes('Condo') || a.title.includes('Plex') || a.title.includes('Дом') || a.title.includes('Квартира') || a.title.includes('Таунхаус'));

                if (!hasProperty) {
                    cost = 0;
                    this.state.log.push(`😅 ${card.title}: Нет недвижимости. Вы ничего не платите.`);
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
                // Cost is 0 (e.g. no property for Roof Leak), so we auto-resolve.
                this.state.log.push(`😅 ${card.title}: No payment required.`);
                this.state.currentCard = undefined;
                this.state.phase = 'ACTION';
                return;
            }
        }

        this.state.log.push(`${player.name} chose ${size} DEAL: ${card.title}`);
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

        this.state.log.push(`${player.name} repaid loan $${amount}. Expenses -$${interest}/mo`);

        // Check Fast Track after repaying loan (might free up cashflow condition)
        this.checkFastTrackCondition(player);
    }

    transferAsset(fromPlayerId: string, toPlayerId: string, assetIndex: number, quantity: number = 1) {
        const fromPlayer = this.state.players.find(p => p.id === fromPlayerId);
        const toPlayer = this.state.players.find(p => p.id === toPlayerId);

        if (!fromPlayer || !toPlayer) return;
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
        this.state.log.push(`🤝 ${fromPlayer.name} transferred ${quantity}x ${asset.title} to ${toPlayer.name}`);
        this.recordTransaction({
            from: fromPlayer.name,
            to: toPlayer.name,
            amount: 0, // Asset transfer
            description: `Transferred ${quantity}x ${asset.title}`,
            type: 'TRANSFER'
        });
    }

    dismissCard() {
        // Just clear the card and return to ACTION phase
        // This allows the player to manually click End Turn later
        this.state.currentCard = undefined;
        this.state.phase = 'ACTION';
    }

    sellAsset(playerId: string) {
        const player = this.state.players.find(p => p.id === playerId);
        const card = this.state.currentCard;

        if (!player || !card) return;
        if (card.type !== 'MARKET' || !card.targetTitle || !card.offerPrice) return;

        // Find Asset
        const assetIndex = player.assets.findIndex(a => a.title === card.targetTitle);
        if (assetIndex === -1) {
            this.state.log.push(`${player.name} cannot sell: Don't own ${card.targetTitle}`);
            return;
        }

        const asset = player.assets[assetIndex];

        // Process Sale
        const oldCash = player.cash;
        player.cash += card.offerPrice;

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
            this.state.log.push(`💳 Paid off mortgage for ${asset.title} (-$${mortgage.value})`);
        }

        // Return card to deck logic
        // We need to reconstruct a Card object compatible with CardManager.discard
        // Heuristic: Cost > 5000 -> Big Deal, else Small Deal?
        // Actually Small Deals usually max at $5k or so?
        // Checking CardManager: Small Deals generated have 'DEAL_SMALL' type.
        // Big Deals have 'DEAL_BIG'.
        // If cost > 5000 it is LIKELY Big Deal (Small deals usually < $5000 cost, though some exceptions).
        // Safest: Check assetType? Stocks are Small Deals usually. Real Estate can be both.
        // Let's assume Cost threshold $6000? 
        // Small Deals generator has some stocks @ $40 but those are exceptions.
        // Real Estate in Small Deals:
        // "Room in suburbs" Cost $3000.
        // "Flipping Studio" Cost $5000.
        // Big Deal "House" Cost $7000+.
        // So Cost >= 6000 is Big Deal. Cost <= 5000 is Small Deal.
        const inferredType = (asset.cost || 0) > 5000 ? 'DEAL_BIG' : 'DEAL_SMALL';

        const returnedCard: any = {
            id: `returned_${Date.now()}`, // Temporary ID
            type: inferredType,
            title: asset.title,
            description: 'Returned Asset', // Less important
            cost: asset.cost,
            cashflow: asset.cashflow,
            // Add other fields if needed for full compliance, but discard mainly checks 'type'
        };

        this.cardManager.discard(returnedCard);
        this.state.log.push(`🔄 Returned ${asset.title} card to ${inferredType === 'DEAL_BIG' ? 'Big Deals' : 'Small Deals'} deck.`);

        this.state.log.push(`💰 ${player.name} sold ${asset.title} to Market for $${card.offerPrice}`);

        this.recordTransaction({
            from: 'Market',
            to: player.name,
            amount: card.offerPrice,
            description: `Sold ${asset.title}`,
            type: 'PAYDAY' // Use Payday type or Generic Income? Maybe new type 'SALE'? Reusing PAYDAY for Green Color in UI usually. Or 'TRANSFER'.
        });

        this.state.log.push(`🤝 ${player.name} SOLD ${asset.title} for $${card.offerPrice}. (Cash: ${oldCash} -> ${player.cash})`);

        // Clear card
        this.state.currentCard = undefined;
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
            this.state.log.push(`⚠️ Cannot afford Charity donation ($${amount}).`);
            return;
        }

        player.cash -= amount;
        player.charityTurns = 3; // 3 turns of extra dice
        this.state.log.push(`❤️ ${player.name} donated $${amount}. Can now roll extra dice for 3 turns!`);

        this.state.phase = 'ROLL'; // Re-enable roll? No, Charity replaces turn action usually?
        // Wait, rule: "Land on Charity -> Donate -> End Turn. Next turns you roll extra."
        // Or "Donate -> Roll"? 
        // Standard: Land on Charity -> Donate (Optional) -> End Turn.
        this.endTurn();
    }

    skipCharity(playerId: string) {
        this.state.log.push(`${this.state.players.find(p => p.id === playerId)?.name} declined Charity.`);
        this.endTurn();
    }

    buyAsset(playerId: string, quantity: number = 1) {
        const player = this.state.players.find(p => p.id === playerId);
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];

        if (!player || !this.state.currentCard) return;

        // Restriction: Only current player can buy the deal on the table
        if (player.id !== currentPlayer.id) {
            this.state.log.push(`⚠️ ${player.name} tried to buy out of turn!`);
            return;
        }

        const card = this.state.currentCard;
        if (card.type !== 'MARKET' && card.type !== 'DEAL_SMALL' && card.type !== 'DEAL_BIG' && card.type !== 'BUSINESS' && card.type !== 'DREAM' && card.type !== 'EXPENSE') return;

        // Stock Logic:
        if (card.symbol) {
            const costPerShare = card.cost || 0;
            const totalCost = costPerShare * quantity;

            // Check Max Quantity
            if (card.maxQuantity && quantity > card.maxQuantity) {
                this.state.log.push(`${player.name} cannot buy ${quantity} shares. Limit is ${card.maxQuantity}.`);
                return;
            }

            if (player.cash < totalCost) {
                this.state.log.push(`${player.name} cannot afford ${quantity} x ${card.title} ($${totalCost})`);
                return;
            }

            player.cash -= totalCost;

            // Find existing stock to merge
            const existingStock = player.assets.find(a => a.symbol === card.symbol);
            if (existingStock) {
                // Weighted Average Cost could be calculated here if needed, but for Cashflow game usually just quantity matters for dividends? 
                // Or just track raw quantity.
                // We will update quantity.
                // If cashflow is per share (Dividend), update it.
                existingStock.quantity = (existingStock.quantity || 0) + quantity;
                // Assuming card.cashflow is PER SHARE? usually yes.
                const additionalIncome = (card.cashflow || 0) * quantity;
                existingStock.cashflow = (existingStock.cashflow || 0) + additionalIncome;

                player.passiveIncome += additionalIncome;
            } else {
                player.assets.push({
                    title: card.title,
                    cost: card.cost, // Cost per share
                    cashflow: (card.cashflow || 0) * quantity,
                    symbol: card.symbol,
                    type: 'STOCK',
                    quantity: quantity
                });
                player.passiveIncome += (card.cashflow || 0) * quantity;
            }

            player.income = player.salary + player.passiveIncome;
            player.cashflow = player.income - player.expenses;

            this.state.log.push(`${player.name} bought ${quantity} ${card.symbol} @ $${card.cost}.`);

            // For stocks, do we clear card? 
            // "Buy 1-100k". If I buy 50, can I buy another 50?
            // Usually Turn ends after buying.
            this.state.currentCard = undefined;
            this.state.phase = 'ACTION';
            return;
        }

        // Real Estate / Business Logic (Quantity always 1)
        const costToPay = card.downPayment !== undefined ? card.downPayment : (card.cost || 0);

        if (player.cash < costToPay) {
            this.state.log.push(`${player.name} cannot afford ${card.title} ($${costToPay})`);
            return;
        }

        let mlmResult = undefined;

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

            this.state.log.push(`🎲 Rolled ${partners}! Recruited ${partners} partners.`);
            mlmResult = { mlmRoll: partners, mlmCashflow: totalCashflow };
        } else if (card.subtype === 'CHARITY_ROLL') {
            // "Friend teaches wisdom": 2 dice for 3 turns.
            player.charityTurns = 3;
            this.state.log.push(`🎲 ${player.name} gained wisdom! Can roll extra dice for 3 turns.`);
        }

        player.cash -= costToPay;

        // Handle Expense Payment (No Asset added)
        if (card.type === 'EXPENSE') {
            // this.state.log.push(`${player.name} paid expense: ${card.title} (-$${costToPay})`);
            // Handled by forcePayment if mandatory? 
            // Wait, buyAsset is "Optional" for Expense? No, Expense is mandatory usually.
            // But buyAsset calls imply "User Clicked Pay".
            // If user clicked pay, we just deduce.
            // But if costToPay > cash?
            // We should use forcePayment behavior logic OR standard logic.
            // User requested "Prevent negative balance".

            // Revert deduction line 1119 (player.cash -= costToPay) for Expenses?
            // No, Line 1119 is explicit.
            // Let's modify logic to Check Balance first.

            // Actually, Expense cards via `buyAsset` means user manually paid.
            // If user manually paid, they must have cash or taken loan manually.
            // We should just enforce "Cannot buy if insufficient". 
            // Line 1096 ALREADY enforces `player.cash < costToPay` return.
            // So if `buyAsset` is called, they CAN pay.
            // For Mandatory items (Losses/Events), that flow is via `resolveOpportunity`.
            // Expense cards drawn from square type 'EXPENSE' are auto-drawn but handled differently. 
            // `handleSquare` line 611 -> sets currentCard -> `buyAsset` button appears.
            // So user manually pays.
            // If they can't pay? They must take loan.
            // We need to allow them to take loan.
            // This is already handled by UI "Take Loan" then "Pay".

            // So buyAsset works for Expense IF checks pass.
            // Line 1123 log.

            this.state.log.push(`${player.name} paid expense: ${card.title} (-$${costToPay})`);
            this.state.currentCard = undefined;
            this.endTurn();
            return;
        }

        // Add Asset
        player.assets.push({
            title: card.title,
            cost: card.cost,
            cashflow: card.cashflow || 0,
            symbol: card.symbol,
            type: card.assetType || (card.symbol ? 'STOCK' : 'REAL_ESTATE'), // Use explicit type or fallback
            quantity: 1,
            businessType: card.businessType // Store business type
        });

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

        this.state.log.push(`${player.name} bought ${card.title}. Passive Income +$${card.cashflow || 0}`);

        // Clear card so it isn't discarded in endTurn
        this.state.currentCard = undefined;

        this.checkFastTrackCondition(player);
        // Do NOT end turn. Allow player to continue actions.
        this.state.phase = 'ACTION';

        return mlmResult;
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
            this.state.log.push(`${player.name} cannot sell ${quantity} ${stock.symbol}: Only have ${stock.quantity}`);
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

        this.state.log.push(`📈 ${player.name} sold ${quantity} ${card.symbol} @ $${price} for $${saleTotal}`);

        // Do NOT end turn. Selling stock is an open market action.
    }

    transferFunds(fromId: string, toId: string, amount: number) {
        const fromPlayer = this.state.players.find(p => p.id === fromId);
        const toPlayer = this.state.players.find(p => p.id === toId);

        if (!fromPlayer || !toPlayer) return;
        if (fromPlayer.cash < amount) {
            this.state.log.push(`${fromPlayer.name} failed transfer: Insufficient funds.`);
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

        this.state.log.push(`${fromPlayer.name} transferred $${amount} to ${toPlayer.name}`);
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
        // Return true if state changed (turn ended)
        if (this.state.turnExpiresAt && Date.now() > this.state.turnExpiresAt) {
            const player = this.state.players[this.state.currentPlayerIndex];
            if (player) {
                this.state.log.push(`⌛ Turn timeout for ${player.name}`);
            }
            this.endTurn();
            return true;
        }
        return false;
    }

    endTurn() {
        // Discard current card if it exists (was not bought)
        if (this.state.currentCard) {
            this.cardManager.discard(this.state.currentCard);
            this.state.currentCard = undefined;
        }

        // Clear events
        this.state.lastEvent = undefined;

        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
        this.state.phase = 'ROLL';
        this.state.currentTurnTime = 120;
        this.state.turnExpiresAt = Date.now() + 120000; // Reset timer 120s

        // Handle skipped turns for next player immediately?
        // Simple recursion check
        const nextPlayer = this.state.players[this.state.currentPlayerIndex];
        if (nextPlayer.skippedTurns > 0) {
            nextPlayer.skippedTurns--;
            this.state.log.push(`🚫 ${nextPlayer.name} skips turn (Remaining: ${nextPlayer.skippedTurns})`);
            this.state.lastEvent = { type: 'TURN_SKIPPED', payload: { player: nextPlayer.name, remaining: nextPlayer.skippedTurns } };
            this.endTurn(); // Recursively skip
        }
    }

    private forcePayment(player: PlayerState, amount: number, description: string) {
        if (amount <= 0) return;

        if (player.cash >= amount) {
            player.cash -= amount;
            this.state.log.push(`💸 ${player.name} paid $${amount} for ${description}`);
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
            this.state.log.push(`⚠️ ${player.name} forcing loan $${neededLoan} for ${description}...`);

            // We need to bypass "turn check" if any? No, takeLoan is open.
            // But takeLoan uses `state.players.find...`. 
            // Better to call internal logic or just `this.takeLoan`.
            this.takeLoan(player.id, neededLoan);

            // Verify if loan was taken (cash increased)
            if (player.cash >= amount) {
                player.cash -= amount;
                this.state.log.push(`💸 Paid $${amount} after loan.`);
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
        this.state.log.push(`☠️ ${player.name} IS BANKRUPT! Resetting...`);
        this.state.lastEvent = { type: 'BANKRUPTCY', payload: { player: player.name } };

        // Reset Logic
        player.isBankrupted = true;

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
    }

    getState(): GameState {
        return {
            ...this.state,
            deckCounts: this.cardManager.getDeckCounts()
        };
    }
}
