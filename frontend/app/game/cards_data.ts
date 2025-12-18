
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

// Helper to expand counts
const expand = (count: number, template: Partial<Card>, type: Card['type']): Card[] => {
    return Array(count).fill(null).map((_, i) => ({ ...template, id: `${type}_${template.title}_${i}`, type } as Card));
};

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
        cost: 5000,
        cashflow: 50,
        maxQuantity: 1000,
        description: 'Привилегированные акции AT&T. Дивиденды $50/акцию. Макс 1000 шт.',
        assetType: 'STOCK'
    }, 'DEAL_SMALL'),

    // P&G
    ...expand(2, {
        title: 'Акции: P&G (Pref)',
        symbol: 'PG',
        cost: 2000,
        cashflow: 10,
        maxQuantity: 1000,
        description: 'Привилегированные акции P&G. Дивиденды $10/акцию. Макс 1000 шт.',
        assetType: 'STOCK'
    }, 'DEAL_SMALL'),

    ...expand(5, { title: 'Комната в пригороде', cost: 3000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Студия маникюра', cost: 4900, cashflow: 200, description: 'Студия маникюра на 1 место.', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Кофейня', cost: 4900, cashflow: 100, description: 'Небольшая кофейня.', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Партнёрство в автомастерской', cost: 4500, cashflow: 350, description: 'Доля в бизнесе.', assetType: 'BUSINESS' }, 'DEAL_SMALL'),
    ...expand(2, { title: 'Участок земли 20га', cost: 5000, cashflow: 0, description: 'Земля без дохода.', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),
    ...expand(1, { title: 'Покупка дрона', cost: 3000, cashflow: 50, description: 'Дрон для съёмок.', assetType: 'OTHER' }, 'DEAL_SMALL'),
    ...expand(5, { title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),
    ...expand(3, { title: 'Сетевой бизнес', cost: 500, cashflow: 100, description: 'Старт в MLM компании.', businessType: 'NETWORK' }, 'DEAL_SMALL'),
    ...expand(3, { title: 'Сетевой бизнес: Plazma Water', cost: 200, cashflow: 0, description: 'Plazma Water. Кол-во партнеров = Бросок кубика. ($100/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' }, 'DEAL_SMALL'),
    ...expand(3, { title: 'Сетевой бизнес: MONEO', cost: 100, cashflow: 0, description: 'MONEO Network. Кол-во партнеров = Бросок кубика. ($50/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' }, 'DEAL_SMALL'),

    // FRIEND CARDS (Hidden Outcomes)
    { id: 'sd_friend_loss', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Увы, друг прогорел. Деньги потеряны!', mandatory: true, type: 'DEAL_SMALL' },
    { id: 'sd_friend_biz', title: 'Друг просит в займ', cost: 5000, cashflow: 500, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Ура! Друг раскрутился! Вы получаете долю в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { id: 'sd_friend_luck', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Друг вернул долг уроком мудрости! +2 кубика на 3 хода.', mandatory: true, type: 'DEAL_SMALL', subtype: 'CHARITY_ROLL' },

    ...expand(2, { title: 'Крыша протекла', cost: 5000, cashflow: 0, description: 'Обновить крышу. Платите $5000 ЕСЛИ есть недвижимость.', mandatory: true }, 'DEAL_SMALL'),
    ...expand(3, { title: 'Прорыв канализации', cost: 2000, cashflow: 0, description: 'Починить канализацию. Платите $2000 ЕСЛИ есть недвижимость.', mandatory: true }, 'DEAL_SMALL'),
];

export const BIG_DEALS: Card[] = [
    { id: 'bd_house_ex', title: 'Дом (3Br/2Ba)', description: 'Дом под сдачу. Цена $7000-10000. Доход $100-300.', cost: 8500, cashflow: 200, type: 'DEAL_BIG' }, // Example representative
    ...expand(2, { title: 'Мини-отель', cost: 80000, cashflow: 3000, description: 'Бутик-отель на 10 номеров, стабильно приносит доход.', downPayment: 20000, businessType: 'CLASSIC', assetType: 'REAL_ESTATE' }, 'DEAL_BIG'),
    ...expand(2, { title: 'Сеть кафе быстрого питания', cost: 200000, cashflow: 7000, description: 'Прибыльный бизнес, несколько точек в центре города.', downPayment: 40000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG'),
    { title: 'Ферма органических овощей', cost: 120000, cashflow: 4500, description: 'Экологичное хозяйство с контрактами на поставку.', downPayment: 30000, businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG', id: 'bd_farm' },
    { title: 'Сеть автомоек', cost: 150000, cashflow: 5000, description: 'Хорошее расположение, стабильный трафик клиентов.', downPayment: 35000, businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG', id: 'bd_wash' },
    { title: 'Коворкинг-центр', cost: 250000, cashflow: 8000, description: 'Большое пространство для аренды под стартапы и фрилансеров.', downPayment: 50000, businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG', id: 'bd_co' },
    ...expand(3, { title: 'Франшиза: Plazma Water', cost: 5000, cashflow: 1000, description: 'Франшиза Plazma Water. Стабильный доход.', businessType: 'NETWORK' }, 'DEAL_BIG'),
    ...expand(3, { title: 'Франшиза: MONEO', cost: 5000, cashflow: 1000, description: 'Франшиза MONEO. Стабильный доход.', businessType: 'NETWORK' }, 'DEAL_BIG'),


];

export const MARKET_CARDS: Card[] = [
    // --- STOCK MARKET EVENTS ---
    // STOCKS REMOVED FROM MARKET
    // { title: 'Акции TSLA: $40', targetTitle: 'Акции: Tesla', offerPrice: 40, description: 'Рост на новостях о новой батарее. Рынок покупает по $40.', type: 'MARKET', id: 'mkt_tsla_high' },
    // { title: 'Акции TSLA: $5', targetTitle: 'Акции: Tesla', offerPrice: 5, description: 'Проблемы с автопилотом. Рынок падает до $5.', type: 'MARKET', id: 'mkt_tsla_low' },
    // { title: 'Акции MSFT: $40', targetTitle: 'Акции: Microsoft', offerPrice: 40, description: 'Рекордная прибыль облачного сегмента. Рынок $40.', type: 'MARKET', id: 'mkt_msft_high' },
    // { title: 'Акции MSFT: $5', targetTitle: 'Акции: Microsoft', offerPrice: 5, description: 'Антимонопольный иск. Рынок падает до $5.', type: 'MARKET', id: 'mkt_msft_low' },
    // { title: 'Сплит Акций TSLA', description: 'Сплит 2 к 1. Увеличьте кол-во акций в 2 раза.', type: 'MARKET', id: 'mkt_split_tsla', action: 'OFFER' },
    // { title: 'Сплит Акций MSFT', description: 'Сплит 2 к 1. Увеличьте кол-во акций в 2 раза.', type: 'MARKET', id: 'mkt_split_msft', action: 'OFFER' },

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
    { title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 7000, description: 'Покупатель квартиры студии (субаренда) за $7,000.', type: 'MARKET', id: 'mkt_6' },
    { title: 'Выкуп доли', targetTitle: 'Партнёрство в автомастерской', offerPrice: 50000, description: 'Есть покупатель на партнерство за $50,000.', type: 'MARKET', id: 'mkt_4' },
    { title: 'Покупатель жилья', targetTitle: 'Комната в пригороде', offerPrice: 25000, description: 'Старое жилье идет под снос. Предлагают $25,000 за комнату.', type: 'MARKET', id: 'mkt_1' },

    // BITCOIN SCAM
    { title: 'Скам на криптобирже', targetTitle: 'Bitcoin', offerPrice: 0, description: 'Биржа рухнула. Все ваши BTC сгорают (Цена $0).', type: 'MARKET', id: 'mkt_btc_scam' },
];

