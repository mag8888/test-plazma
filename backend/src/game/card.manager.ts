// Card Types
export interface Card {
    id: string;
    type: 'MARKET' | 'EXPENSE' | 'DEAL_SMALL' | 'DEAL_BIG';
    title: string;
    description: string;
    cost?: number; // Cost to buy or Pay
    cashflow?: number; // Monthly flow
    price?: number; // Stock Price
    downPayment?: number;
    liability?: number; // Mortgage
    roi?: number;
    symbol?: string; // For stocks
    mandatory?: boolean; // For damage/events that must be accepted
}

// Expense Cards
export const EXPENSE_CARDS: Card[] = [
    { id: 'e1', type: 'EXPENSE', title: 'New Phone', description: 'Bought latest model', cost: 800 },
    { id: 'e2', type: 'EXPENSE', title: 'Car Repair', description: 'Engine failure', cost: 1200 },
    { id: 'e3', type: 'EXPENSE', title: 'Tax Audit', description: 'Pay back taxes', cost: 500 },
    { id: 'e4', type: 'EXPENSE', title: 'Shopping Spree', description: 'Clothes and shoes', cost: 1000 },
    { id: 'e5', type: 'EXPENSE', title: 'Family Vacation', description: 'Disneyland trip', cost: 2000 },
    { id: 'e6', type: 'EXPENSE', title: 'Medical Bill', description: 'Unexpected surgery', cost: 1500 },
    { id: 'e7', type: 'EXPENSE', title: 'House Repairs', description: 'Fixing the roof', cost: 800 },
    { id: 'e8', type: 'EXPENSE', title: 'New TV', description: 'OLED 4K TV', cost: 2000 },
    { id: 'e9', type: 'EXPENSE', title: 'Concert Tickets', description: 'VIP seats', cost: 300 },
    { id: 'e10', type: 'EXPENSE', title: 'Charity Ball', description: 'Donation', cost: 500 },
    { id: 'e11', type: 'EXPENSE', title: 'Boat Maintenance', description: 'If you own a boat', cost: 1000 }, // Conditional?
    { id: 'e12', type: 'EXPENSE', title: 'New Tires', description: 'For your car', cost: 400 },
];

