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
    subtype?: 'MLM_ROLL' | 'CHARITY_ROLL';
    assetType?: 'REAL_ESTATE' | 'BUSINESS' | 'STOCK' | 'OTHER';
    maxQuantity?: number;
    outcomeDescription?: string; // Revealed after purchase
}

// Expense Cards
export const EXPENSE_CARDS: Card[] = [
    // Low ($50 - $400)
    { id: 'e1', type: 'EXPENSE', title: 'Обед в ресторане', description: 'С друзьями.', cost: 50, mandatory: true },
    { id: 'e2', type: 'EXPENSE', title: 'Ремонт кофемашины', description: 'Поломка.', cost: 100, mandatory: true },
    { id: 'e3', type: 'EXPENSE', title: 'Новые кроссовки', description: 'Спорт.', cost: 150, mandatory: true },
    { id: 'e4', type: 'EXPENSE', title: 'Штраф ПДД', description: 'Превышение скорости.', cost: 200, mandatory: true },
    { id: 'e5', type: 'EXPENSE', title: 'Ужин премиум', description: 'Гастрономический сет.', cost: 250, mandatory: true },
    { id: 'e6', type: 'EXPENSE', title: 'Концерт', description: 'Обычные места.', cost: 300, mandatory: true },
    { id: 'e7', type: 'EXPENSE', title: 'Подписки на сервисы', description: 'Годовая подписка.', cost: 350, mandatory: true },
    { id: 'e8', type: 'EXPENSE', title: 'Абонемент в фитнес', description: 'Квартальный.', cost: 400, mandatory: true },

    // Mid ($500 - $1500)
    { id: 'e9', type: 'EXPENSE', title: 'Благотворительность', description: 'Пожертвование.', cost: 500, mandatory: true },
    { id: 'e10', type: 'EXPENSE', title: 'Ветеринар', description: 'Лечение питомца.', cost: 600, mandatory: true },
    { id: 'e11', type: 'EXPENSE', title: 'Новый смартфон', description: 'Бюджетная модель.', cost: 800, mandatory: true },
    { id: 'e12', type: 'EXPENSE', title: 'ТО Автомобиля', description: 'Замена масла и фильтров.', cost: 900, mandatory: true },
    { id: 'e13', type: 'EXPENSE', title: 'Шопинг', description: 'Одежда (сезонная).', cost: 1000, mandatory: true },
    { id: 'e14', type: 'EXPENSE', title: 'Бытовая техника', description: 'Посудомоечная машина.', cost: 1100, mandatory: true },
    { id: 'e15', type: 'EXPENSE', title: 'Ремонт машины', description: 'Замена деталей.', cost: 1200, mandatory: true },
    { id: 'e16', type: 'EXPENSE', title: 'Стоматолог', description: 'Лечение зубов.', cost: 1300, mandatory: true },
    { id: 'e17', type: 'EXPENSE', title: 'Страховка', description: 'Страхование жизни.', cost: 1400, mandatory: true },
    { id: 'e18', type: 'EXPENSE', title: 'Новый ноутбук', description: 'Рабочий инструмент.', cost: 1500, mandatory: true },

    // High ($2000 - $5000)
    { id: 'e19', type: 'EXPENSE', title: 'Отпуск', description: 'Тур на море.', cost: 2000, mandatory: true },
    { id: 'e20', type: 'EXPENSE', title: 'Брендовая сумка', description: 'Подарок.', cost: 2500, mandatory: true },
    { id: 'e21', type: 'EXPENSE', title: 'Ремонт дома', description: 'Косметический ремонт.', cost: 3000, mandatory: true },
    { id: 'e22', type: 'EXPENSE', title: 'Обслуживание катера', description: 'Сезонное обслуживание.', cost: 3500, mandatory: true },
    { id: 'e23', type: 'EXPENSE', title: 'Подарок на свадьбу', description: 'Щедрый подарок.', cost: 4000, mandatory: true },
    { id: 'e24', type: 'EXPENSE', title: 'Аренда виллы', description: 'Вечеринка для друзей.', cost: 5000, mandatory: true },
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

    // --- STOCKS ---
    // User Request: 1@5, 2@10, 2@20, 2@30, 1@40
    const stockPrices = [5, 10, 10, 20, 20, 30, 30, 40];

    // TSLA
    stockPrices.forEach(price => {
        add(1, { title: 'Акции: Tesla', symbol: 'TSLA', cost: price, description: `Цена $${price}. Колебания $10-$40.`, assetType: 'STOCK' });
    });

    // MSFT
    stockPrices.forEach(price => {
        add(1, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: price, description: `Цена $${price}. Колебания $10-$40.`, assetType: 'STOCK' });
    });

    // ID: 6612 - NEW INCOME STOCKS
    // AT&T (T) - Preferred, Cost $5000, Cashflow $50, Max 1000
    add(2, {
        title: 'Акции: AT&T (Pref)',
        symbol: 'T',
        cost: 5000,
        cashflow: 50,
        maxQuantity: 1000,
        description: 'Привилегированные акции AT&T. Дивиденды $50/акцию. Макс 1000 шт.',
        assetType: 'STOCK'
    });

    // P&G (PG) - Preferred, Cost $2000, Cashflow $10, Max 1000
    add(2, {
        title: 'Акции: P&G (Pref)',
        symbol: 'PG',
        cost: 2000,
        cashflow: 10,
        maxQuantity: 1000,
        description: 'Привилегированные акции P&G. Дивиденды $10/акцию. Макс 1000 шт.',
        assetType: 'STOCK'
    });

    // --- USER DEFINED ASSETS ---
    add(5, { title: 'Комната в пригороде', cost: 3000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE' });
    add(2, { title: 'Студия маникюра', cost: 4900, cashflow: 200, description: 'Студия маникюра на 1 место.', assetType: 'BUSINESS' });
    add(2, { title: 'Кофейня', cost: 4900, cashflow: 100, description: 'Небольшая кофейня.', assetType: 'BUSINESS' });
    add(2, { title: 'Партнёрство в автомастерской', cost: 4500, cashflow: 350, description: 'Доля в бизнесе.', assetType: 'BUSINESS' });
    add(2, { title: 'Участок земли 20га', cost: 5000, cashflow: 0, description: 'Земля без дохода.', assetType: 'REAL_ESTATE' });
    add(1, { title: 'Покупка дрона', cost: 3000, cashflow: 50, description: 'Дрон для съёмок.', assetType: 'OTHER' });
    add(5, { title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE' });

    // --- NETWORK MARKETING ---
    add(3, { title: 'Сетевой бизнес', cost: 500, cashflow: 100, description: 'Старт в MLM компании.', businessType: 'NETWORK' });
    add(3, { title: 'Сетевой бизнес: Plazma Water', cost: 200, cashflow: 0, description: 'Plazma Water. Кол-во партнеров = Бросок кубика. ($100/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' });
    add(3, { title: 'Сетевой бизнес: MONEO', cost: 100, cashflow: 0, description: 'MONEO Network. Кол-во партнеров = Бросок кубика. ($50/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' });

    // --- USER DEFINED "DEALS" (Expenses/Donations) ---
    // Friend Cards (Hidden Outcomes)
    add(1, { title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Увы, друг прогорел. Деньги потеряны!', mandatory: true, type: 'DEAL_SMALL' });
    add(1, { title: 'Друг просит в займ', cost: 5000, cashflow: 500, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Ура! Друг раскрутился! Вы получаете долю в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' });
    add(1, { title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Друг вернул долг уроком мудрости! +2 кубика на 3 хода.', mandatory: true, type: 'DEAL_SMALL', subtype: 'CHARITY_ROLL' });

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

    // --- STOCK MARKET EVENTS ---
    add(1, { title: 'Акции TSLA: $40', targetTitle: 'Акции: Tesla', offerPrice: 40, description: 'Рост на новостях о новой батарее. Рынок покупает по $40.' });
    add(1, { title: 'Акции TSLA: $5', targetTitle: 'Акции: Tesla', offerPrice: 5, description: 'Проблемы с автопилотом. Рынок падает до $5.' });
    add(1, { title: 'Акции MSFT: $40', targetTitle: 'Акции: Microsoft', offerPrice: 40, description: 'Рекордная прибыль облачного сегмента. Рынок $40.' });
    add(1, { title: 'Акции MSFT: $5', targetTitle: 'Акции: Microsoft', offerPrice: 5, description: 'Антимонопольный иск. Рынок падает до $5.' });
    add(1, { title: 'Сплит Акций TSLA', description: 'Сплит 2 к 1. Увеличьте кол-во акций в 2 раза. Цена делится пополам.', action: 'OFFER' });
    add(1, { title: 'Сплит Акций MSFT', description: 'Сплит 2 к 1. Увеличьте кол-во акций в 2 раза. Цена делится пополам.', action: 'OFFER' });

    // --- REAL ESTATE & BUSINESS BUYERS (MULTIPLIERS 1.5x - 5x) ---
    // 3Br/2Ba House (Cost $8,500)
    add(1, { title: 'Покупатель дома', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 13000, description: 'Семья ищет дом. Предлагают $13,000 (1.5x).' });
    add(1, { title: 'Инвестор в недвижимость', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 25500, description: 'Инвестор скупает районы. $25,500 (3x).' });

    // Mini-Hotel (Cost $80,000)
    add(1, { title: 'Отельная сеть (M)', targetTitle: 'Мини-отель', offerPrice: 120000, description: 'Сеть расширяется. Предлагают $120,000 (1.5x).' });
    add(1, { title: 'Крупный игрок', targetTitle: 'Мини-отель', offerPrice: 240000, description: 'Фонд хочет ваш отель. $240,000 (3x).' });
    add(1, { title: 'Монополист', targetTitle: 'Мини-отель', offerPrice: 400000, description: 'Предложение, от которого нельзя отказаться. $400,000 (5x)!' });

    // Fast Food (Cost $200,000)
    add(1, { title: 'Конкурент (FastFood)', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 300000, description: 'Конкурент выкупает точки. $300,000 (1.5x).' });
    add(1, { title: 'Мировой бренд', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 1000000, description: 'Глобальная корпорация поглощает вас. $1,000,000 (5x)!' });

    // Organic Farm (Cost $120,000)
    add(1, { title: 'Эко-ритейлер', targetTitle: 'Ферма органических овощей', offerPrice: 240000, description: 'Сеть супермаркетов покупает производство. $240,000 (2x).' });
    add(1, { title: 'Агрохолдинг', targetTitle: 'Ферма органических овощей', offerPrice: 600000, description: 'Крупный агрохолдинг. $600,000 (5x)!' });

    // Car Wash (Cost $150,000)
    add(1, { title: 'Франчайзинг', targetTitle: 'Сеть автомоек', offerPrice: 450000, description: 'Вас хотят сделать частью франшизы. $450,000 (3x).' });
    add(1, { title: 'Девелопер', targetTitle: 'Сеть автомоек', offerPrice: 600000, description: 'Земля под мойками нужна под застройку. $600,000 (4x).' });

    // Coworking (Cost $250,000)
    add(1, { title: 'IT-Стартап', targetTitle: 'Коворкинг-центр', offerPrice: 500000, description: 'Единорог покупает офис. $500,000 (2x).' });
    add(1, { title: 'Google', targetTitle: 'Коворкинг-центр', offerPrice: 1250000, description: 'Техногигант открывает штаб-квартиру. $1,250,000 (5x)!' });

    // Plazma Water (Cost $5,000)
    add(1, { title: 'Выкуп франшизы', targetTitle: 'Франшиза: Plazma Water', offerPrice: 25000, description: 'Головная компания выкупает точку. $25,000 (5x).' });

    // Generic / Other
    add(1, { title: 'Покупатель 4-плекс', description: 'Инвестор ищет многоквартирный дом. Предлагает $100,000 за 4-plex.' });
    add(1, { title: 'Слияние сетей', targetTitle: 'Студия маникюра', offerPrice: 25000, description: 'Выкуп сети. $25,000 ($5k -> $25k, 5x).' });
    add(1, { title: 'Покупатель бизнеса', targetTitle: 'Кофейня', offerPrice: 15000, description: 'Инвестор. $15,000 ($5k -> $15k, 3x).' });
    add(1, { title: 'Застройщик', targetTitle: 'Участок земли 20га', offerPrice: 150000, description: 'Цена земли взлетела до $150,000.' });
    add(1, { title: 'Коллекционер', targetTitle: 'Картина', offerPrice: 6000, description: 'Шедевр! $6,000 (5x).' });

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
        });
    }

    // 2. Specific Business Cards
    add(2, { title: 'Мини-отель', cost: 80000, cashflow: 3000, description: 'Бутик-отель на 10 номеров, стабильно приносит доход.', downPayment: 20000, businessType: 'CLASSIC', assetType: 'REAL_ESTATE' });
    add(2, { title: 'Сеть кафе быстрого питания', cost: 200000, cashflow: 7000, description: 'Прибыльный бизнес, несколько точек в центре города.', downPayment: 40000, businessType: 'CLASSIC', assetType: 'BUSINESS' });
    add(1, { title: 'Ферма органических овощей', cost: 120000, cashflow: 4500, description: 'Экологичное хозяйство с контрактами на поставку.', downPayment: 30000, businessType: 'CLASSIC', assetType: 'BUSINESS' });
    add(1, { title: 'Сеть автомоек', cost: 150000, cashflow: 5000, description: 'Хорошее расположение, стабильный трафик клиентов.', downPayment: 35000, businessType: 'CLASSIC', assetType: 'BUSINESS' });
    add(1, { title: 'Коворкинг-центр', cost: 250000, cashflow: 8000, description: 'Большое пространство для аренды под стартапы и фрилансеров.', downPayment: 50000, businessType: 'CLASSIC', assetType: 'BUSINESS' });

    add(3, { title: 'Франшиза: Plazma Water', cost: 5000, cashflow: 1000, description: 'Франшиза Plazma Water. Стабильный доход.', businessType: 'NETWORK' });
    add(3, { title: 'Франшиза: MONEO', cost: 1000, cashflow: 0, description: 'Франшиза MONEO. Кол-во партнеров = Бросок кубика. ($500/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' });

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
    private expenseDeckDiscard: Card[] = [];

    constructor() {
        this.smallDeals = this.shuffle(generateSmallDeals());
        this.bigDeals = this.shuffle(generateBigDeals());
        this.marketDeck = this.shuffle(generateMarketCards());
        this.expenseDeck = this.shuffle([...EXPENSE_CARDS]);
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
            this.expenseDeckDiscard.push(card);
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
        if (this.expenseDeck.length === 0) {
            if (this.expenseDeckDiscard.length === 0) {
                // Fallback if somehow both empty (shouldn't happen with proper flow, but safety)
                this.expenseDeck = this.shuffle([...EXPENSE_CARDS]);
            } else {
                this.expenseDeck = this.shuffle([...this.expenseDeckDiscard]);
                this.expenseDeckDiscard = [];
            }
        }
        const card = this.expenseDeck.shift();
        return card!;
    }

    getDeckCounts() {
        return {
            small: { remaining: this.smallDeals.length, total: this.smallDeals.length + this.smallDealsDiscard.length },
            big: { remaining: this.bigDeals.length, total: this.bigDeals.length + this.bigDealsDiscard.length },
            market: { remaining: this.marketDeck.length, total: this.marketDeck.length + this.marketDeckDiscard.length },
            expense: { remaining: this.expenseDeck.length, total: this.expenseDeck.length + this.expenseDeckDiscard.length }
        };
    }
}
