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

// Generator for Small Deals
const generateSmallDeals = (): Card[] => {
    return [
        // Stocks (5, 10, 20, 30, 40)
        { id: 'sd_tsla_5', title: 'Акции: Tesla', symbol: 'TSLA', cost: 5, description: 'Цена $5. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        ...expand(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 10, description: 'Цена $10. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        ...expand(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 20, description: 'Цена $20. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        ...expand(2, { title: 'Акции: Tesla', symbol: 'TSLA', cost: 30, description: 'Цена $30. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        { id: 'sd_tsla_40', title: 'Акции: Tesla', symbol: 'TSLA', cost: 40, description: 'Цена $40. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },

        // Microsoft
        { id: 'sd_msft_5', title: 'Акции: Microsoft', symbol: 'MSFT', cost: 5, description: 'Цена $5. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        ...expand(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 10, description: 'Цена $10. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        ...expand(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 20, description: 'Цена $20. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        ...expand(2, { title: 'Акции: Microsoft', symbol: 'MSFT', cost: 30, description: 'Цена $30. Колебания $5-$40.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        { id: 'sd_msft_40', title: 'Акции: Microsoft', symbol: 'MSFT', cost: 40, description: 'Цена $40. Колебания $5-$40.', assetType: 'STOCK', type: 'DEAL_SMALL' },

        // Bitcoin
        { id: 'sd_btc_4k', title: 'Bitcoin', symbol: 'BTC', cost: 4000, description: 'Криптовалюта на дне. Цена $4,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        { id: 'sd_btc_10k', title: 'Bitcoin', symbol: 'BTC', cost: 10000, description: 'Крипто-зима. Цена $10,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        { id: 'sd_btc_20k', title: 'Bitcoin', symbol: 'BTC', cost: 20000, description: 'Биткоин на хайпе. Цена $20,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        { id: 'sd_btc_30k', title: 'Bitcoin', symbol: 'BTC', cost: 30000, description: 'Биткоин штурмует максимумы. Цена $30,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        { id: 'sd_btc_50k', title: 'Bitcoin', symbol: 'BTC', cost: 50000, description: 'Биткоин растет! Цена $50,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },
        { id: 'sd_btc_100k', title: 'Bitcoin', symbol: 'BTC', cost: 100000, description: 'To The Moon! Цена $100,000.', assetType: 'STOCK', type: 'DEAL_SMALL' },

        // AT&T
        ...expand(2, { title: 'Акции: AT&T (Pref)', symbol: 'T', cost: 5000, cashflow: 50, maxQuantity: 1000, description: 'Привилегированные акции AT&T. Дивиденды $50/акцию. Макс 1000 шт.', assetType: 'STOCK' }, 'DEAL_SMALL'),
        // P&G
        ...expand(2, { title: 'Акции: P&G (Pref)', symbol: 'PG', cost: 2000, cashflow: 10, maxQuantity: 1000, description: 'Привилегированные акции P&G. Дивиденды $10/акцию. Макс 1000 шт.', assetType: 'STOCK' }, 'DEAL_SMALL'),

        { title: 'Комната в пригороде (Север)', cost: 3000, cashflow: 250, description: 'Сдача в аренду. Стабильный доход.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_room_1' },
        { title: 'Комната в пригороде (Юг)', cost: 2500, cashflow: 200, description: 'Небольшая комната. Требует ремонта.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_room_2' },
        { title: 'Комната в пригороде (Центр)', cost: 3500, cashflow: 300, description: 'Отличное расположение.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_room_3' },
        { title: 'Комната в общежитии', cost: 2000, cashflow: 180, description: 'Студенческое общежитие.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_room_4' },
        { title: 'Комната (Лофт)', cost: 4000, cashflow: 350, description: 'Стильная комната.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_room_5' },

        { title: 'Студия маникюра (ТЦ)', cost: 5000, cashflow: 300, description: 'Точка в торговом центре.', assetType: 'BUSINESS', type: 'DEAL_SMALL', id: 'sd_nail_1' },
        { title: 'Студия маникюра (Дом)', cost: 3500, cashflow: 200, description: 'На дому.', assetType: 'BUSINESS', type: 'DEAL_SMALL', id: 'sd_nail_2' },

        { title: 'Кофейня (Киоск)', cost: 4000, cashflow: 300, description: 'Кофе с собой. Высокий трафик.', assetType: 'BUSINESS', type: 'DEAL_SMALL', id: 'sd_coffee_1' },
        { title: 'Кофейня (Островок)', cost: 5500, cashflow: 400, description: 'Островок в БЦ.', assetType: 'BUSINESS', type: 'DEAL_SMALL', id: 'sd_coffee_2' },

        { title: 'Партнёрство в СТО', cost: 4500, cashflow: 350, description: 'Доля в сервисе.', assetType: 'BUSINESS', type: 'DEAL_SMALL', id: 'sd_sto_1' },
        { title: 'Гаражный сервис', cost: 3000, cashflow: 250, description: 'Ремонт своими силами.', assetType: 'BUSINESS', type: 'DEAL_SMALL', id: 'sd_sto_2' },

        ...expand(2, { title: 'Участок земли 20га', cost: 5000, cashflow: 0, description: 'Земля без дохода.', assetType: 'REAL_ESTATE' }, 'DEAL_SMALL'),
        { title: 'Участок земли 10га', cost: 3000, cashflow: 0, description: 'Маленький участок.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_land_2' },

        { title: 'Покупка дрона', cost: 2500, cashflow: 50, description: 'Б/у дрон для съёмок.', assetType: 'OTHER', type: 'DEAL_SMALL', id: 'sd_drone_1' },

        { title: 'Флипинг студии (Ремонт)', cost: 5000, cashflow: 0, description: 'Под перепродажу. Дохода нет.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_flip_1' },
        { title: 'Арендная студия', cost: 6000, cashflow: 400, description: 'Готовая к сдаче студия.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_flip_2' },
        { title: 'Студия (Котлован)', cost: 4000, cashflow: 0, description: 'Стройка.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_flip_3' },
        { title: 'Микро-студия', cost: 4500, cashflow: 300, description: 'Очень маленькая.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_flip_4' },
        { title: 'Лофт-студия', cost: 7000, cashflow: 500, description: 'Элитный ремонт.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL', id: 'sd_flip_5' },
        ...expand(3, { title: 'Сетевой бизнес', cost: 500, cashflow: 100, description: 'Старт в MLM компании.', businessType: 'NETWORK' }, 'DEAL_SMALL'),
        ...expand(3, { title: 'Сетевой бизнес: Plazma Water', cost: 200, cashflow: 0, description: 'Plazma Water. Кол-во партнеров = Бросок кубика. ($100/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' }, 'DEAL_SMALL'),
        ...expand(3, { title: 'Сетевой бизнес: MONEO', cost: 100, cashflow: 0, description: 'MONEO Network. Кол-во партнеров = Бросок кубика. ($50/партнер)', businessType: 'NETWORK', subtype: 'MLM_ROLL' }, 'DEAL_SMALL'),

        // FRIEND CARDS
        { id: 'sd_friend_loss', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Увы, друг прогорел. Деньги потеряны!', mandatory: true, type: 'DEAL_SMALL' },
        { id: 'sd_friend_biz', title: 'Друг просит в займ', cost: 5000, cashflow: 500, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Ура! Друг раскрутился! Вы получаете долю в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
        { id: 'sd_friend_luck', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Друг вернул долг уроком мудрости! +2 кубика на 3 хода.', mandatory: true, type: 'DEAL_SMALL', subtype: 'CHARITY_ROLL' },

        // DAMAGES
        ...expand(2, { title: 'Крыша протекла', cost: 5000, cashflow: 0, description: 'Обновить крышу. Платите $5000 ЕСЛИ есть недвижимость.', mandatory: true }, 'DEAL_SMALL'),
        ...expand(3, { title: 'Прорыв канализации', cost: 2000, cashflow: 0, description: 'Починить канализацию. Платите $2000 ЕСЛИ есть недвижимость.', mandatory: true }, 'DEAL_SMALL'),
    ];
};

// Generator for Market Cards (Selling Opportunities)
const generateMarketCards = (): Card[] => {
    return [
        { title: 'Покупатель дома', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 13000, description: 'Семья ищет дом. Предлагают $13,000.', type: 'MARKET', id: 'mkt_house_1.5' },
        { title: 'Инвестор в недвижимость', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 25500, description: 'Инвестор скупает районы. $25,500.', type: 'MARKET', id: 'mkt_house_3' },

        { title: 'Отельная сеть (M)', targetTitle: 'Мини-отель', offerPrice: 120000, description: 'Сеть расширяется. Предлагают $120,000.', type: 'MARKET', id: 'mkt_hotel_1.5' },
        { title: 'Крупный игрок', targetTitle: 'Мини-отель', offerPrice: 240000, description: 'Фонд хочет ваш отель. $240,000.', type: 'MARKET', id: 'mkt_hotel_3' },
        { title: 'Монополист', targetTitle: 'Мини-отель', offerPrice: 400000, description: 'Предложение, от которого нельзя отказаться. $400,000!', type: 'MARKET', id: 'mkt_hotel_5' },

        { title: 'Конкурент (FastFood)', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 300000, description: 'Конкурент выкупает точки. $300,000.', type: 'MARKET', id: 'mkt_ff_1.5' },
        { title: 'Мировой бренд', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 1000000, description: 'Глобальная корпорация поглощает вас. $1,000,000!', type: 'MARKET', id: 'mkt_ff_5' },

        { title: 'Эко-ритейлер', targetTitle: 'Ферма органических овощей', offerPrice: 240000, description: 'Сеть супермаркетов покупает производство. $240,000.', type: 'MARKET', id: 'mkt_farm_2' },
        { title: 'Агрохолдинг', targetTitle: 'Ферма органических овощей', offerPrice: 600000, description: 'Крупный агрохолдинг. $600,000!', type: 'MARKET', id: 'mkt_farm_5' },

        { title: 'Франчайзинг', targetTitle: 'Сеть автомоек', offerPrice: 450000, description: 'Вас хотят сделать частью франшизы. $450,000.', type: 'MARKET', id: 'mkt_wash_3' },
        { title: 'Девелопер', targetTitle: 'Сеть автомоек', offerPrice: 600000, description: 'Земля под мойками нужна под застройку. $600,000.', type: 'MARKET', id: 'mkt_wash_4' },

        { title: 'IT-Стартап', targetTitle: 'Коворкинг-центр', offerPrice: 500000, description: 'Единорог покупает офис. $500,000.', type: 'MARKET', id: 'mkt_cowork_2' },
        { title: 'Google', targetTitle: 'Коворкинг-центр', offerPrice: 1250000, description: 'Техногигант открывает штаб-квартиру. $1,250,000!', type: 'MARKET', id: 'mkt_cowork_5' },

        { title: 'Выкуп франшизы', targetTitle: 'Франшиза: Plazma Water', offerPrice: 25000, description: 'Головная компания выкупает точку. $25,000.', type: 'MARKET', id: 'mkt_plazma_5' },

        { title: 'Слияние сетей', targetTitle: 'Студия маникюра', offerPrice: 25000, description: 'Выкуп сети. $25,000.', type: 'MARKET', id: 'mkt_nail_5' },
        { title: 'Покупатель бизнеса', targetTitle: 'Кофейня', offerPrice: 15000, description: 'Инвестор. $15,000.', type: 'MARKET', id: 'mkt_coffee_3' },
        { title: 'Застройщик', targetTitle: 'Участок земли 20га', offerPrice: 150000, description: 'Цена земли взлетела до $150,000.', type: 'MARKET', id: 'mkt_land_high' },
        { title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 7000, description: 'Покупатель квартиры студии (субаренда) за $7,000.', type: 'MARKET', id: 'mkt_6' },
        { title: 'Выкуп доли', targetTitle: 'Партнёрство в автомастерской', offerPrice: 50000, description: 'Есть покупатель на партнерство за $50,000.', type: 'MARKET', id: 'mkt_4' },
        { title: 'Покупатель жилья', targetTitle: 'Комната в пригороде', offerPrice: 25000, description: 'Старое жилье идет под снос. Предлагают $25,000 за комнату.', type: 'MARKET', id: 'mkt_1' },

        { title: 'Скам на криптобирже', targetTitle: 'Bitcoin', offerPrice: 0, description: 'Биржа рухнула. Все ваши BTC сгорают (Цена $0).', type: 'MARKET', id: 'mkt_btc_scam' },
    ];
};


// Generator for Big Deals (Target: ~40 cards)
const generateBigDeals = (): Card[] => {
    return [
        // Real Estate - Houses/Apts
        // Real Estate - Houses/Apts
        { id: 'bd_house_1', title: 'Дом (3Br/2Ba) Старый', description: 'Требует вложений, но дешев.', cost: 8000, downPayment: 1000, cashflow: 300, type: 'DEAL_BIG', assetType: 'REAL_ESTATE' },
        { id: 'bd_house_2', title: 'Дом (3Br/2Ba) Новый', description: 'Новый район.', cost: 12000, downPayment: 2000, cashflow: 400, type: 'DEAL_BIG', assetType: 'REAL_ESTATE' },

        { id: 'bd_duplex_1', title: 'Дуплекс (Север)', cost: 15000, downPayment: 3000, cashflow: 500, description: 'Две квартиры.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },
        { id: 'bd_duplex_2', title: 'Дуплекс (Юг)', cost: 12000, downPayment: 2000, cashflow: 400, description: 'Бюджетный вариант.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },

        { id: 'bd_4plex_1', title: '4-квартирный дом (А)', cost: 35000, downPayment: 8000, cashflow: 1400, description: 'Полная заселенность.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },
        { id: 'bd_4plex_2', title: '4-квартирный дом (Б)', cost: 40000, downPayment: 10000, cashflow: 1600, description: 'Хороший район.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },
        { id: 'bd_4plex_3', title: '4-квартирный дом (В)', cost: 30000, downPayment: 6000, cashflow: 1000, description: 'Требует управления.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },

        { id: 'bd_8plex_1', title: '8-квартирный комплекс', cost: 100000, downPayment: 25000, cashflow: 3500, description: 'Жилой комплекс.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },
        { id: 'bd_8plex_2', title: 'ЖК "Солнечный"', cost: 120000, downPayment: 30000, cashflow: 4200, description: 'Элитный комплекс на 8 квартир.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },
        { id: 'bd_8plex_3', title: 'ЖК "Заря"', cost: 90000, downPayment: 20000, cashflow: 3000, description: 'Эконом класс.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },

        // Hospitality (Already Updated Mini-hotels here, lines after this block)

        // Classic Business (Varied)
        { id: 'bd_fastfood_1', title: 'Сеть кафе (Центр)', cost: 200000, downPayment: 40000, cashflow: 7500, description: 'Точки в центре.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },
        { id: 'bd_fastfood_2', title: 'Сеть кафе (ТЦ)', cost: 180000, downPayment: 35000, cashflow: 6500, description: 'Фудкорты.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },
        { id: 'bd_fastfood_3', title: 'Сеть Бургерных', cost: 220000, downPayment: 45000, cashflow: 8500, description: 'Популярный бренд.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },

        { id: 'bd_farm_1', title: 'Эко-Ферма', cost: 120000, downPayment: 30000, cashflow: 4500, description: 'Овощи.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },
        { id: 'bd_farm_2', title: 'Молочная ферма', cost: 140000, downPayment: 35000, cashflow: 5000, description: 'Сыроварня.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },

        { id: 'bd_wash_1', title: 'Сеть автомоек', cost: 150000, downPayment: 35000, cashflow: 5500, description: 'Самообслуживание.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },
        { id: 'bd_wash_2', title: 'Детейлинг центр', cost: 170000, downPayment: 40000, cashflow: 6500, description: 'Премиум мойка.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },

        { id: 'bd_cowork_1', title: 'Коворкинг (Лофт)', cost: 250000, downPayment: 50000, cashflow: 9000, description: 'Модное место.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },
        { id: 'bd_cowork_2', title: 'Офисный центр', cost: 300000, downPayment: 60000, cashflow: 11000, description: 'Бизнес класс.', businessType: 'CLASSIC', assetType: 'BUSINESS', type: 'DEAL_BIG' },

        // Network
        ...expand(6, { title: 'Франшиза: Plazma Water', cost: 5000, cashflow: 1000, description: 'Франшиза Plazma Water. Стабильный доход.', businessType: 'NETWORK' }, 'DEAL_BIG'),
        ...expand(5, { title: 'Франшиза: MONEO', cost: 5000, cashflow: 1000, description: 'Франшиза MONEO. Стабильный доход.', businessType: 'NETWORK' }, 'DEAL_BIG'),
    ];
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
        // Generate and Assign Global IDs sequentially (Stable IDs)
        let globalCounter = 1;
        // Helper: Assign then Shuffle
        const prepareDeck = (deck: Card[]) => {
            deck.forEach(c => c.displayId = globalCounter++);
            return this.shuffle(deck);
        };

        this.smallDeals = prepareDeck(generateSmallDeals());
        this.bigDeals = prepareDeck(generateBigDeals());
        this.marketDeck = prepareDeck(generateMarketCards());
        this.expenseDeck = prepareDeck([...EXPENSE_CARDS]);
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
