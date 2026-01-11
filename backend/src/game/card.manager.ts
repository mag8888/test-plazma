// Card Types
export interface Card {
    id: string;
    type: 'MARKET' | 'EXPENSE' | 'DEAL_SMALL' | 'DEAL_BIG' | 'BUSINESS' | 'DREAM' | 'REAL_ESTATE' | 'OTHER' | 'STOCK';
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
    subtype?: 'MLM_ROLL' | 'CHARITY_ROLL' | 'MLM_PLACEMENT';
    assetType?: 'REAL_ESTATE' | 'BUSINESS' | 'STOCK' | 'OTHER';
    maxQuantity?: number;
    outcomeDescription?: string; // Revealed after purchase
    displayId?: number; // Visual ID (e.g. No 1)

    // Buyout / Ownership flags
    ownerId?: string;
    ownerName?: string;
    isBuyout?: boolean;
    originalCost?: number;
}

// Expense Cards
// Helper to expand counts
// Helper to expand counts
const expand = (count: number, template: Partial<Card>, type: Card['type'], startDisplayId: number): Card[] => {
    return Array(count).fill(null).map((_, i) => ({
        ...template,
        id: `${type}_${template.title}_${i}`,
        type,
        displayId: startDisplayId + i
    } as Card));
};

// Expense Cards
export const EXPENSE_CARDS: Card[] = [
    // Low ($50 - $400)
    { displayId: 1, id: 'e1', type: 'EXPENSE', title: 'Обед в ресторане', description: 'С друзьями.', cost: 50, mandatory: true },
    { displayId: 2, id: 'e2', type: 'EXPENSE', title: 'Ремонт кофемашины', description: 'Поломка.', cost: 100, mandatory: true },
    { displayId: 3, id: 'e3', type: 'EXPENSE', title: 'Новые кроссовки', description: 'Спорт.', cost: 150, mandatory: true },
    { displayId: 4, id: 'e4', type: 'EXPENSE', title: 'Штраф ПДД', description: 'Превышение скорости.', cost: 200, mandatory: true },
    { displayId: 5, id: 'e5', type: 'EXPENSE', title: 'Ужин премиум', description: 'Гастрономический сет.', cost: 250, mandatory: true },
    { displayId: 6, id: 'e6', type: 'EXPENSE', title: 'Концерт', description: 'Обычные места.', cost: 300, mandatory: true },
    { displayId: 7, id: 'e7', type: 'EXPENSE', title: 'Подписки на сервисы', description: 'Годовая подписка.', cost: 350, mandatory: true },
    { displayId: 8, id: 'e8', type: 'EXPENSE', title: 'Абонемент в фитнес', description: 'Квартальный.', cost: 400, mandatory: true },

    // Mid ($500 - $1500)
    { displayId: 9, id: 'e9', type: 'EXPENSE', title: 'Благотворительность', description: 'Пожертвование.', cost: 500, mandatory: true },
    { displayId: 10, id: 'e10', type: 'EXPENSE', title: 'Ветеринар', description: 'Лечение питомца.', cost: 600, mandatory: true },
    { displayId: 11, id: 'e11', type: 'EXPENSE', title: 'Новый смартфон', description: 'Бюджетная модель.', cost: 800, mandatory: true },
    { displayId: 12, id: 'e12', type: 'EXPENSE', title: 'ТО Автомобиля', description: 'Замена масла и фильтров.', cost: 900, mandatory: true },
    { displayId: 13, id: 'e13', type: 'EXPENSE', title: 'Шопинг', description: 'Одежда (сезонная).', cost: 1000, mandatory: true },
    { displayId: 14, id: 'e14', type: 'EXPENSE', title: 'Бытовая техника', description: 'Посудомоечная машина.', cost: 1100, mandatory: true },
    { displayId: 15, id: 'e15', type: 'EXPENSE', title: 'Ремонт машины', description: 'Замена деталей.', cost: 1200, mandatory: true },
    { displayId: 16, id: 'e16', type: 'EXPENSE', title: 'Стоматолог', description: 'Лечение зубов.', cost: 1300, mandatory: true },
    { displayId: 17, id: 'e17', type: 'EXPENSE', title: 'Страховка', description: 'Страхование жизни.', cost: 1400, mandatory: true },
    { displayId: 18, id: 'e18', type: 'EXPENSE', title: 'Новый ноутбук', description: 'Рабочий инструмент.', cost: 1500, mandatory: true },

    // High ($2000 - $5000)
    { displayId: 19, id: 'e19', type: 'EXPENSE', title: 'Отпуск', description: 'Тур на море.', cost: 2000, mandatory: true },
    { displayId: 20, id: 'e20', type: 'EXPENSE', title: 'Брендовая сумка', description: 'Подарок.', cost: 2500, mandatory: true },
    { displayId: 21, id: 'e21', type: 'EXPENSE', title: 'Ремонт дома', description: 'Косметический ремонт.', cost: 3000, mandatory: true },
    { displayId: 22, id: 'e22', type: 'EXPENSE', title: 'Обслуживание катера', description: 'Сезонное обслуживание.', cost: 3500, mandatory: true },
    { displayId: 23, id: 'e23', type: 'EXPENSE', title: 'Подарок на свадьбу', description: 'Щедрый подарок.', cost: 4000, mandatory: true },
    { displayId: 24, id: 'e24', type: 'EXPENSE', title: 'Аренда виллы', description: 'Вечеринка для друзей.', cost: 5000, mandatory: true },
];

