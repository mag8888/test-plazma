import { IPlayer } from '../models/room.model';
import { CardManager, Card } from './card.manager';

export interface GameState {
    roomId: string;
    players: PlayerState[];
    currentPlayerIndex: number;
    currentTurnTime: number;
    phase: 'ROLL' | 'ACTION' | 'END';
    board: BoardSquare[];
    currentCard?: Card;
    log: string[];
    winner?: string;
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
            board: RAT_RACE_SQUARES,
            log: ['Game Started']
        };
    }

    initPlayer(p: IPlayer): PlayerState {
        // TODO: Load profession stats
        return {
            ...p,
            cash: 3000,
            assets: [],
            liabilities: [],
            loanDebt: 0,
            position: 0,
            isFastTrack: false,
            childrenCount: 0,
            childCost: 240,
            salary: 3000,
            passiveIncome: 0,
            income: 3000,
            expenses: 2000,
            cashflow: 1000,
            skippedTurns: 0
        };
    }

    private checkFastTrackCondition(player: PlayerState) {
        // "passive income covers expenses * 2 AND loans usually 0"
        // We need a way to track Loan Amount. Currently we just have repayLoan logic.
        // Let's assume player.liabilities has 'Bank Loan'.

        // For now, simplify: if passiveIncome >= expenses * 2.
        // And we need to ensure loans are paid. I'll add a 'hasLoans' check if I can track it.
        // Let's add loan tracking to Player first properly if needed, but for now logic is:

        if (player.passiveIncome >= player.expenses * 2 && player.loanDebt === 0) {
            // Check if loans exist
            // Implementation detail: need to store loan liability specificially

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
            this.state.log.push(`Entered Payday! (Cashflow added on pass)`);
        } else if (square.type === 'MARKET' || square.type === 'DEAL') {
            // Both MARKET and DEAL trigger Opportunity Cards for this MVP
            // In full game: DEAL = Buy, MARKET = Sell.
            // Here we just use our 'Market Deck' which contains Buy opportunities.
            const card = this.cardManager.drawMarket();
            this.state.currentCard = card;
            this.state.log.push(`Opportunity: ${card.title}`);
            // Wait for user action
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
                    // Usually Baby is a Cost. But prompt says "Payout and Congrats". 
                    // Let's Give $5000 as a "Gift" for now based on "Congratulations".
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

        // Interest 10%
        const interest = amount * 0.1;

        player.cash += amount;
        player.loanDebt += amount;
        player.expenses += interest;
        player.cashflow = player.income - player.expenses;

        this.state.log.push(`${player.name} took loan $${amount}. Expenses +$${interest}/mo`);
    }

    repayLoan(playerId: string, amount: number) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;

        if (player.loanDebt < amount) return; // Cannot overpay
        if (player.cash < amount) return;

        const interest = amount * 0.1;

        player.cash -= amount;
        player.loanDebt -= amount;
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

    endTurn() {
        this.state.currentCard = undefined; // Clear card
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
        this.state.phase = 'ROLL';
        this.state.currentTurnTime = 120;
    }

    getState(): GameState {
        return this.state;
    }
}
