import { IPlayer } from '../models/room.model';
import { CardManager, Card } from './card.manager';
import { PROFESSIONS } from './professions';

export interface GameState {
    roomId: string;
    players: PlayerState[];
    currentPlayerIndex: number;
    currentTurnTime: number;
    phase: 'ROLL' | 'ACTION' | 'END' | 'OPPORTUNITY_CHOICE';
    board: BoardSquare[];
    currentCard?: Card;
    log: string[];
    winner?: string;
    transactions: Transaction[];
    turnExpiresAt?: number;
    lastEvent?: { type: string, payload?: any };
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
}

export interface BoardSquare {
    index: number;
    type: 'DEAL' | 'MARKET' | 'EXPENSE' | 'PAYDAY' | 'BABY' | 'CHARITY' | 'DOWNSIZED' | 'DREAM' | 'BUSINESS' | 'LOSS';
    name: string;
    cost?: number;
    cashflow?: number;
    description?: string;
    action?: 'AUDIT' | 'THEFT' | 'DIVORCE' | 'FIRE' | 'RAID' | 'LOSE_TURN';
}

// Mock Board Configuration (Rat Race - 24 Squares)
export const RAT_RACE_SQUARES: BoardSquare[] = [
    { index: 0, type: 'DEAL', name: 'Opportunity' },
    { index: 1, type: 'EXPENSE', name: 'Doodad' },
    { index: 2, type: 'DEAL', name: 'Opportunity' },
    { index: 3, type: 'CHARITY', name: 'Charity' },
    { index: 4, type: 'DEAL', name: 'Opportunity' },
    { index: 5, type: 'PAYDAY', name: 'Payday' },
    { index: 6, type: 'DEAL', name: 'Opportunity' },
    { index: 7, type: 'MARKET', name: 'Market' },
    { index: 8, type: 'DEAL', name: 'Opportunity' },
    { index: 9, type: 'EXPENSE', name: 'Doodad' },
    { index: 10, type: 'DEAL', name: 'Opportunity' },
    { index: 11, type: 'BABY', name: 'Baby' },
    { index: 12, type: 'DEAL', name: 'Opportunity' },
    { index: 13, type: 'PAYDAY', name: 'Payday' },
    { index: 14, type: 'DEAL', name: 'Opportunity' },
    { index: 15, type: 'MARKET', name: 'Market' },
    { index: 16, type: 'DEAL', name: 'Opportunity' },
    { index: 17, type: 'EXPENSE', name: 'Doodad' },
    { index: 18, type: 'DEAL', name: 'Opportunity' },
    { index: 19, type: 'DOWNSIZED', name: 'Downsized' },
    { index: 20, type: 'DEAL', name: 'Opportunity' },
    { index: 21, type: 'PAYDAY', name: 'Payday' },
    { index: 22, type: 'DEAL', name: 'Opportunity' },
    { index: 23, type: 'MARKET', name: 'Market' },
];

