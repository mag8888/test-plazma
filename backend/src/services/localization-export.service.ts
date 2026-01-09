
import fs from 'fs';
import path from 'path';

// Copied Constants to avoid heavy imports
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
    { index: 23, type: 'MARKET', name: 'Market', description: 'Рынок: Возможность продать активы.' }
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

export class LocalizationExportService {

    private escapeCsv(str: string) {
        if (!str) return '';
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    private walkSync(dir: string, filelist: string[] = []) {
        // Check if dir exists first
        if (!fs.existsSync(dir)) return filelist;

        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filepath = path.join(dir, file);
            if (fs.statSync(filepath).isDirectory()) {
                filelist = this.walkSync(filepath, filelist);
            } else {
                if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                    filelist.push(filepath);
                }
            }
        });
        return filelist;
    }

    public generateCsv(): string {
        const rows: string[] = [];
        rows.push('Context,ID,RU (Original),EN,ES,TR,AR');

        // 1. Squares
        RAT_RACE_SQUARES.forEach(s => {
            rows.push(`Square (Rat Race),RR_SQ_${s.index}_NAME,${this.escapeCsv(s.name)},,,,`);
            if (s.description) rows.push(`Square (Rat Race),RR_SQ_${s.index}_DESC,${this.escapeCsv(s.description)},,,,`);
        });

        FAST_TRACK_SQUARES.forEach(s => {
            rows.push(`Square (Fast Track),FT_SQ_${s.index}_NAME,${this.escapeCsv(s.name)},,,,`);
            if (s.description) rows.push(`Square (Fast Track),FT_SQ_${s.index}_DESC,${this.escapeCsv(s.description)},,,,`);
        });

        // 2. Cards (Regex Extraction)
        try {
            const cardManagerPath = path.join(__dirname, '../game/card.manager.ts');
            if (fs.existsSync(cardManagerPath)) {
                const content = fs.readFileSync(cardManagerPath, 'utf-8');
                const regex = /\{[^}]*id:\s*'([^']*)'[^}]*title:\s*'([^']*)'[^}]*description:\s*'([^']*)'/g;
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const [full, id, title, description] = match;
                    let type = 'CARD';
                    if (full.includes("'EXPENSE'")) type = 'CARD_EXPENSE';
                    else if (full.includes("'DEAL_SMALL'")) type = 'CARD_SMALL';
                    else if (full.includes("'DEAL_BIG'")) type = 'CARD_BIG';
                    else if (full.includes("'MARKET'")) type = 'CARD_MARKET';

                    rows.push(`${type},${id}_TITLE,${this.escapeCsv(title)},,,,`);
                    rows.push(`${type},${id}_DESC,${this.escapeCsv(description)},,,,`);

                    const outcomeMatch = full.match(/outcomeDescription:\s*'([^']*)'/);
                    if (outcomeMatch) {
                        rows.push(`${type},${id}_OUTCOME,${this.escapeCsv(outcomeMatch[1])},,,,`);
                    }
                    const targetMatch = full.match(/targetTitle:\s*'([^']*)'/);
                    if (targetMatch) {
                        rows.push(`${type},${id}_TARGET,${this.escapeCsv(targetMatch[1])},,,,`);
                    }
                }
            }
        } catch (e) {
            console.error('Error extracting cards:', e);
        }

        // 3. Dreams (New)
        const { DREAMS_LIST } = require('../game/constants/dreams');
        if (DREAMS_LIST) {
            DREAMS_LIST.forEach((dream: any) => {
                rows.push(`Dream,DREAM_NAME_${this.escapeCsv(dream.name)},${this.escapeCsv(dream.name)},,,,`);
                if (dream.description) {
                    rows.push(`Dream,DREAM_DESC_${this.escapeCsv(dream.name)},${this.escapeCsv(dream.description)},,,,`);
                }
            });
        }

        // 3. Frontend Strings (Regex Extraction)
        try {
            const frontendDir = path.join(__dirname, '../../../frontend/app');
            const files = this.walkSync(frontendDir);
            const strings = new Set<string>();

            const jsxRegex = />([^<]*[А-Яа-яЁё][^<]*)<\//g;
            const stringRegex = /['"`]([^'"`]*[А-Яа-яЁё][^'"`]*)['"`]/g;

            files.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                const relativePath = path.relative(frontendDir, file);

                let match;
                while ((match = jsxRegex.exec(content)) !== null) {
                    const raw = match[1].trim();
                    if (raw && !strings.has(raw)) {
                        strings.add(raw);
                        rows.push(`Frontend Label,${relativePath},${this.escapeCsv(raw)},,,,`);
                    }
                }

                while ((match = stringRegex.exec(content)) !== null) {
                    const raw = match[1].trim();
                    if (raw && !strings.has(raw) && !raw.includes('/') && raw.length < 200) {
                        strings.add(raw);
                        rows.push(`Frontend Label,${relativePath},${this.escapeCsv(raw)},,,,`);
                    }
                }
            });
        } catch (e) {
            console.error('Error extracting frontend strings:', e);
        }

        // Return CSV content
        return rows.join('\n');
    }
}
