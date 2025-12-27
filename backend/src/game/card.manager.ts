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
    displayId?: number; // Visual ID (e.g. No 1)
}

// Expense Cards
// Helper to expand counts
const expand = (count: number, template: Partial<Card>, type: Card['type']): Card[] => {
    return Array(count).fill(null).map((_, i) => ({ ...template, id: `${type}_${template.title}_${i}`, type } as Card));
};

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

export const SMALL_DEALS: Card[] = [
    // Stocks (5, 10, 20, 30, 40)
    { id: 'sd_tsla_5', title: 'Акции: Tesla', symbol: 'TSLA', cost: 5, description: 'Цена $5. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    ...expand(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 10, description: 'Цена $10. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 20, description: 'Цена $20. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 30, description: 'Цена $30. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
    { id: 'sd_tsla_40', title: 'Акции: Tesla', symbol: 'TSLA', cost: 40, description: 'Цена $40. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },

    // Microsoft (Copy of TSLA structure)
    { id: 'sd_msft_5', title: 'Акции: Microsoft', symbol: 'MSFT', cost: 5, description: 'Цена $5. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    ...expand(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 10, description: 'Цена $10. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 20, description: 'Цена $20. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 30, description: 'Цена $30. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
    { id: 'sd_msft_40', title: 'Акции: Microsoft', symbol: 'MSFT', cost: 40, description: 'Цена $40. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },

    // Bitcoin (Small Deal Entry Point)
    { id: 'sd_btc_4k', title: 'Bitcoin', symbol: 'BTC', cost: 4000, description: 'Криптовалюта на дне. Цена $4,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { id: 'sd_btc_10k', title: 'Bitcoin', symbol: 'BTC', cost: 10000, description: 'Крипто-зима. Цена $10,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { id: 'sd_btc_20k', title: 'Bitcoin', symbol: 'BTC', cost: 20000, description: 'Биткоин на хайпе. Цена $20,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { id: 'sd_btc_30k', title: 'Bitcoin', symbol: 'BTC', cost: 30000, description: 'Биткоин штурмует максимумы. Цена $30,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { id: 'sd_btc_50k', title: 'Bitcoin', symbol: 'BTC', cost: 50000, description: 'Биткоин растет! Цена $50,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { id: 'sd_btc_100k', title: 'Bitcoin', symbol: 'BTC', cost: 100000, description: 'To The Moon! Цена $100,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },

    // AT&T
    ...expand(2, {
        title: 'Акции: AT&T (Pref)',
        symbol: 'T',
        cost: 2500,
        cashflow: 50,
        maxQuantity: 1000,
        description: 'Привилегированные акции AT&T. Дивиденды $50/акцию. Макс 1000 шт.',
        assetType: 'STOCK'
    }, 'DEAL_SMALL'),

    // P&G
    ...expand(2, {
        title: 'Акции: P&G (Pref)',
        symbol: 'PG',
        cost: 500,
        cashflow: 10,
        maxQuantity: 1000,
        description: 'Привилегированные акции P&G. Дивиденды $10/акцию. Макс 1000 шт.',
        assetType: 'STOCK'
    }, 'DEAL_SMALL'),

    ...expand(5, { title: 'Комната в пригороде', cost: 8000, cashflow: 250, description: 'Сдача в аренду. ROI ~35%.', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Студия маникюра', cost: 7000, cashflow: 200, description: 'Студия маникюра на 1 место.', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Кофейня', cost: 3500, cashflow: 100, description: 'Небольшая кофейня.', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Партнёрство в автомастерской', cost: 12000, cashflow: 350, description: 'Доля в бизнесе.', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Участок земли 20га', cost: 5000, cashflow: 0, description: 'Земля без дохода.', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),
    ...expand(1, { title: 'Покупка дрона', cost: 1500, cashflow: 50, description: 'Дрон для съёмок.', assetType: 'OTHER' }, 'DEAL_SMALL'),
    ...expand(5, { title: 'Флипинг студии', cost: 1500, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),

    // Partner Business Cards (Roll for partners)
    ...expand(2, { title: 'Бизнес: MONEO', cost: 1000, cashflow: 0, description: 'MONEO. Кол-во партнеров = Бросок кубика. ($500/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Бизнес: Plazma Water', cost: 200, cashflow: 0, description: 'Plazma Water. Кол-во партнеров = Бросок кубика. ($100/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL', assetType: 'BUSINESS' }, 'DEAL_SMALL'),

    // FRIEND CARDS (Hidden Outcomes)
    { id: 'sd_friend_loss', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Увы, друг прогорел. Деньги потеряны!', mandatory: true, type: 'DEAL_SMALL' },
    { id: 'sd_friend_biz', title: 'Друг просит в займ', cost: 5000, cashflow: 500, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Ура! Друг раскрутился! Вы получаете долю в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { id: 'sd_friend_luck', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Друг вернул долг уроком мудрости! +2 кубика на 3 хода.', mandatory: true, type: 'DEAL_SMALL', subtype: 'CHARITY_ROLL' },

    ...expand(2, { title: 'Крыша протекла', cost: 5000, cashflow: 0, description: 'Обновить крышу. Платите $5000 ЕСЛИ есть недвижимость.', mandatory: true }, 'DEAL_SMALL'),
    ...expand(3, { title: 'Прорыв канализации', cost: 2000, cashflow: 0, description: 'Починить канализацию. Платите $2000 ЕСЛИ есть недвижимость.', mandatory: true }, 'DEAL_SMALL'),
];

export const BIG_DEALS: Card[] = [
    // Real Estate
    { id: 'bd_house_ex', title: 'Дом (3Br/2Ba)', description: 'Дом под сдачу. Цена $7000-10000. Доход $200.', cost: 7000, cashflow: 200, type: 'DEAL_BIG' },
    ...expand(3, { title: 'Дом 3Br/2Ba (Дуплекс)', cost: 14000, cashflow: 400, description: 'Дуплекс в хорошем районе.', downPayment: 10000, assetType: 'REAL_ESTATE' }, 'DEAL_BIG'),
    ...expand(4, { title: '4-квартирный дом', cost: 35000, cashflow: 1200, description: 'Многоквартирный дом. Стабильные жильцы.', downPayment: 30000, assetType: 'REAL_ESTATE' }, 'DEAL_BIG'),
    ...expand(4, { title: '8-квартирный комплекс', cost: 90000, cashflow: 2800, description: 'Жилой комплекс с управляющим.', downPayment: 70000, assetType: 'REAL_ESTATE' }, 'DEAL_BIG'),
    { id: 'bd_8plex_3', title: 'ЖК "Заря"', cost: 100000, downPayment: 75000, cashflow: 3000, description: 'Эконом класс.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },

    // Hospitality
    ...expand(4, { title: 'Мини-отель', cost: 100000, cashflow: 3000, description: 'Бутик-отель на 10 номеров, стабильно приносит доход.', downPayment: 75000, businessType: 'CLASSIC', assetType: 'REAL_ESTATE' }, 'DEAL_BIG'),

    // Classic Business
    ...expand(4, { title: 'Сеть кафе быстрого питания', cost: 240000, cashflow: 7000, description: 'Прибыльный бизнес, несколько точек в центре города.', downPayment: 150000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG'),
    ...expand(3, { title: 'Ферма органических овощей', cost: 150000, cashflow: 4500, description: 'Экологичное хозяйство с контрактами на поставку.', downPayment: 100000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG'),
    ...expand(3, { title: 'Сеть автомоек', cost: 175000, cashflow: 5000, description: 'Хорошее расположение, стабильный трафик клиентов.', downPayment: 125000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG'),
    ...expand(3, { title: 'Коворкинг-центр', cost: 280000, cashflow: 8000, description: 'Большое пространство для аренды под стартапы и фрилансеров.', downPayment: 200000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG'),

    // Network
    ...expand(6, { title: 'Франшиза: Plazma Water', cost: 30000, cashflow: 1000, description: 'Франшиза Plazma Water. Стабильный доход.', businessType: 'NETWORK' }, 'DEAL_BIG'),
    ...expand(5, { title: 'Франшиза: MONEO', cost: 30000, cashflow: 1000, description: 'Франшиза MONEO. Стабильный доход.', businessType: 'NETWORK' }, 'DEAL_BIG'),
];

export const MARKET_CARDS: Card[] = [
    // --- STOCK MARKET EVENTS ---

    // --- REAL ESTATE & BUSINESS BUYERS (MULTIPLIERS 1.5x - 5x) ---

    // 3Br/2Ba House (Cost $8,500)
    { title: 'Покупатель дома', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 13000, description: 'Семья ищет дом. Предлагают $13,000.', type: 'MARKET', id: 'mkt_house_1.5' },
    { title: 'Инвестор в недвижимость', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 25500, description: 'Инвестор скупает районы. $25,500.', type: 'MARKET', id: 'mkt_house_3' },

    // Mini-Hotel (Cost $80,000)
    { title: 'Отельная сеть (M)', targetTitle: 'Мини-отель', offerPrice: 120000, description: 'Сеть расширяется. Предлагают $120,000.', type: 'MARKET', id: 'mkt_hotel_1.5' },
    { title: 'Крупный игрок', targetTitle: 'Мини-отель', offerPrice: 240000, description: 'Фонд хочет ваш отель. $240,000.', type: 'MARKET', id: 'mkt_hotel_3' },
    { title: 'Монополист', targetTitle: 'Мини-отель', offerPrice: 400000, description: 'Предложение, от которого нельзя отказаться. $400,000!', type: 'MARKET', id: 'mkt_hotel_5' },

    // Fast Food (Cost $200,000)
    { title: 'Конкурент (FastFood)', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 300000, description: 'Конкурент выкупает точки. $300,000.', type: 'MARKET', id: 'mkt_ff_1.5' },
    { title: 'Мировой бренд', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 1000000, description: 'Глобальная корпорация поглощает вас. $1,000,000!', type: 'MARKET', id: 'mkt_ff_5' },

    // Organic Farm (Cost $120,000)
    { title: 'Эко-ритейлер', targetTitle: 'Ферма органических овощей', offerPrice: 240000, description: 'Сеть супермаркетов покупает производство. $240,000.', type: 'MARKET', id: 'mkt_farm_2' },
    { title: 'Агрохолдинг', targetTitle: 'Ферма органических овощей', offerPrice: 600000, description: 'Крупный агрохолдинг. $600,000!', type: 'MARKET', id: 'mkt_farm_5' },

    // Car Wash (Cost $150,000)
    { title: 'Франчайзинг', targetTitle: 'Сеть автомоек', offerPrice: 450000, description: 'Вас хотят сделать частью франшизы. $450,000.', type: 'MARKET', id: 'mkt_wash_3' },
    { title: 'Девелопер', targetTitle: 'Сеть автомоек', offerPrice: 600000, description: 'Земля под мойками нужна под застройку. $600,000.', type: 'MARKET', id: 'mkt_wash_4' },

    // Coworking (Cost $250,000)
    { title: 'IT-Стартап', targetTitle: 'Коворкинг-центр', offerPrice: 500000, description: 'Единорог покупает офис. $500,000.', type: 'MARKET', id: 'mkt_cowork_2' },
    { title: 'Google', targetTitle: 'Коворкинг-центр', offerPrice: 1250000, description: 'Техногигант открывает штаб-квартиру. $1,250,000!', type: 'MARKET', id: 'mkt_cowork_5' },

    // Plazma Water (Cost $5,000)
    { title: 'Выкуп франшизы', targetTitle: 'Франшиза: Plazma Water', offerPrice: 25000, description: 'Головная компания выкупает точку. $25,000.', type: 'MARKET', id: 'mkt_plazma_5' },

    // Generic / Other
    { title: 'Слияние сетей', targetTitle: 'Студия маникюра', offerPrice: 25000, description: 'Выкуп сети. $25,000.', type: 'MARKET', id: 'mkt_nail_5' },
    { title: 'Покупатель бизнеса', targetTitle: 'Кофейня', offerPrice: 15000, description: 'Инвестор. $15,000.', type: 'MARKET', id: 'mkt_coffee_3' },
    { title: 'Застройщик', targetTitle: 'Участок земли 20га', offerPrice: 150000, description: 'Цена земли взлетела до $150,000.', type: 'MARKET', id: 'mkt_land_high' },
    { title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 3000, description: 'Покупатель квартиры студии (субаренда) за $3,000.', type: 'MARKET', id: 'mkt_6' },
    { title: 'Выкуп доли', targetTitle: 'Партнёрство в автомастерской', offerPrice: 20000, description: 'Есть покупатель на партнерство за $20,000.', type: 'MARKET', id: 'mkt_4' },
    { title: 'Покупатель жилья', targetTitle: 'Комната в пригороде', offerPrice: 12000, description: 'Старое жилье идет под снос. Предлагают $12,000 за комнату.', type: 'MARKET', id: 'mkt_1' },

    // BITCOIN SCAM
    { title: 'Скам на криптобирже', targetTitle: 'Bitcoin', offerPrice: 0, description: '🔥 Биржа рухнула! ВСЕ BTC СГОРАЮТ! (Цена $0)', type: 'MARKET', id: 'mkt_btc_scam' },
];

export class CardManager {
    private smallDeals: Card[] = [];
    private smallDealsDiscard: Card[] = [];

    private bigDeals: Card[] = [];
    private bigDealsDiscard: Card[] = [];

    private marketDeck: Card[] = [];
    private marketDeckDiscard: Card[] = [];

    expenseDeck: Card[] = [...EXPENSE_CARDS];
    private expenseDeckDiscard: Card[] = [];

    constructor(templates?: { small: Card[], big: Card[], market: Card[], expense: Card[] }) {
        if (templates) {
            // Use provided templates (already have displayId from DB)
            this.smallDeals = this.shuffle(templates.small.map(c => ({ ...c })));
            this.bigDeals = this.shuffle(templates.big.map(c => ({ ...c })));
            this.marketDeck = this.shuffle(templates.market.map(c => ({ ...c })));
            this.expenseDeck = this.shuffle(templates.expense.map(c => ({ ...c })));

            // Log shuffle results
            console.log(`[CardManager] Shuffled DB Templates:`);
            console.log(`  Small Deals: ${this.smallDeals.length} cards. First 3: ${this.smallDeals.slice(0, 3).map(c => c.title).join(', ')}`);
            console.log(`  Big Deals: ${this.bigDeals.length} cards. First 3: ${this.bigDeals.slice(0, 3).map(c => c.title).join(', ')}`);
            console.log(`  Market: ${this.marketDeck.length} cards. First 3: ${this.marketDeck.slice(0, 3).map(c => c.title).join(', ')}`);
            console.log(`  Expense: ${this.expenseDeck.length} cards. First 3: ${this.expenseDeck.slice(0, 3).map(c => c.title).join(', ')}`);
        } else {
            // Legacy / Fallback (Global ID Generation)
            let globalCounter = 1;
            const prepareDeck = (deck: Card[], deckName: string) => {
                const distinctDeck = deck.map(c => ({ ...c }));
                distinctDeck.forEach(c => c.displayId = globalCounter++);
                const shuffled = this.shuffle(distinctDeck);
                console.log(`[CardManager] Prepared & Shuffled ${deckName}: ${shuffled.length} cards. Top: ${shuffled[0]?.title}`);
                return shuffled;
            };

            this.smallDeals = prepareDeck([...SMALL_DEALS], 'Small Deals');
            this.bigDeals = prepareDeck([...BIG_DEALS], 'Big Deals');
            this.marketDeck = prepareDeck([...MARKET_CARDS], 'Market');
            this.expenseDeck = prepareDeck([...EXPENSE_CARDS], 'Expense');
        }
    }

    // Manual Reshuffle Method for host/admin
    reshuffleAllDecks() {
        console.log('[CardManager] Manual Reshuffle initiated');

        // Combine active deck + discard, then reshuffle
        this.smallDeals = this.shuffle([...this.smallDeals, ...this.smallDealsDiscard]);
        this.smallDealsDiscard = [];

        this.bigDeals = this.shuffle([...this.bigDeals, ...this.bigDealsDiscard]);
        this.bigDealsDiscard = [];

        this.marketDeck = this.shuffle([...this.marketDeck, ...this.marketDeckDiscard]);
        this.marketDeckDiscard = [];

        this.expenseDeck = this.shuffle([...this.expenseDeck, ...this.expenseDeckDiscard]);
        this.expenseDeckDiscard = [];

        console.log('[CardManager] All decks reshuffled');
        console.log(`  Small: ${this.smallDeals.length}, Big: ${this.bigDeals.length}, Market: ${this.marketDeck.length}, Expense: ${this.expenseDeck.length}`);
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