export const FAST_TRACK_SQUARES: BoardSquare[] = [
    // 1 (Index 24)
    { index: 24, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 2
    { index: 25, type: 'DREAM', name: 'Дом мечты', cost: 100000, description: 'Построить дом мечты для семьи' },
    // 3
    { index: 26, type: 'BUSINESS', name: 'Кофейня', cost: 100000, cashflow: 3000, description: 'Кофейня в центре города' },
    // 4
    { index: 27, type: 'LOSS', name: 'Аудит', action: 'AUDIT', description: 'Налоговая проверка. Вы теряете половину наличных.' },
    // 5
    { index: 28, type: 'BUSINESS', name: 'SPA Центр', cost: 270000, cashflow: 5000, description: 'Центр здоровья и спа' },
    // 6
    { index: 29, type: 'DREAM', name: 'Антарктида', cost: 150000, description: 'Посетить Антарктиду' },
    // 7
    { index: 30, type: 'BUSINESS', name: 'App Startup', cost: 420000, cashflow: 10000, description: 'Мобильное приложение (подписка)' },
    // 8
    { index: 31, type: 'CHARITY', name: 'Благотворительность', description: 'Благотворительный взнос' },
    // 9
    { index: 32, type: 'BUSINESS', name: 'Digital Agency', cost: 160000, cashflow: 4000, description: 'Агентство цифрового маркетинга' },
    // 10
    { index: 33, type: 'LOSS', name: 'Кража', action: 'THEFT', description: 'Кража. Вы теряете 100% наличных.' },
    // 11
    { index: 34, type: 'BUSINESS', name: 'Бутик-отель', cost: 200000, cashflow: 5000, description: 'Мини-отель/бутик-гостиница' },
    // 12
    { index: 35, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 13
    { index: 36, type: 'BUSINESS', name: 'Ресторан', cost: 320000, cashflow: 8000, description: 'Франшиза популярного ресторана' },
    // 14
    { index: 37, type: 'DREAM', name: '7 Вершин', cost: 500000, description: 'Подняться на все высочайшие вершины мира' },
    // 15
    { index: 38, type: 'BUSINESS', name: 'Бутик-отель', cost: 200000, cashflow: 4000, description: 'Мини-отель/бутик-гостиница' },
    // 16
    { index: 39, type: 'DREAM', name: 'Бестселлер', cost: 300000, description: 'Стать автором книги-бестселлера' },
    // 17
    { index: 40, type: 'BUSINESS', name: 'Йога-центр', cost: 170000, cashflow: 4500, description: 'Йога- и медитационный центр' },
    // 18
    { index: 41, type: 'LOSS', name: 'Развод', action: 'DIVORCE', description: 'Развод. Вы теряете половину наличных.' },
    // 19
    { index: 42, type: 'BUSINESS', name: 'Автомойки', cost: 120000, cashflow: 3000, description: 'Сеть автомоек самообслуживания' },
    // 20
    { index: 43, type: 'DREAM', name: 'Яхта (Средиземное)', cost: 300000, description: 'Жить год на яхте в Средиземном море' },
    // 21
    { index: 44, type: 'BUSINESS', name: 'Салон красоты', cost: 500000, cashflow: 15000, description: 'Салон красоты/барбершоп' },
    // 22
    { index: 45, type: 'DREAM', name: 'Фестиваль', cost: 200000, description: 'Организовать мировой фестиваль' },
    // 23
    { index: 46, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 24
    { index: 47, type: 'BUSINESS', name: 'Интернет-магазин', cost: 110000, cashflow: 3000, description: 'Онлайн-магазин одежды' },
    // 25
    { index: 48, type: 'LOSS', name: 'Пожар', action: 'FIRE', description: 'Пожар. Вы теряете бизнес с минимальным доходом.' },
    // 26
    { index: 49, type: 'DREAM', name: 'Ретрит-центр', cost: 500000, description: 'Построить ретрит-центр' },
    // 27
    { index: 50, type: 'DREAM', name: 'Фонд талантов', cost: 300000, description: 'Создать фонд поддержки талантов' },
    // 28
    { index: 51, type: 'DREAM', name: 'Кругосветка', cost: 200000, description: 'Кругосветное плавание на паруснике' },
    // 29
    { index: 52, type: 'BUSINESS', name: 'Эко-ранчо', cost: 1000000, cashflow: 20000, description: 'Туристический комплекс (эко-ранчо)' },
    // 30
    { index: 53, type: 'DREAM', name: 'Кругосветка', cost: 300000, description: 'Кругосветное плавание на паруснике' },
    // 31
    { index: 54, type: 'BUSINESS', name: 'IPO Биржа', cost: 50000, cashflow: 500000, description: 'Биржа (Шанс выплаты 500к)' }, // Logic needs dice roll support? Assuming direct cashflow for now or special logi. User said "If 5 or 6". I'll mark it BUSINESS for now.
    // 32
    { index: 55, type: 'DREAM', name: 'Частный самолет', cost: 1000000, description: 'Купить частный самолёт' },
    // 33
    { index: 56, type: 'BUSINESS', name: 'NFT Платформа', cost: 400000, cashflow: 12000, description: 'NFT-платформа' },
    // 34
    { index: 57, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    // 35
    { index: 58, type: 'BUSINESS', name: 'Школа языков', cost: 20000, cashflow: 3000, description: 'Школа иностранных языков' },
    // 36
    { index: 59, type: 'DREAM', name: 'Суперкары', cost: 1000000, description: 'Купить коллекцию суперкаров' },
    // 37
    { index: 60, type: 'BUSINESS', name: 'Школа будущего', cost: 300000, cashflow: 10000, description: 'Создать школу будущего для детей' },
    // 38
    { index: 61, type: 'DREAM', name: 'Снять фильм', cost: 500000, description: 'Снять полнометражный фильм' },
    // 39
    { index: 62, type: 'LOSS', name: 'Рейдерство', action: 'RAID', description: 'Рейдерский захват. Вы теряете бизнес с крупным доходом.' },
    // 40
    { index: 63, type: 'DREAM', name: 'Лидер мнений', cost: 1000000, description: 'Стать мировым лидером мнений' },
    // 41
    { index: 64, type: 'BUSINESS', name: 'Автомойки', cost: 120000, cashflow: 3500, description: 'Сеть автомоек самообслуживания' },
    // 42
    { index: 65, type: 'DREAM', name: 'Яхта', cost: 300000, description: 'Белоснежная Яхта' },
    // 43
    { index: 66, type: 'BUSINESS', name: 'Франшиза', cost: 100000, cashflow: 10000, description: 'Франшиза "поток денег"' },
    // 44
    { index: 67, type: 'DREAM', name: 'Космос', cost: 250000, description: 'Полёт в космос' },
    // 45
    { index: 68, type: 'BUSINESS', name: 'Пекарня', cost: 300000, cashflow: 7000, description: 'Пекарня с доставкой' },
    // 46
    { index: 69, type: 'DREAM', name: 'Фонд', cost: 200000, description: 'Организовать благотворительный фонд' },
    // 47
    { index: 70, type: 'BUSINESS', name: 'EdTech', cost: 200000, cashflow: 5000, description: 'Онлайн-образовательная платформа' },
    // 48 (Padding to complete loop)
    { index: 71, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' }
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
            skippedTurns: 0
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
        // "passive income covers expenses * 2 AND loans usually 0"
        if (player.passiveIncome >= player.expenses * 2 && player.loanDebt === 0) {
            // Transition
            player.isFastTrack = true;
            player.position = 0; // Reset to start of Outer Track
            player.cash += 100000; // Bonus for exiting?
            this.state.log.push(`🚀 ${player.name} ENTERED FAST TRACK!`);
        }
    }

    rollDice(): number {
        const player = this.state.players[this.state.currentPlayerIndex];

        if (player.skippedTurns > 0) {
            player.skippedTurns--;
            this.state.log.push(`${player.name} skips turn (Remaining: ${player.skippedTurns})`);
            this.endTurn();
            return 0;
        }

        const roll1 = Math.floor(Math.random() * 6) + 1;
        // const roll2 = Math.floor(Math.random() * 6) + 1; 
        const total = roll1;

        // Phase check? 
        if (this.state.phase !== 'ROLL') return 0; // Prevent double roll

        this.movePlayer(total);
        return total;
    }

    movePlayer(steps: number) {
        const player = this.state.players[this.state.currentPlayerIndex];

        if (player.isFastTrack) {
            const trackLength = 48; // Fast Track length
            let newPos = player.position + steps;

            // Fast Track Payday Logic
            if (newPos >= trackLength) {
                newPos = newPos % trackLength;
                player.cash += player.cashflow; // Or specific Fast Track Amount?
                this.state.log.push(`${player.name} passed Fast Track Payday! +$${player.cashflow}`);
            }
            player.position = newPos;

            // Handle Squares (Mock for now, using modulo to simulate types)
            this.handleFastTrackSquare(player, newPos);

        } else {
            // Rat Race Logic
            const oldPos = player.position;
            let newPos = player.position + steps;

            if (newPos >= 24) {
                newPos = newPos % 24;
                // Payday
                player.cash += player.cashflow;
                this.state.log.push(`${player.name} passed Payday! +$${player.cashflow}`);
            }
            player.position = newPos;
            const square = this.getSquare(newPos);
            this.state.log.push(`${player.name} moved to ${square.name}`);
            this.handleSquare(player, square);
        }
        this.state.phase = 'ACTION';
    }

    private getSquare(pos: number): BoardSquare {
        return this.state.board[pos];
    }

    handleFastTrackSquare(player: PlayerState, position: number) {
        const square = this.getSquare(position); // Use the actual square data
        this.state.log.push(`${player.name} landed on ${square.type}: ${square.name}`);

        // WIN CONDITION: Cashflow >= 50,000 (Simplified rule)
        // Standard rule: Initial Cashflow + 50k. For now, absolute 50k is a good target.
        if (player.cashflow >= 50000) {
            this.state.winner = player.name;
            this.state.phase = 'END';
            this.state.log.push(`🏆 ${player.name} WINS THE GAME (Cashflow Goal)!`);
            return;
        }

        switch (square.type) {
            case 'PAYDAY':
                player.cash += player.cashflow;
                this.state.log.push(`💰 Fast Track Payday! +$${player.cashflow}`);
                break;

            case 'BUSINESS':
            case 'DREAM':
                // Auto-buy logic for simplicity or prompts?
                // Fast Track moves fast. Let's auto-buy if affordable, else skip.
                if (square.cost && player.cash >= square.cost) {
                    player.cash -= square.cost;
                    // Dreams don't usually add cashflow, but Businesses do.
                    if (square.cashflow) {
                        player.cashflow += square.cashflow;
                        player.income += square.cashflow;
                        player.passiveIncome += square.cashflow;
                        player.assets.push({ title: square.name, cost: square.cost, cashflow: square.cashflow });
                        this.state.log.push(`✅ Bought ${square.name} for $${square.cost}. Flow +$${square.cashflow}`);
                    } else {
                        // Dream bought
                        this.state.log.push(`✨ Bought DREAM: ${square.name} for $${square.cost}!`);
                        // If this was their selected dream, they win. (Not implemented selection yet)
                        // For now just buying dreams is status.
                    }
                } else if (square.cost) {
                    this.state.log.push(`❌ Cannot afford ${square.name} ($${square.cost})`);
                }
                break;

            case 'LOSS':
                this.handleFastTrackLoss(player, square);
                break;

            case 'CHARITY':
                // Donate 10% or fixed? User List just sais "Charity".
                // Usually pays 10% of cash for roll bonus. 
                // Implementing simple payment for now.
                const donation = 100000; // Mock amount or 10%?
                if (player.cash >= donation) {
                    player.cash -= donation;
                    this.state.log.push(`❤️ Donated $${donation} to Charity.`);
                }
                break;
        }
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
            } else {
                this.state.log.push(`Entered Payday (Start)!`);
            }
        } else if (square.type === 'MARKET' || square.type === 'DEAL') {
            // STOP AUTO-DRAW. Prompt for Small/Big Deal.
            this.state.phase = 'OPPORTUNITY_CHOICE';
        } else if (square.type === 'EXPENSE') {
            const card = this.cardManager.drawExpense();
            this.state.currentCard = card;
            player.cash -= (card.cost || 0);
            this.state.log.push(`Paid $${card.cost} for ${card.title}`);
            // TODO: Check bankruptcy / Credit needed
        } else if (square.type === 'BABY') {
            if (player.childrenCount >= 3) {
                this.state.log.push(`${player.name} already has max children.`);
            } else {
                // Roll for baby: 1-4 = Born, 5-6 = Not
                const roll = Math.floor(Math.random() * 6) + 1;
                if (roll <= 4) {
                    player.childrenCount++;
                    player.expenses += player.childCost;
                    player.cashflow = player.income - player.expenses;
                    // "3 разово выплачивается 5000$" - Assuming generic "Gift" based on Congratulations or Cost?
                    player.cash += 5000;

                    this.state.log.push(`👶 Baby Born! (Roll: ${roll}). +$5000 Gift. Expenses +$${player.childCost}/mo`);
                    this.state.lastEvent = { type: 'BABY_BORN', payload: { player: player.name } };
                } else {
                    this.state.log.push(`No Baby (Roll: ${roll}).`);
                }
            }
        } else if (square.type === 'DOWNSIZED') {
            const expenses = player.expenses;
            player.cash -= expenses; // Pay full expenses
            player.skippedTurns = 2; // Lose 2 turns
            this.state.log.push(`🚫 DOWNSIZED! Paid -$${expenses} and skip 2 turns.`);
        } else if (square.type === 'CHARITY') {
            this.state.log.push(`Charity opportunity (Not Impl).`);
        }
    }



    takeLoan(playerId: string, amount: number) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;

        if (amount <= 0 || amount % 1000 !== 0) {
            this.state.log.push(`${player.name} failed to take loan: Amount must be a multiple of 1000.`);
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

        this.state.log.push(`${player.name} took loan $${amount}. Expenses +$${interest}/mo`);
    }

    resolveOpportunity(size: 'SMALL' | 'BIG') {
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
        this.state.log.push(`${player.name} chose ${size} DEAL: ${card.title}`);
        this.state.phase = 'ACTION'; // Back to action phase to buy/pass
    }

    repayLoan(playerId: string, amount: number) {
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

        this.state.log.push(`${player.name} repaid loan $${amount}. Expenses -$${interest}/mo`);

        // Check Fast Track after repaying loan (might free up cashflow condition)
        this.checkFastTrackCondition(player);
    }

    buyAsset(playerId: string) {
        const player = this.state.players.find(p => p.id === playerId);
        const card = this.state.currentCard;

        if (!player || !card || card.type !== 'MARKET') return;

        // Determine cost (Use Down Payment if available, else full cost)
        const costToPay = card.downPayment !== undefined ? card.downPayment : (card.cost || 0);

        if (player.cash < costToPay) {
            this.state.log.push(`${player.name} cannot afford ${card.title} ($${costToPay})`);
            return;
        }

        player.cash -= costToPay;

        // Add Asset
        player.assets.push({
            title: card.title,
            cost: card.cost,
            cashflow: card.cashflow || 0
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
            // Usually mortgages in this game don't add monthly interest expense directly, 
            // it's factored into the Net Cashflow of the property.
        }

        this.state.log.push(`${player.name} bought ${card.title}. Passive Income +$${card.cashflow || 0}`);

        // Clear card so it isn't discarded in endTurn
        this.state.currentCard = undefined;

        this.checkFastTrackCondition(player);
        this.endTurn();
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
            this.endTurn(); // Recursively skip
        }
    }

    getState(): GameState {
        return this.state;
    }
}