export const SMALL_DEALS: Card[] = [
    // 1-8 Stocks: Tesla
    { displayId: 1, id: 'sd_tsla_15', title: 'Акции: Tesla', symbol: 'TSLA', cost: 15, description: 'Цена $15. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 2, id: 'sd_tsla_20', title: 'Акции: Tesla', symbol: 'TSLA', cost: 20, description: 'Цена $20. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 3, id: 'sd_tsla_40', title: 'Акции: Tesla', symbol: 'TSLA', cost: 40, description: 'Цена $40. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 4, id: 'sd_tsla_60', title: 'Акции: Tesla', symbol: 'TSLA', cost: 60, description: 'Цена $60. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 5, id: 'sd_tsla_80', title: 'Акции: Tesla', symbol: 'TSLA', cost: 80, description: 'Цена $80. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 6, id: 'sd_tsla_160', title: 'Акции: Tesla', symbol: 'TSLA', cost: 160, description: 'Цена $160. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 7, id: 'sd_tsla_180', title: 'Акции: Tesla', symbol: 'TSLA', cost: 180, description: 'Цена $180. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 8, id: 'sd_tsla_200', title: 'Акции: Tesla', symbol: 'TSLA', cost: 200, description: 'Цена $200. Колебания $15-$200.', assetType: 'STOCK', type: 'DEAL_SMALL' },

    // 9-13 TON Token
    { displayId: 9, id: 'sd_ton_1', title: 'TON Token ($1)', symbol: 'TON', cost: 1, description: 'TON Token (криптовалюта)', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 10, id: 'sd_ton_2', title: 'TON Token ($2)', symbol: 'TON', cost: 2, description: 'TON Token (криптовалюта)', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 11, id: 'sd_ton_3', title: 'TON Token ($3)', symbol: 'TON', cost: 3, description: 'TON Token (криптовалюта)', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 12, id: 'sd_ton_5', title: 'TON Token ($5)', symbol: 'TON', cost: 5, description: 'TON Token (криптовалюта)', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 13, id: 'sd_ton_10', title: 'TON Token ($10)', symbol: 'TON', cost: 10, description: 'TON Token (криптовалюта)', assetType: 'STOCK', type: 'DEAL_SMALL' },

    // 14-19 Bitcoin
    // 14-19 Bitcoin
    { displayId: 14, id: 'sd_btc_4k', title: 'Bitcoin', symbol: 'BTC', cost: 4000, description: 'Криптовалюта на дне. Цена $4,000. Колебания $4k-$100k.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 15, id: 'sd_btc_10k', title: 'Bitcoin', symbol: 'BTC', cost: 10000, description: 'Крипто-зима. Цена $10,000. Колебания $4k-$100k.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 16, id: 'sd_btc_20k', title: 'Bitcoin', symbol: 'BTC', cost: 20000, description: 'Биткоин на хайпе. Цена $20,000. Колебания $4k-$100k.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 17, id: 'sd_btc_30k', title: 'Bitcoin', symbol: 'BTC', cost: 30000, description: 'Биткоин штурмует максимумы. Цена $30,000. Колебания $4k-$100k.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 18, id: 'sd_btc_50k', title: 'Bitcoin', symbol: 'BTC', cost: 50000, description: 'Биткоин растет! Цена $50,000. Колебания $4k-$100k.', assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 19, id: 'sd_btc_100k', title: 'Bitcoin', symbol: 'BTC', cost: 100000, description: 'To The Moon! Цена $100,000. Колебания $4k-$100k.', assetType: 'STOCK', type: 'DEAL_SMALL' },

    // 20-23 Preferred Stocks
    { displayId: 20, id: 'sd_att_pref_1', title: 'Акции: AT&T (Pref)', symbol: 'T', cost: 5000, cashflow: 50, description: 'Привилегированные акции AT&T. Дивиденды $50/акцию. Макс 1000 шт.', maxQuantity: 1000, assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 21, id: 'sd_att_pref_2', title: 'Акции: AT&T (Pref)', symbol: 'T', cost: 5000, cashflow: 50, description: 'Привилегированные акции AT&T. Дивиденды $50/акцию. Макс 1000 шт.', maxQuantity: 1000, assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 22, id: 'sd_pg_pref_1', title: 'Акции: P&G (Pref)', symbol: 'PG', cost: 2000, cashflow: 10, description: 'Привилегированные акции P&G. Дивиденды $10/акцию. Макс 1000 шт.', maxQuantity: 1000, assetType: 'STOCK', type: 'DEAL_SMALL' },
    { displayId: 23, id: 'sd_pg_pref_2', title: 'Акции: P&G (Pref)', symbol: 'PG', cost: 2000, cashflow: 10, description: 'Привилегированные акции P&G. Дивиденды $10/акцию. Макс 1000 шт.', maxQuantity: 1000, assetType: 'STOCK', type: 'DEAL_SMALL' },

    // 24-28 Room
    { displayId: 24, id: 'sd_room_1', title: 'Комната в пригороде', cost: 15000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 25, id: 'sd_room_2', title: 'Комната в пригороде', cost: 15000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 26, id: 'sd_room_3', title: 'Комната в пригороде', cost: 15000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 27, id: 'sd_room_4', title: 'Комната в пригороде', cost: 15000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 28, id: 'sd_room_5', title: 'Комната в пригороде', cost: 15000, cashflow: 250, description: 'Сдача в аренду. ROI ~100%.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },

    // 29 Nail
    { displayId: 29, id: 'sd_nail', title: 'Студия маникюра', cost: 5000, cashflow: 200, description: 'Студия маникюра на 1 место.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 30 Shawarma (Roll)
    { displayId: 30, id: 'sd_shawarma', title: 'Шаверма', cost: 5000, cashflow: 200, description: 'Откройте бизнес по продаже шаурмы.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 31 Coffee
    { displayId: 31, id: 'sd_coffee', title: 'Кофейня', cost: 3000, cashflow: 100, description: 'Небольшая кофейня.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 32 Sushi (Roll)
    { displayId: 32, id: 'sd_sushi', title: 'Суши/Ролы', cost: 5000, cashflow: 200, description: 'Откройте бизнес по продаже суши и роллов.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 33 Auto
    { displayId: 33, id: 'sd_auto', title: 'Партнёрство в автомастерской', cost: 7000, cashflow: 350, description: 'Доля в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 34 Vet
    { displayId: 34, id: 'sd_vet', title: 'Ветеринарный центр', cost: 15000, cashflow: 700, description: 'Доля в бизнесе.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 35-36 Land
    { displayId: 35, id: 'sd_land_20', title: 'Участок земли 20га', cost: 20000, cashflow: 0, description: 'Земля без дохода.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 36, id: 'sd_land_25', title: 'Участок земли 20га', cost: 25000, cashflow: 0, description: 'Земля без дохода.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },

    // 37 Drone
    { displayId: 37, id: 'sd_drone', title: 'Покупка дрона', cost: 2000, cashflow: 50, description: 'Дрон для съёмок.', assetType: 'OTHER', type: 'DEAL_SMALL' },

    // 38-42 Flipping
    { displayId: 38, id: 'sd_flip_1', title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 39, id: 'sd_flip_2', title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 40, id: 'sd_flip_3', title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 41, id: 'sd_flip_4', title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход).', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },
    { displayId: 42, id: 'sd_flip_5', title: 'Флипинг студии', cost: 5000, cashflow: 50, description: 'Покупка и быстрая перепродажа (или доход). Есть покупатель на рынке за $15,000.', assetType: 'REAL_ESTATE', type: 'DEAL_SMALL' },



    // 46-48 Plazma
    { displayId: 46, id: 'sd_plazma_1', title: 'Сетевой бизнес: Plazma Water', cost: 1000, cashflow: 500, description: 'Plazma Water. Пригласи до 3 игроков. Твой доход: $500 за каждого.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { displayId: 47, id: 'sd_plazma_2', title: 'Сетевой бизнес: Plazma Water', cost: 1000, cashflow: 500, description: 'Plazma Water. Пригласи до 3 игроков. Твой доход: $500 за каждого.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { displayId: 48, id: 'sd_plazma_3', title: 'Сетевой бизнес: Plazma Water', cost: 1000, cashflow: 500, description: 'Plazma Water. Пригласи до 3 игроков. Твой доход: $500 за каждого.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 49-51 MONEO
    { displayId: 49, id: 'sd_moneo_100', title: 'Сетевой бизнес: MONEO', cost: 1000, cashflow: 500, description: 'MONEO Network. Пригласи до 3 игроков. Твой доход: $500 за каждого.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { displayId: 50, id: 'sd_moneo_1000', title: 'Сетевой бизнес: MONEO', cost: 1000, cashflow: 500, description: 'MONEO Network. Пригласи до 3 игроков. Твой доход: $500 за каждого.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
    { displayId: 51, id: 'sd_moneo_10000', title: 'Сетевой бизнес: MONEO', cost: 1000, cashflow: 500, description: 'MONEO Network. Пригласи до 3 игроков. Твой доход: $500 за каждого.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 52-54 Friend
    { displayId: 52, id: 'sd_friend_l1', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Друг прогорел. Деньги потеряны.', type: 'DEAL_SMALL', mandatory: true },
    { displayId: 53, id: 'sd_friend_w1', title: 'Друг просит в займ', cost: 5000, cashflow: 500, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Успех! Доля в бизнесе.', type: 'DEAL_SMALL', assetType: 'BUSINESS' },
    { displayId: 54, id: 'sd_friend_l2', title: 'Друг просит в займ', cost: 5000, cashflow: 0, description: 'Ваш друг просит $5,000 на "верное дело". Помочь?', outcomeDescription: 'Друг прогорел. Деньги потеряны.', type: 'DEAL_SMALL', mandatory: true },

    // 55 Insurance
    { displayId: 55, id: 'sd_insurance', title: 'Страховка', cost: 1000, cashflow: 0, description: 'Международная страховая компания в случае серьезной болезни или аварии возьмет на себя все расходы.', type: 'DEAL_SMALL', assetType: 'OTHER' },

    // 56 Small Biz
    { displayId: 56, id: 'sd_guide', title: 'Малый бизнес', cost: 0, cashflow: 100, description: 'Вы отлично знаете живописные места, вы составили маршрут и провели по нему туристов.', type: 'DEAL_SMALL', assetType: 'BUSINESS' },

    // 57 Health (Roll)
    { displayId: 57, id: 'sd_health', title: 'Оздоровительный центр', cost: 5000, cashflow: 300, description: 'Откройте франшизу оздоровительного Центра.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 58 Boutique
    { displayId: 58, id: 'sd_boutique', title: 'Бутик одежды', cost: 10000, cashflow: 800, description: 'Откройте франшизу бутика дизайнерской одежды.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },

    // 59 Laser
    { displayId: 59, id: 'sd_laser', title: 'Франшиза Лазерной эпиляции', cost: 15000, cashflow: 2000, description: 'Откройте франшизу сети студий лазерной эпиляции, уже больше 50 филиалов в СНГ.', assetType: 'BUSINESS', type: 'DEAL_SMALL' },
];

export const BIG_DEALS: Card[] = [
    // Real Estate
    { displayId: 1, id: 'bd_house_ex', title: 'Дом (3Br/2Ba)', description: 'Дом под сдачу. Цена $7000-10000. Доход $200.', cost: 7000, cashflow: 200, type: 'DEAL_BIG' },
    ...expand(3, { title: 'Дом 3Br/2Ba (Дуплекс)', cost: 14000, cashflow: 400, description: 'Дуплекс в хорошем районе.', downPayment: 10000, assetType: 'REAL_ESTATE' }, 'DEAL_BIG', 2),
    ...expand(4, { title: '4-квартирный дом', cost: 35000, cashflow: 1200, description: 'Многоквартирный дом. Стабильные жильцы.', downPayment: 30000, assetType: 'REAL_ESTATE' }, 'DEAL_BIG', 5),
    ...expand(4, { title: '8-квартирный комплекс', cost: 90000, cashflow: 2800, description: 'Жилой комплекс с управляющим.', downPayment: 70000, assetType: 'REAL_ESTATE' }, 'DEAL_BIG', 9),
    { displayId: 13, id: 'bd_8plex_3', title: 'ЖК "Заря"', cost: 100000, downPayment: 75000, cashflow: 3000, description: 'Эконом класс.', assetType: 'REAL_ESTATE', type: 'DEAL_BIG' },

    // Hospitality
    ...expand(4, { title: 'Мини-отель', cost: 100000, cashflow: 3000, description: 'Бутик-отель на 10 номеров, стабильно приносит доход.', downPayment: 75000, businessType: 'CLASSIC', assetType: 'REAL_ESTATE' }, 'DEAL_BIG', 14),

    // Franchise
    ...expand(2, { title: 'Франшиза MONEO', cost: 30000, cashflow: 3000, description: 'Франшиза MONEO. Партнер вносит $30к и получает доход $3к. Вы получаете $3к за каждого партнера (до 3).', downPayment: 30000, businessType: 'NETWORK', subtype: 'MLM_PLACEMENT', assetType: 'BUSINESS' }, 'DEAL_BIG', 18),

    // Classic Business
    ...expand(4, { title: 'Сеть кафе быстрого питания', cost: 240000, cashflow: 7000, description: 'Прибыльный бизнес, несколько точек в центре города.', downPayment: 150000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG', 19),
    ...expand(3, { title: 'Ферма органических овощей', cost: 150000, cashflow: 4500, description: 'Экологичное хозяйство с контрактами на поставку.', downPayment: 100000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG', 23),
    ...expand(3, { title: 'Сеть автомоек', cost: 175000, cashflow: 5000, description: 'Хорошее расположение, стабильный трафик клиентов.', downPayment: 125000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG', 26),
    ...expand(3, { title: 'Коворкинг-центр', cost: 280000, cashflow: 8000, description: 'Большое пространство для аренды под стартапы и фрилансеров.', downPayment: 200000, businessType: 'CLASSIC', assetType: 'BUSINESS' }, 'DEAL_BIG', 29),

    // Network
    ...expand(2, { title: 'Франшиза: Plazma Water', cost: 30000, cashflow: 1000, description: 'Франшиза Plazma Water. Стабильный доход. Пригласи до 3 игроков.', businessType: 'NETWORK', subtype: 'MLM_PLACEMENT' }, 'DEAL_BIG', 32),
];

export const MARKET_CARDS: Card[] = [
    // --- STOCK MARKET EVENTS ---

    // --- REAL ESTATE & BUSINESS BUYERS (MULTIPLIERS 1.5x - 5x) ---

    // 3Br/2Ba House (Cost $8,500)
    { displayId: 1, title: 'Покупатель дома', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 13000, description: 'Семья ищет дом. Предлагают $13,000.', type: 'MARKET', id: 'mkt_house_1.5' },
    { displayId: 2, title: 'Инвестор в недвижимость', targetTitle: 'Дом (3Br/2Ba)', offerPrice: 25500, description: 'Инвестор скупает районы. $25,500.', type: 'MARKET', id: 'mkt_house_3' },

    // Mini-Hotel (Cost $80,000)
    { displayId: 3, title: 'Отельная сеть (M)', targetTitle: 'Мини-отель', offerPrice: 120000, description: 'Сеть расширяется. Предлагают $120,000.', type: 'MARKET', id: 'mkt_hotel_1.5' },
    { displayId: 4, title: 'Крупный игрок', targetTitle: 'Мини-отель', offerPrice: 240000, description: 'Фонд хочет ваш отель. $240,000.', type: 'MARKET', id: 'mkt_hotel_3' },
    { displayId: 5, title: 'Монополист', targetTitle: 'Мини-отель', offerPrice: 400000, description: 'Предложение, от которого нельзя отказаться. $400,000!', type: 'MARKET', id: 'mkt_hotel_5' },

    // Fast Food (Cost $200,000)
    { displayId: 6, title: 'Конкурент (FastFood)', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 300000, description: 'Конкурент выкупает точки. $300,000.', type: 'MARKET', id: 'mkt_ff_1.5' },
    { displayId: 7, title: 'Мировой бренд', targetTitle: 'Сеть кафе быстрого питания', offerPrice: 1000000, description: 'Глобальная корпорация поглощает вас. $1,000,000!', type: 'MARKET', id: 'mkt_ff_5' },

    // Organic Farm (Cost $120,000)
    { displayId: 8, title: 'Эко-ритейлер', targetTitle: 'Ферма органических овощей', offerPrice: 240000, description: 'Сеть супермаркетов покупает производство. $240,000.', type: 'MARKET', id: 'mkt_farm_2' },
    { displayId: 9, title: 'Агрохолдинг', targetTitle: 'Ферма органических овощей', offerPrice: 600000, description: 'Крупный агрохолдинг. $600,000!', type: 'MARKET', id: 'mkt_farm_5' },

    // Car Wash (Cost $150,000)
    { displayId: 10, title: 'Франчайзинг', targetTitle: 'Сеть автомоек', offerPrice: 450000, description: 'Вас хотят сделать частью франшизы. $450,000.', type: 'MARKET', id: 'mkt_wash_3' },
    { displayId: 11, title: 'Девелопер', targetTitle: 'Сеть автомоек', offerPrice: 600000, description: 'Земля под мойками нужна под застройку. $600,000.', type: 'MARKET', id: 'mkt_wash_4' },

    // Coworking (Cost $250,000)
    { displayId: 12, title: 'IT-Стартап', targetTitle: 'Коворкинг-центр', offerPrice: 500000, description: 'Единорог покупает офис. $500,000.', type: 'MARKET', id: 'mkt_cowork_2' },
    { displayId: 13, title: 'Google', targetTitle: 'Коворкинг-центр', offerPrice: 1250000, description: 'Техногигант открывает штаб-квартиру. $1,250,000!', type: 'MARKET', id: 'mkt_cowork_5' },

    // Plazma Water (Cost $5,000)
    { displayId: 14, title: 'Выкуп франшизы', targetTitle: 'Франшиза: Plazma Water', offerPrice: 25000, description: 'Головная компания выкупает точку. $25,000.', type: 'MARKET', id: 'mkt_plazma_5' },

    // Generic / Other
    { displayId: 15, title: 'Слияние сетей', targetTitle: 'Студия маникюра', offerPrice: 25000, description: 'Выкуп сети. $25,000.', type: 'MARKET', id: 'mkt_nail_5' },
    { displayId: 16, title: 'Покупатель бизнеса', targetTitle: 'Кофейня', offerPrice: 15000, description: 'Инвестор. $15,000.', type: 'MARKET', id: 'mkt_coffee_3' },
    { displayId: 17, title: 'Застройщик', targetTitle: 'Участок земли 20га', offerPrice: 150000, description: 'Цена земли взлетела до $150,000.', type: 'MARKET', id: 'mkt_land_high' },
    { displayId: 18, title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 3000, description: 'Покупатель квартиры студии (субаренда) за $3,000.', type: 'MARKET', id: 'mkt_6' },
    { displayId: 19, title: 'Покупатель студии', targetTitle: 'Флипинг студии', offerPrice: 15000, description: 'Покупатель готовой студии. $15,000.', type: 'MARKET', id: 'mkt_flip_15k' },
    { displayId: 20, title: 'Выкуп доли', targetTitle: 'Партнёрство в автомастерской', offerPrice: 20000, description: 'Есть покупатель на партнерство за $20,000.', type: 'MARKET', id: 'mkt_4' },
    { displayId: 21, title: 'Покупатель жилья', targetTitle: 'Комната в пригороде', offerPrice: 25000, description: 'Старое жилье идет под снос. Предлагают $25,000 за комнату.', type: 'MARKET', id: 'mkt_1' },

    // BITCOIN SCAM
    { displayId: 22, title: 'Скам на криптобирже', targetTitle: 'Bitcoin', offerPrice: 0, description: '🔥 Биржа рухнула! ВСЕ BTC СГОРАЮТ! (Цена $0)', type: 'MARKET', id: 'mkt_btc_scam' },
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
            small: { remaining: this.smallDeals.length, discarded: this.smallDealsDiscard.length, total: this.smallDeals.length + this.smallDealsDiscard.length },
            big: { remaining: this.bigDeals.length, discarded: this.bigDealsDiscard.length, total: this.bigDeals.length + this.bigDealsDiscard.length },
            market: { remaining: this.marketDeck.length, discarded: this.marketDeckDiscard.length, total: this.marketDeck.length + this.marketDeckDiscard.length },
            expense: { remaining: this.expenseDeck.length, discarded: this.expenseDeckDiscard.length, total: this.expenseDeck.length + this.expenseDeckDiscard.length }
        };
    }
    setNextCard(type: string, cardId: string) {
        let deck: Card[] | undefined;
        let discardDeck: Card[] | undefined;

        if (type === 'SMALL') { deck = this.smallDeals; discardDeck = this.smallDealsDiscard; }
        else if (type === 'BIG') { deck = this.bigDeals; discardDeck = this.bigDealsDiscard; }
        else if (type === 'MARKET') { deck = this.marketDeck; discardDeck = this.marketDeckDiscard; }
        else if (type === 'EXPENSE') { deck = this.expenseDeck; discardDeck = this.expenseDeckDiscard; }

        if (!deck || !discardDeck) return false;

        // Find in deck
        let idx = deck.findIndex(c => c.id === cardId);
        let card: Card | undefined;

        if (idx !== -1) {
            card = deck.splice(idx, 1)[0];
        } else {
            // Find in discard
            idx = discardDeck.findIndex(c => c.id === cardId);
            if (idx !== -1) {
                card = discardDeck.splice(idx, 1)[0];
            }
        }

        if (card) {
            deck.unshift(card);
            console.log(`[CardManager] Set next card: ${card.title} (${card.id})`);
            return true;
        }
        return false;
    }
}
