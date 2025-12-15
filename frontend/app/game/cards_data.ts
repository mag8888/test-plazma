
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
}

// Helper to expand counts
const expand = (count: number, template: Partial<Card>, type: Card['type']): Card[] => {
    return Array(count).fill(null).map((_, i) => ({ ...template, id: `${type}_${template.title}_${i}`, type } as Card));
};

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
    { id: 'e13', type: 'EXPENSE', title: 'Новый ноутбук', description: 'Мощный игровой ноутбук.', cost: 1500, mandatory: true },
    { id: 'e14', type: 'EXPENSE', title: 'Абонемент в фитнес', description: 'Годовой абонемент.', cost: 400, mandatory: true },
    { id: 'e15', type: 'EXPENSE', title: 'Годовщина', description: 'Подарок и ресторан.', cost: 500, mandatory: true },
    { id: 'e16', type: 'EXPENSE', title: 'Штраф ПДД', description: 'Превышение скорости.', cost: 200, mandatory: true },
    { id: 'e17', type: 'EXPENSE', title: 'Клюшки для гольфа', description: 'Спорт элиты.', cost: 800, mandatory: true },
    { id: 'e18', type: 'EXPENSE', title: 'Картина', description: 'Искусство для дома.', cost: 1200, mandatory: true },
    { id: 'e19', type: 'EXPENSE', title: 'Дизайнерский костюм', description: 'Для деловых встреч.', cost: 1000, mandatory: true },
    { id: 'e20', type: 'EXPENSE', title: 'Поездка за город', description: 'Выходные в отеле.', cost: 1000, mandatory: true },
    { id: 'e21', type: 'EXPENSE', title: 'Кофемашина', description: 'Профессиональная.', cost: 300, mandatory: true },
    { id: 'e22', type: 'EXPENSE', title: 'Ювелирное украшение', description: 'Кольцо с бриллиантом.', cost: 2000, mandatory: true },
    { id: 'e23', type: 'EXPENSE', title: 'Ветеринар', description: 'Лечение питомца.', cost: 600, mandatory: true },
    { id: 'e24', type: 'EXPENSE', title: 'Курсы повышения', description: 'Образование.', cost: 500, mandatory: true },
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
    { id: 'sd_friend_loss', title: 'Друг просит в займ (Неудачно)', cost: 5000, cashflow: 0, description: 'Слезы и обещания. Деньги пропали.', mandatory: true, type: 'DEAL_SMALL' },
    { id: 'sd_friend_biz', title: 'Друг просит в займ (Бизнес)', cost: 5000, cashflow: 500, description: 'Друг раскрутился! Возвращает долей в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { id: 'sd_friend_luck', title: 'Друг просит в займ (Удача)', cost: 5000, cashflow: 0, description: 'В благодарность друг научил вас мудрости. 2 кубика на 3 хода.', mandatory: true, type: 'DEAL_SMALL', subtype: 'CHARITY_ROLL' },
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
    { title: 'Покупатель жилья', targetTitle: 'Комната в пригороде', offerPrice: 25000, description: 'Старое жилье идет под снос. Предлагают $25,000 за комнату.', type: 'MARKET', id: 'mkt_1' },
    { title: 'Слияние сетей', targetTitle: 'Студия маникюра', offerPrice: 100000, description: 'Большая сеть выкупает все маникюрные салоны. Предлагают $100,000.', type: 'MARKET', id: 'mkt_2' },
    { title: 'Инвестор кофейни', targetTitle: 'Кофейня', offerPrice: 25000, description: 'Покупатель кофейни предлагает $25,000.', type: 'MARKET', id: 'mkt_3' },
    { title: 'Выкуп доли', targetTitle: 'Партнёрство в автомастерской', offerPrice: 50000, description: 'Есть покупатель на партнерство за $50,000.', type: 'MARKET', id: 'mkt_4' },
    { title: 'Застройщик', targetTitle: 'Участок земли 20га', offerPrice: 100000, description: 'Застройщик ищет землю. Предлагает $100,000.', type: 'MARKET', id: 'mkt_5' },
    { title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 7000, description: 'Покупатель квартиры студии (субаренда) за $7,000.', type: 'MARKET', id: 'mkt_6' },
    // NEW MARKET CARDS (+18)
    { title: 'Акции TSLA: $40', targetTitle: 'Акции: Tesla', offerPrice: 40, description: 'Рост на новостях о новой батарее. Рынок покупает по $40.', type: 'MARKET', id: 'mkt_7' },
    { title: 'Акции TSLA: $5', targetTitle: 'Акции: Tesla', offerPrice: 5, description: 'Проблемы с автопилотом. Рынок падает до $5.', type: 'MARKET', id: 'mkt_8' },
    { title: 'Акции MSFT: $40', targetTitle: 'Акции: Microsoft', offerPrice: 40, description: 'Рекордная прибыль облачного сегмента. Рынок $40.', type: 'MARKET', id: 'mkt_9' },
    { title: 'Акции MSFT: $5', targetTitle: 'Акции: Microsoft', offerPrice: 5, description: 'Антимонопольный иск. Рынок падает до $5.', type: 'MARKET', id: 'mkt_10' },
    { title: 'Покупатель дома', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 135000, description: 'Молодая семья ищет дом. Предлагают $135,000.', type: 'MARKET', id: 'mkt_11' },
    { title: 'Спрос на органику', targetTitle: 'Ферма органических овощей', offerPrice: 200000, description: 'Бум здорового питания. Сеть супермаркетов дает $200,000.', type: 'MARKET', id: 'mkt_12' },
    { title: 'Инвестор в отели', targetTitle: 'Мини-отель', offerPrice: 120000, description: 'Туристический сезон. Инвестор предлагает $120,000.', type: 'MARKET', id: 'mkt_13' },
    { title: 'Покупатель автомойки', targetTitle: 'Сеть автомоек', offerPrice: 220000, description: 'Конкурент хочет выкупить ваш бизнес за $220,000.', type: 'MARKET', id: 'mkt_14' },
    { title: 'IT-Гигант', targetTitle: 'Коворкинг-центр', offerPrice: 350000, description: 'IT компания хочет выкупить здание за $350,000.', type: 'MARKET', id: 'mkt_15' },
    { title: 'Покупатель дрона', targetTitle: 'Покупка дрона', offerPrice: 2000, description: 'Фотограф хочет купить ваш дрон за $2000.', type: 'MARKET', id: 'mkt_16' },
    { title: 'Сплит Акций TSLA', description: 'Сплит 2 к 1. Увеличьте кол-во акций в 2 раза. Цена делится пополам.', type: 'MARKET', id: 'mkt_17', action: 'OFFER' }, // Generic Logic needed for splits
    { title: 'Сплит Акций MSFT', description: 'Сплит 2 к 1. Увеличьте кол-во акций в 2 раза. Цена делится пополам.', type: 'MARKET', id: 'mkt_18', action: 'OFFER' },
    { title: 'Покупатель франшизы', targetTitle: 'Франшиза: Plazma Water', offerPrice: 8000, description: 'Партнер хочет выкупить вашу точку за $8,000.', type: 'MARKET', id: 'mkt_19' },
    { title: 'Покупатель франшизы', targetTitle: 'Франшиза: MONEO', offerPrice: 8000, description: 'Партнер хочет выкупить вашу точку за $8,000.', type: 'MARKET', id: 'mkt_20' },
    { title: 'Рост земли', targetTitle: 'Участок земли 20га', offerPrice: 150000, description: 'Город расширяется. Цена земли выросла до $150,000.', type: 'MARKET', id: 'mkt_21' },
    { title: 'Покупатель 4-плекс', description: 'Инвестор ищет многоквартирный дом. Предлагает $100,000 за 4-plex.', type: 'MARKET', id: 'mkt_22' },
    { title: 'Коллекционер', targetTitle: 'Картина', offerPrice: 5000, description: 'Ваша картина оказалась шедевром. Предлагают $5,000.', type: 'MARKET', id: 'mkt_23' },
    { title: 'Покупатель бизнеса', targetTitle: 'Студия маникюра', offerPrice: 15000, description: 'Мастер хочет выкупить студию за $15,000.', type: 'MARKET', id: 'mkt_24' },
];

