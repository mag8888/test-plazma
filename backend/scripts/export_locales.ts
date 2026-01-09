
// import { RAT_RACE_SQUARES, FAST_TRACK_SQUARES } from '../src/game/engine'; 
// Use local definitions below.
// However, since I can read the files, I might just parse them or try to import.
// Given this is a one-off script, copying the arrays is safer to avoid TS/Dependency hell.

// I will paste the data structures derived from my previous read_file outputs to ensure it runs standalone.

const RAT_RACE_SQUARES = [
    { index: 0, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 1, type: 'EXPENSE', name: 'Doodad', description: 'Трата: Ненужные расходы.' },
    { index: 2, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 3, type: 'CHARITY', name: 'Charity', description: 'Благотворительность: Пожертвуйте 10% дохода для ускорения.' },
    { index: 4, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 5, type: 'PAYDAY', name: 'Payday', description: 'Деньги: Получите ваш месячный денежный поток.' },
    { index: 6, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 7, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' },
    { index: 8, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 9, type: 'EXPENSE', name: 'Doodad', description: 'Трата: Ненужные расходы.' },
    { index: 10, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 11, type: 'BABY', name: 'Baby', description: 'Ребенок: Новые расходы и радость в семье.' },
    { index: 12, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 13, type: 'PAYDAY', name: 'Payday', description: 'Деньги: Получите ваш месячный денежный поток.' },
    { index: 14, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 15, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' },
    { index: 16, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 17, type: 'EXPENSE', name: 'Doodad', description: 'Трата: Ненужные расходы.' },
    { index: 18, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 19, type: 'DOWNSIZED', name: 'Sick', description: 'Заболел: Пропуск 2 ходов и оплата расходов.' },
    { index: 20, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 21, type: 'PAYDAY', name: 'Payday', description: 'Деньги: Получите ваш месячный денежный поток.' },
    { index: 22, type: 'DEAL', name: 'Opportunity', description: 'Возможность: Малая или Крупная сделка.' },
    { index: 23, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' },
];

const FAST_TRACK_SQUARES = [
    { index: 24, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    { index: 25, type: 'DREAM', name: 'Дом мечты', description: 'Построить дом мечты для семьи' },
    { index: 26, type: 'BUSINESS', name: 'Кофейня', description: 'Кофейня в центре города' },
    { index: 27, type: 'LOSS', name: 'Аудит', description: 'Налоговая проверка. Вы теряете 50% наличных.' },
    { index: 28, type: 'BUSINESS', name: 'Центр здоровья и спа', description: 'Элитный спа-комплекс.' },
    { index: 29, type: 'DREAM', name: 'Посетить Антарктиду', description: 'Экспедиция к Южному полюсу.' },
    { index: 30, type: 'BUSINESS', name: 'Мобильное приложение', description: 'Сервис по подписке' },
    { index: 31, type: 'CHARITY', name: 'Благотворительность', description: 'Пожертвуйте 10% от общего дохода' },
    { index: 32, type: 'BUSINESS', name: 'Агентство маркетинга', description: 'Агентство цифрового маркетинга' },
    { index: 33, type: 'LOSS', name: 'Кража', description: 'Вас обокрали! Вы теряете 100% наличных.' },
    { index: 34, type: 'BUSINESS', name: 'Мини-отель', description: 'Бутик-гостиница' },
    { index: 35, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    { index: 36, type: 'BUSINESS', name: 'Ресторан', description: 'Франшиза популярного ресторана' },
    { index: 37, type: 'DREAM', name: 'Высочайшие вершины', description: 'Подняться на все высочайшие вершины мира' },
    { index: 38, type: 'BUSINESS', name: 'Мини-отель', description: 'Бутик-гостиница' },
    { index: 39, type: 'DREAM', name: 'Автор бестселлера', description: 'Стать автором книги-бестселлера' },
    { index: 40, type: 'BUSINESS', name: 'Йога-центр', description: 'Йога- и медитационный центр' },
    { index: 41, type: 'LOSS', name: 'Развод', description: 'Раздел имущества. Вы теряете 50% наличных.' },
    { index: 42, type: 'BUSINESS', name: 'Автомойки', description: 'Сеть автомоек самообслуживания' },
    { index: 43, type: 'DREAM', name: 'Яхта в Средиземном', description: 'Жить год на яхте в Средиземном море' },
    { index: 44, type: 'BUSINESS', name: 'Салон красоты', description: 'Салон красоты / Барбершоп' },
    { index: 45, type: 'DREAM', name: 'Мировой фестиваль', description: 'Организовать мировой фестиваль' },
    { index: 46, type: 'LOSS', name: 'Пожар', description: 'Вы теряете бизнес с минимальным доходом.' },
    { index: 47, type: 'BUSINESS', name: 'Онлайн-магазин', description: 'Онлайн-магазин одежды' },
    { index: 48, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    { index: 49, type: 'DREAM', name: 'Фонд талантов', description: 'Создать фонд поддержки талантов' },
    { index: 50, type: 'BUSINESS', name: 'Ретрит-центр', description: 'Построить ретрит-центр' },
    { index: 51, type: 'DREAM', name: 'Кругосветка', description: 'Кругосветное плавание на паруснике' },
    { index: 52, type: 'BUSINESS', name: 'Эко-ранчо', description: 'Туристический комплекс (эко-ранчо)' },
    { index: 53, type: 'DREAM', name: 'Кругосветка (Люкс)', description: 'Кругосветное плавание на паруснике (Premium)' },
    { index: 54, type: 'STOCK_EXCHANGE', name: 'Биржа', description: 'Бросьте кубик. Если выпадет 5 или 6, вы получите $500,000.' },
    { index: 55, type: 'DREAM', name: 'Частный самолёт', description: 'Купить частный самолёт' },
    { index: 56, type: 'BUSINESS', name: 'NFT-платформа', description: 'Платформа для торговли цифровым искусством.' },
    { index: 57, type: 'PAYDAY', name: 'CASHFLOW Day', description: 'Вам выплачивается доход от ваших инвестиций' },
    { index: 58, type: 'BUSINESS', name: 'Школа языков', description: 'Школа иностранных языков' },
    { index: 59, type: 'DREAM', name: 'Коллекция суперкаров', description: 'Гараж с редкими автомобилями.' },
    { index: 60, type: 'BUSINESS', name: 'Школа будущего', description: 'Создать школу будущего для детей' },
    { index: 61, type: 'DREAM', name: 'Снять фильм', description: 'Снять полнометражный фильм' },
    { index: 62, type: 'LOSS', name: 'Рейдерский захват', description: 'Вы теряете бизнес с самым крупным доходом.' },
    { index: 63, type: 'DREAM', name: 'Лидер мнений', description: 'Стать мировым лидером мнений' },
    { index: 64, type: 'BUSINESS', name: 'Автомойки', description: 'Сеть автомоек самообслуживания' },
    { index: 65, type: 'DREAM', name: 'Белоснежная Яхта', description: 'Роскошная яхта для путешествий.' },
    { index: 66, type: 'BUSINESS', name: 'Франшиза', description: 'Франшиза "Поток денег"' },
    { index: 67, type: 'DREAM', name: 'Полёт в космос', description: 'Туристический полет на орбиту.' },
    { index: 68, type: 'BUSINESS', name: 'Пекарня', description: 'Пекарня с доставкой' },
    { index: 69, type: 'DREAM', name: 'Благотворительный фонд', description: 'Организовать благотворительный фонд' },
    { index: 70, type: 'BUSINESS', name: 'Образовательная платформа', description: 'Онлайн-образовательная платформа' },
    { index: 71, type: 'LOTTERY', name: 'Лотерея', description: 'Выпадет любая сделка внешнего круга.' }
];

import fs from 'fs';
import path from 'path';

// Helper to escape CSV
const escapeCsv = (str: string) => {
    if (!str) return '';
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const rows: string[] = [];
rows.push('Context,ID,RU (Original),EN,ES,TR,AR');

// Squares
RAT_RACE_SQUARES.forEach(s => {
    rows.push(`Square (Rat Race),RR_SQ_${s.index}_NAME,${escapeCsv(s.name)},,,,`);
    if (s.description) rows.push(`Square (Rat Race),RR_SQ_${s.index}_DESC,${escapeCsv(s.description)},,,,`);
});

FAST_TRACK_SQUARES.forEach(s => {
    rows.push(`Square (Fast Track),FT_SQ_${s.index}_NAME,${escapeCsv(s.name)},,,,`);
    if (s.description) rows.push(`Square (Fast Track),FT_SQ_${s.index}_DESC,${escapeCsv(s.description)},,,,`);
});

// Write to file
const outputPath = path.join(__dirname, '../../localization_export.csv'); // Root dir
const cardManagerPath = path.join(__dirname, '../src/game/card.manager.ts');

const extractCards = () => {
    try {
        const content = fs.readFileSync(cardManagerPath, 'utf-8');
        // Regex to find object literals with id, title, description
        // Example: { id: 'e1', type: 'EXPENSE', title: 'Обед в ресторане', description: 'С друзьями.', ... }
        // We match coarsely.
        const regex = /\{[^}]*id:\s*'([^']*)'[^}]*title:\s*'([^']*)'[^}]*description:\s*'([^']*)'/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const [full, id, title, description] = match;
            // Additional check if type is present to categorize
            let type = 'CARD';
            if (full.includes("'EXPENSE'")) type = 'CARD_EXPENSE';
            else if (full.includes("'DEAL_SMALL'")) type = 'CARD_SMALL';
            else if (full.includes("'DEAL_BIG'")) type = 'CARD_BIG';
            else if (full.includes("'MARKET'")) type = 'CARD_MARKET';

            rows.push(`${type},${id}_TITLE,${escapeCsv(title)},,,,`);
            rows.push(`${type},${id}_DESC,${escapeCsv(description)},,,,`);

            // Checks for outcomeDescription
            const outcomeMatch = full.match(/outcomeDescription:\s*'([^']*)'/);
            if (outcomeMatch) {
                rows.push(`${type},${id}_OUTCOME,${escapeCsv(outcomeMatch[1])},,,,`);
            }
            // Checks for targetTitle (Market)
            const targetMatch = full.match(/targetTitle:\s*'([^']*)'/);
            if (targetMatch) {
                rows.push(`${type},${id}_TARGET,${escapeCsv(targetMatch[1])},,,,`);
            }
        }
        console.log('Cards extracted.');
    } catch (e) {
        console.error('Error extracting cards:', e);
    }
};

extractCards();

fs.writeFileSync(outputPath, rows.join('\n'));
console.log(`Localization exported to ${outputPath}`);
