
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
];
