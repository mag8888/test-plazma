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
    type: 'DEAL' | 'MARKET' | 'EXPENSE' | 'PAYDAY' | 'BABY' | 'CHARITY' | 'OOW' | 'DREAM';
    name: string;
}

// Mock Board Configuration (Rat Race - 24 Squares)
// Mock Board Configuration (Rat Race - 24 Squares)
export const RAT_RACE_SQUARES: BoardSquare[] = Array.from({ length: 24 }, (_, i) => {
    let type: BoardSquare['type'] = 'DEAL'; // Default
    if (i % 6 === 0) type = 'PAYDAY';
    else if ([2, 10, 18].includes(i)) type = 'EXPENSE';
    else if ([7, 15, 23].includes(i)) type = 'MARKET';
    else if (i === 12) type = 'BABY';
    else if (i === 20) type = 'OOW'; // Downsized
    else if (i === 4) type = 'CHARITY';
    return { index: i, type, name: type };
});

// Mock Fast Track Configuration (48 Squares)
export const FAST_TRACK_SQUARES: BoardSquare[] = Array.from({ length: 48 }, (_, i) => {
    const ftIndex = i + 24; // Start from index 24
    let type: BoardSquare['type'] = i % 2 === 0 ? 'DEAL' : 'DREAM'; // Placeholder types
    // Add specific Fast Track types distinct from Rat Race if needed
    // For now reusing types but names can differ
    if (i % 8 === 0) type = 'PAYDAY'; // Cashflow Day

    return { index: ftIndex, type, name: `FT ${i}` };
});

export const FULL_BOARD = [...RAT_RACE_SQUARES, ...FAST_TRACK_SQUARES];

export class GameEngine {
    state: GameState;
    cardManager: CardManager;

    constructor(roomId: string, players: IPlayer[]) {
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
        // Mock Fast Track Squares
        const type = position % 2 === 0 ? 'BUSINESS' : 'DREAM';
        this.state.log.push(`${player.name} landed on Fast Track ${type} (Pos: ${position})`);

        // Win Condition: Cashflow > 50k added on Fast Track
        // For simplicity: specific "Win" check
        if (player.cashflow >= 50000) {
            this.state.winner = player.name;
            this.state.phase = 'END';
            this.state.log.push(`🏆 ${player.name} WINS THE GAME!`);
            return;
        }

        if (type === 'BUSINESS') {
            // Mock Business Opportunity
            const cost = 50000;
            const flow = 2000;
            // Auto-buy example
            if (player.cash >= cost) {
                player.cash -= cost;
                player.cashflow += flow;
                player.income += flow;
                player.passiveIncome += flow;
                this.state.log.push(`Bought Business! Flow +$${flow}`);
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
                } else {
                    this.state.log.push(`No Baby (Roll: ${roll}).`);
                }
            }
        } else if (square.type === 'OOW') {
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

        let card: Card;
        if (size === 'SMALL') {
            card = this.cardManager.drawSmallDeal();
        } else {
            card = this.cardManager.drawBigDeal();
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
        this.state.currentCard = undefined; // Clear card
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