// Generator for Small Deals
const generateSmallDeals = (): Card[] => {
    let idCounter = 1;
    const cards: Card[] = [];

    const add = (count: number, template: Partial<Card>) => {
        for (let i = 0; i < count; i++) {
            cards.push({
                id: `sd_${idCounter++}`,
                type: 'DEAL_SMALL',
                title: template.title!,
                description: template.description || '',
                cost: template.cost || 0,
                cashflow: template.cashflow || 0,
                price: template.price,
                symbol: template.symbol,
                mandatory: template.mandatory,
                ...template
            } as Card);
        }
    };

    // --- STOCKS (Small Deal) ---
    // Tesla
    add(1, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 10, description: 'Цена $10. Колебания $10-$40.' });
    add(3, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 20, description: 'Цена $20. Колебания $10-$40.' });
    add(3, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 30, description: 'Цена $30. Колебания $10-$40.' });
    add(1, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 40, description: 'Цена $40. Колебания $10-$40.' });
    add(1, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 50, description: 'Цена $50. Колебания $10-$40.' });

    // Microsoft
    add(1, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 10, description: 'Цена $10. Колебания $10-$40.' });
    add(3, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 20, description: 'Цена $20. Колебания $10-$40.' });
    add(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 30, description: 'Цена $30. Колебания $10-$40.' });
    add(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 40, description: 'Цена $40. Колебания $10-$40.' });
    add(1, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 50, description: 'Цена $50. Колебания $10-$40.' });

    // Nvidia
    add(2, { title: 'Акции: Nvidia', symbol: 'NVDA', cost: 10, description: 'Цена $10. Колебания $10-$40.' });
    add(3, { title: 'Акции: Nvidia', symbol: 'NVDA', cost: 20, description: 'Цена $20. Колебания $10-$40.' });
    add(3, { title: 'Акции: Nvidia', symbol: 'NVDA', cost: 30, description: 'Цена $30. Колебания $10-$40.' });
    add(2, { title: 'Акции: Nvidia', symbol: 'NVDA', cost: 40, description: 'Цена $40. Колебания $10-$40.' });

    // Apple
    add(2, { title: 'Акции: Apple', symbol: 'AAPL', cost: 10, description: 'Цена $10. Колебания $10-$40.' });
    add(5, { title: 'Акции: Apple', symbol: 'AAPL', cost: 20, description: 'Цена $20. Колебания $10-$40.' });
    add(3, { title: 'Акции: Apple', symbol: 'AAPL', cost: 30, description: 'Цена $30. Колебания $10-$40.' });
    add(2, { title: 'Акции: Apple', symbol: 'AAPL', cost: 40, description: 'Цена $40. Колебания $10-$40.' });

    // Bitcoin
    add(1, { title: 'Bitcoin', symbol: 'BTC', cost: 1000, description: 'Цена $1,000. Высокий риск.' });
    add(1, { title: 'Bitcoin', symbol: 'BTC', cost: 5000, description: 'Цена $5,000.' });
    add(1, { title: 'Bitcoin', symbol: 'BTC', cost: 10000, description: 'Цена $10,000.' });
    add(5, { title: 'Bitcoin', symbol: 'BTC', cost: 20000, description: 'Цена $20,000.' });
    add(1, { title: 'Bitcoin', symbol: 'BTC', cost: 50000, description: 'Цена $50,000.' });
    add(1, { title: 'Bitcoin', symbol: 'BTC', cost: 100000, description: 'Цена $100,000.' });

    // Preferred Stocks
    add(2, { title: 'Прив. акции: AT&T', symbol: 'T-PREF', cost: 5000, cashflow: 50, description: 'Доход $50/мес. Привилегированные акции.' });
    add(2, { title: 'Прив. акции: P&G', symbol: 'PG-PREF', cost: 2000, cashflow: 10, description: 'Доход $10/мес. Привилегированные акции.' });

    // --- REAL ESTATE / BUSINESS (Small) ---
    add(5, { title: 'Комната в пригороде', cost: 3000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.' });
    add(2, { title: 'Студия маникюра', cost: 4900, cashflow: 200, description: 'Студия маникюра на 1 место.' });
    add(2, { title: 'Кофейня', cost: 4900, cashflow: 100, description: 'Небольшая кофейня.' });
    add(2, { title: 'Партнёрство в автомастерской', cost: 4500, cashflow: 350, description: 'Доля в бизнесе.' });
    add(2, { title: 'Участок земли 20га', cost: 5000, cashflow: 0, description: 'Земля без дохода.' });
    add(1, { title: 'Покупка дрона', cost: 3000, cashflow: 50, description: 'Дрон для съёмок.' });
    add(5, { title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).' });

    // --- EXPENSES / SPECIAL ---
    add(1, { title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Рискованно.', mandatory: true });
    add(1, { title: 'Приют кошкам', cost: 5000, cashflow: 0, description: 'Пожертвование.', mandatory: true });
    add(1, { title: 'Накормите бездомных', cost: 5000, cashflow: 0, description: 'Благотворительность.', mandatory: true });

    // --- DAMAGES ---
    add(2, { title: 'Протекла крыша', cost: 5000, cashflow: 0, description: 'Возможность обновить крышу (Если есть недвижимость).', mandatory: true });
    add(3, { title: 'Прорыв канализации', cost: 2000, cashflow: 0, description: 'Возможность починить канализацию.', mandatory: true });

    return cards;
};

// Generator for Big Deals
const generateBigDeals = (): Card[] => {
    let idCounter = 1;
    const cards: Card[] = [];

    const add = (count: number, template: Partial<Card>) => {
        for (let i = 0; i < count; i++) {
            cards.push({
                id: `bd_${idCounter++}`,
                type: 'DEAL_BIG',
                title: template.title!,
                description: template.description || '',
                cost: template.cost || 0,
                cashflow: template.cashflow || 0,
                downPayment: template.downPayment, // Optional, can be calc'd
                roi: template.roi,
                ...template
            } as Card);
        }
    };

    // 1. 24 House Cards (Randomized Cost 7-10k, Flow 100-300)
    for (let i = 0; i < 24; i++) {
        // Random Cost 7000-10000 (step 500)
        const cost = 7000 + Math.floor(Math.random() * 7) * 500;
        // Random Flow 100-300 (step 50)
        const cashflow = 100 + Math.floor(Math.random() * 5) * 50;

        cards.push({
            id: `bd_house_${i}`,
            type: 'DEAL_BIG',
            title: `Дом (3Br/2Ba)`,
            description: `Дом под сдачу. Цена $${cost}. Доход $${cashflow}.`,
            cost: cost,
            cashflow: cashflow,
            downPayment: 0, // Usually small deals don't have downpayment? Wait, these are BIG deals? 
            // "House cost 7000-10000" sounds like Small Deal territory. 
            // BUT User put it under "Big Deals". "для больших сделок нужно сформировать 24 карточек дома стоимость 7000-10000"
            // If they are Big Deals, they usually have Down Payment option. 
            // But 7000 is very cheap. Maybe these are "Down Payments" themselves?
            // "стоимость 7000-10000" = Cost.
            // If Cost is 10k, it's a small deal. But requested in Big Deals. I will respect request.
            // I'll set DownPayment = Cost (Cash deal) or let helper handle it.
            // I'll leave downPayment undefined = pay full cost.
        });
    }

    // 2. Specific Business Cards
    add(2, { title: 'Мини-отель', cost: 80000, cashflow: 3000, description: 'Бутик-отель на 10 номеров, стабильно приносит доход.', downPayment: 20000 });
    add(2, { title: 'Сеть кафе быстрого питания', cost: 200000, cashflow: 7000, description: 'Прибыльный бизнес, несколько точек в центре города.', downPayment: 40000 });
    add(1, { title: 'Ферма органических овощей', cost: 120000, cashflow: 4500, description: 'Экологичное хозяйство с контрактами на поставку.', downPayment: 30000 });
    add(1, { title: 'Сеть автомоек', cost: 150000, cashflow: 5000, description: 'Хорошее расположение, стабильный трафик клиентов.', downPayment: 35000 });
    add(1, { title: 'Коворкинг-центр', cost: 250000, cashflow: 8000, description: 'Большое пространство для аренды под стартапы и фрилансеров.', downPayment: 50000 });

    return cards;
};

export class CardManager {
    private smallDeals: Card[] = [];
    private smallDealsDiscard: Card[] = [];

    private bigDeals: Card[] = [];
    private bigDealsDiscard: Card[] = [];

    expenseDeck: Card[] = [...EXPENSE_CARDS];

    constructor() {
        this.smallDeals = this.shuffle(generateSmallDeals());
        this.bigDeals = this.shuffle(generateBigDeals());
    }

    drawSmallDeal(): Card | undefined {
        if (this.smallDeals.length === 0) {
            if (this.smallDealsDiscard.length === 0) return undefined; // No cards left
            // Reshuffle
            this.smallDeals = this.shuffle([...this.smallDealsDiscard]);
            this.smallDealsDiscard = [];
        }
        return this.smallDeals.shift();
    }

    drawBigDeal(): Card | undefined {
        if (this.bigDeals.length === 0) {
            if (this.bigDealsDiscard.length === 0) return undefined;
            // Reshuffle
            this.bigDeals = this.shuffle([...this.bigDealsDiscard]);
            this.bigDealsDiscard = [];
        }
        return this.bigDeals.shift();
    }

    discard(card: Card) {
        if (card.type === 'DEAL_SMALL') {
            this.smallDealsDiscard.push(card);
        } else if (card.type === 'DEAL_BIG') {
            this.bigDealsDiscard.push(card);
        } else if (card.type === 'EXPENSE') {
            this.expenseDeck.push(card);
        }
    }

    private shuffle(array: Card[]): Card[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    drawMarket(): Card | undefined {
        // This method might be deprecated if we call drawSmallDeal/BigDeal directly based on user choice
        // But keeping it for safety
        return Math.random() > 0.5 ? this.drawSmallDeal() : this.drawBigDeal();
    }

    drawExpense(): Card {
        if (this.expenseDeck.length === 0) this.expenseDeck = [...EXPENSE_CARDS];
        const card = this.expenseDeck.shift();
        return card!;
    }
}
