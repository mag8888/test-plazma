// Card Types
export interface Card {
    id: string;
    type: 'MARKET' | 'EXPENSE' | 'DEAL_SMALL' | 'DEAL_BIG' | 'BUSINESS' | 'DREAM';
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
    // Market specific
    action?: 'OFFER';
    targetTitle?: string;
    offerPrice?: number;
    businessType?: 'CLASSIC' | 'NETWORK';
    subtype?: 'MLM_ROLL';
}

// Expense Cards
export const EXPENSE_CARDS: Card[] = [
    { id: 'e1', type: 'EXPENSE', title: 'Новый телефон', description: 'Купили последнюю модель.', cost: 800, mandatory: true },
    { id: 'e2', type: 'EXPENSE', title: 'Ремонт машины', description: 'Сломался двигатель.', cost: 1200, mandatory: true },
    { id: 'e3', type: 'EXPENSE', title: 'Налоговый аудит', description: 'Уплата налогов.', cost: 500, mandatory: true },
    { id: 'e4', type: 'EXPENSE', title: 'Шопинг', description: 'Одежда и обувь.', cost: 1000, mandatory: true },
    { id: 'e5', type: 'EXPENSE', title: 'Отпуск', description: 'Поездка с семьей.', cost: 2000, mandatory: true },
    { id: 'e6', type: 'EXPENSE', title: 'Медицинский счет', description: 'Неожиданное лечение.', cost: 1500, mandatory: true },
    { id: 'e7', type: 'EXPENSE', title: 'Ремонт дома', description: 'Починка крыши.', cost: 800, mandatory: true },
    { id: 'e8', type: 'EXPENSE', title: 'Новый ТВ', description: 'OLED 4K Телевизор.', cost: 2000, mandatory: true },
    { id: 'e9', type: 'EXPENSE', title: 'Концерт', description: 'VIP места.', cost: 300, mandatory: true },
    { id: 'e10', type: 'EXPENSE', title: 'Благотворительность', description: 'Пожертвование.', cost: 500, mandatory: true },
    { id: 'e11', type: 'EXPENSE', title: 'Обслуживание лодки', description: 'Если есть лодка.', cost: 1000, mandatory: true },
    { id: 'e12', type: 'EXPENSE', title: 'Новые шины', description: 'Для автомобиля.', cost: 400, mandatory: true },
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

    // --- STOCKS (Kept based on assumption this is default) ---
    add(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 30, description: 'Цена $30. Колебания $10-$40.' });
    add(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 30, description: 'Цена $30. Колебания $10-$40.' });
    // Or should I replace ALL with user list? User list didn't include stocks but "Deals" section had Market effects.
    // User list:
    // 5x Room in suburbs, 2x Manicure, 2x Coffee, 2x Partner, 2x Land, 1x Drone, 5x Flipping Studio.
    // 1x Friend Loan, 1x Cat Shelter, 1x Feed Homeless.
    // 2x Roof leak, 3x Sewer break.

    // --- USER DEFINED ASSETS ---
    add(5, { title: 'Комната в пригороде', cost: 3000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.' });
    add(2, { title: 'Студия маникюра', cost: 4900, cashflow: 200, description: 'Студия маникюра на 1 место.' });
    add(2, { title: 'Кофейня', cost: 4900, cashflow: 100, description: 'Небольшая кофейня.' });
    add(2, { title: 'Партнёрство в автомастерской', cost: 4500, cashflow: 350, description: 'Доля в бизнесе.' });
    add(2, { title: 'Участок земли 20га', cost: 5000, cashflow: 0, description: 'Земля без дохода.' });
    add(1, { title: 'Покупка дрона', cost: 3000, cashflow: 50, description: 'Дрон для съёмок.' });
    add(5, { title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).' });

    // --- NETWORK MARKETING ---
    add(3, { title: 'Сетевой бизнес', cost: 500, cashflow: 100, description: 'Старт в MLM компании.', businessType: 'NETWORK' });
    add(3, { title: 'Сетевой бизнес: Plazma Water', cost: 200, cashflow: 0, description: 'Plazma Water. Кол-во партнеров = Бросок кубика. ($100/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' });
    add(3, { title: 'Сетевой бизнес: MONEO', cost: 100, cashflow: 0, description: 'MONEO Network. Кол-во партнеров = Бросок кубика. ($50/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' });

    // --- USER DEFINED "DEALS" (Expenses/Donations) ---
    add(1, { title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Рискованное вложение.', mandatory: true });
    add(1, { title: 'Приют кошкам', cost: 5000, cashflow: 0, description: 'Пожертвование на приют.', mandatory: true });
    add(1, { title: 'Накормите бездомных', cost: 5000, cashflow: 0, description: 'Благотворительный обед.', mandatory: true });

    // --- USER DEFINED DAMAGES ---
    add(2, { title: 'Крыша протекла', cost: 5000, cashflow: 0, description: 'Обновить крышу. Платите $5000 ЕСЛИ есть недвижимость.', mandatory: true });
    add(3, { title: 'Прорыв канализации', cost: 2000, cashflow: 0, description: 'Починить канализацию. Платите $2000 ЕСЛИ есть недвижимость.', mandatory: true });


    return cards;
};

// Generator for Market Cards (Selling Opportunities)
const generateMarketCards = (): Card[] => {
    let idCounter = 1;
    const cards: Card[] = [];

    const add = (count: number, template: Partial<Card>) => {
        for (let i = 0; i < count; i++) {
            cards.push({
                id: `mkt_${idCounter++}`,
                type: 'MARKET',
                title: template.title!,
                description: template.description || '',
                action: 'OFFER',
                targetTitle: template.targetTitle,
                offerPrice: template.offerPrice,
                ...template
            } as Card);
        }
    };

    // User provided Market Mappings
    // Room in suburbs -> Buyer 25k
    add(4, { title: 'Покупатель жилья', targetTitle: 'Комната в пригороде', offerPrice: 25000, description: 'Старое жилье идет под снос. Предлагают $25,000 за комнату.' });
    // Manicure -> Network buyout 100k
    add(2, { title: 'Слияние сетей', targetTitle: 'Студия маникюра', offerPrice: 100000, description: 'Большая сеть выкупает все маникюрные салоны. Предлагают $100,000.' });
    // Coffee -> Buyer 25k
    add(2, { title: 'Инвестор кофейни', targetTitle: 'Кофейня', offerPrice: 25000, description: 'Покупатель кофейни предлагает $25,000.' });
    // Auto Partner -> Buyer 50k
    add(2, { title: 'Выкуп доли', targetTitle: 'Партнёрство в автомастерской', offerPrice: 50000, description: 'Есть покупатель на партнерство за $50,000.' });
    // Land 20ha -> Buyer 100k
    add(2, { title: 'Застройщик', targetTitle: 'Участок земли 20га', offerPrice: 100000, description: 'Застройщик ищет землю. Предлагает $100,000.' });
    // Flipping Studio -> Buyer 7k
    add(4, { title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 7000, description: 'Покупатель квартиры студии (субаренда) за $7,000.' });

    // General "Inflation" or generic market events could be added here if deck is too small, but user list is specific.
    return cards;
}


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
        // Cost 7000-10000 (step 500)
        const cost = 7000 + Math.floor(Math.random() * 7) * 500;
        // Flow 100-300 (step 50)
        const cashflow = 100 + Math.floor(Math.random() * 5) * 50;

        cards.push({
            id: `bd_house_${i}`,
            type: 'DEAL_BIG',
            title: `Дом (3Br/2Ba)`,
            description: `Дом под сдачу. Цена $${cost}. Доход $${cashflow}.`,
            cost: cost,
            cashflow: cashflow,
            downPayment: 0
        });
    }

    // 2. Specific Business Cards
    add(2, { title: 'Мини-отель', cost: 80000, cashflow: 3000, description: 'Бутик-отель на 10 номеров, стабильно приносит доход.', downPayment: 20000, businessType: 'CLASSIC' });
    add(2, { title: 'Сеть кафе быстрого питания', cost: 200000, cashflow: 7000, description: 'Прибыльный бизнес, несколько точек в центре города.', downPayment: 40000, businessType: 'CLASSIC' });
    add(1, { title: 'Ферма органических овощей', cost: 120000, cashflow: 4500, description: 'Экологичное хозяйство с контрактами на поставку.', downPayment: 30000, businessType: 'CLASSIC' });
    add(1, { title: 'Сеть автомоек', cost: 150000, cashflow: 5000, description: 'Хорошее расположение, стабильный трафик клиентов.', downPayment: 35000, businessType: 'CLASSIC' });
    add(1, { title: 'Коворкинг-центр', cost: 250000, cashflow: 8000, description: 'Большое пространство для аренды под стартапы и фрилансеров.', downPayment: 50000, businessType: 'CLASSIC' });

    // --- NETWORK FRANCHISES ---
    add(3, { title: 'Франшиза: Plazma Water', cost: 10000, cashflow: 1000, description: 'Франшиза Plazma Water. Стабильный доход.', downPayment: 0, businessType: 'NETWORK' });
    add(3, { title: 'Франшиза: MONEO', cost: 10000, cashflow: 1000, description: 'Франшиза MONEO. Стабильный доход.', downPayment: 0, businessType: 'NETWORK' });

    return cards;
};

export class CardManager {
    private smallDeals: Card[] = [];
    private smallDealsDiscard: Card[] = [];

    private bigDeals: Card[] = [];
    private bigDealsDiscard: Card[] = [];

    private marketDeck: Card[] = [];
    private marketDeckDiscard: Card[] = [];

    expenseDeck: Card[] = [...EXPENSE_CARDS];

    constructor() {
        this.smallDeals = this.shuffle(generateSmallDeals());
        this.bigDeals = this.shuffle(generateBigDeals());
        this.marketDeck = this.shuffle(generateMarketCards());
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

    drawMarket(): Card | undefined {
        if (this.marketDeck.length === 0) {
            if (this.marketDeckDiscard.length === 0) return undefined;
            this.marketDeck = this.shuffle([...this.marketDeckDiscard]);
            this.marketDeckDiscard = [];
        }
        return this.marketDeck.shift();
    }

    discard(card: Card) {
        if (card.type === 'DEAL_SMALL') {
            this.smallDealsDiscard.push(card);
        } else if (card.type === 'DEAL_BIG') {
            this.bigDealsDiscard.push(card);
        } else if (card.type === 'EXPENSE') {
            this.expenseDeck.push(card);
        } else if (card.type === 'MARKET') {
            this.marketDeckDiscard.push(card);
        }
    }

    private shuffle(array: Card[]): Card[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    drawExpense(): Card {
        if (this.expenseDeck.length === 0) this.expenseDeck = [...EXPENSE_CARDS];
        const card = this.expenseDeck.shift();
        return card!;
    }
}
