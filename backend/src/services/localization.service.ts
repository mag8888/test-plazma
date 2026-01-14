
import fs from 'fs';
import path from 'path';

const LOCALE_HEADER = 'Context,ID,RU (Original),EN,TR,AR';

type CsvRow = {
    context: string;
    id: string;
    ru: string;
    en: string;
    tr: string;
    ar: string;
};

export class LocalizationService {
    private backendLocalesPath = path.join(__dirname, '../locales');
    private frontendLocalesPath = path.join(__dirname, '../../frontend/messages');
    private cardManagerPath = path.join(__dirname, '../game/card.manager.ts');

    constructor() { }

    // --- EXPORT ---

    async exportToCsv(): Promise<string> {
        const rows: string[] = [LOCALE_HEADER];

        // 1. Export Backend JSONs
        this.appendJsonToRows(this.backendLocalesPath, 'Backend', rows);

        // 2. Export Frontend JSONs
        this.appendJsonToRows(this.frontendLocalesPath, 'Frontend', rows);

        // 3. Export Cards (Regex extraction)
        this.appendCardsToRows(rows);

        return rows.join('\n');
    }

    private appendJsonToRows(dirPath: string, contextPrefix: string, rows: string[]) {
        if (!fs.existsSync(dirPath)) return;

        const ru = this.readJson(path.join(dirPath, 'ru.json'));
        const en = this.readJson(path.join(dirPath, 'en.json'));
        const tr = this.readJson(path.join(dirPath, 'tr.json'));
        const ar = this.readJson(path.join(dirPath, 'ar.json'));

        const keys = this.getAllKeys(ru); // Assume RU is source of truth for keys

        keys.forEach(key => {
            const valRu = this.getValue(ru, key) || '';
            const valEn = this.getValue(en, key) || '';
            const valTr = this.getValue(tr, key) || '';
            const valAr = this.getValue(ar, key) || '';

            rows.push(`${contextPrefix},${key},${this.escapeCsv(valRu)},${this.escapeCsv(valEn)},${this.escapeCsv(valTr)},${this.escapeCsv(valAr)}`);
        });
    }

    private appendCardsToRows(rows: string[]) {
        if (!fs.existsSync(this.cardManagerPath)) return;
        const content = fs.readFileSync(this.cardManagerPath, 'utf-8');

        // Regex: id: 'X', ... title: 'Y', ... description: 'Z'
        // We need to capture ID, Title, Description
        // Note: This is fragile if code formatting changes significantly.
        const regex = /\{[^}]*id:\s*'([^']*)'[^}]*title:\s*'([^']*)'[^}]*description:\s*'([^']*)'/g;

        // We only have the "Russian" version in the code currently. 
        // So EN/TR/AR will be empty or we treat the code as "RU".

        let match;
        while ((match = regex.exec(content)) !== null) {
            const [_, id, title, desc] = match;
            rows.push(`Card Title,${id}_TITLE,${this.escapeCsv(title)},,,`);
            rows.push(`Card Desc,${id}_DESC,${this.escapeCsv(desc)},,,`);
        }
    }

    // --- IMPORT ---

    async importFromCsv(csvContent: string): Promise<string[]> {
        const lines = csvContent.split('\n');
        const logs: string[] = [];

        // Data buffers
        const backendData: any = { ru: {}, en: {}, tr: {}, ar: {} };
        const frontendData: any = { ru: {}, en: {}, tr: {}, ar: {} };
        const cardUpdates: Map<string, { title?: string, desc?: string }> = new Map();

        // Basic parsing
        let headerParsed = false;

        for (const line of lines) {
            if (!line.trim()) continue;
            if (!headerParsed) {
                if (line.startsWith('Context')) {
                    headerParsed = true;
                    continue;
                }
            }

            // Simple CSV split (handling quotes is tricky, using a basic regex or split for now)
            // For robustness, a proper CSV parser library is better, but avoiding deps for now:
            const cols = this.parseCsvLine(line);
            if (cols.length < 6) continue;

            const [context, id, ru, en, tr, ar] = cols;

            if (context === 'Backend') {
                this.setValue(backendData.ru, id, ru);
                this.setValue(backendData.en, id, en);
                this.setValue(backendData.tr, id, tr);
                this.setValue(backendData.ar, id, ar);
            } else if (context === 'Frontend') {
                this.setValue(frontendData.ru, id, ru);
                this.setValue(frontendData.en, id, en);
                this.setValue(frontendData.tr, id, tr);
                this.setValue(frontendData.ar, id, ar);
            } else if (context.startsWith('Card')) {
                // Determine ID and Type
                const realId = id.replace(/_TITLE$/, '').replace(/_DESC$/, '');
                if (!cardUpdates.has(realId)) cardUpdates.set(realId, {});

                // We ONLY update the code (which is effectively RU/Default for now).
                // Multi-language cards require a database-driven approach, not hardcoded strings.
                // Assuming user wants to edit the SOURCE code strings (Russian default).
                const update = cardUpdates.get(realId)!;
                if (id.endsWith('_TITLE')) update.title = ru;
                if (id.endsWith('_DESC')) update.desc = ru;
            }
        }

        // Apply saves
        this.saveJson(this.backendLocalesPath, backendData);
        logs.push('Backend locales updated.');

        this.saveJson(this.frontendLocalesPath, frontendData);
        logs.push('Frontend locales updated.');

        // Apply Card Updates
        if (cardUpdates.size > 0) {
            this.applyCardUpdates(cardUpdates);
            logs.push(`Updated ${cardUpdates.size} cards in source code.`);
        }

        return logs;
    }

    private applyCardUpdates(updates: Map<string, { title?: string, desc?: string }>) {
        if (!fs.existsSync(this.cardManagerPath)) return;
        let content = fs.readFileSync(this.cardManagerPath, 'utf-8');

        updates.forEach((val, id) => {
            if (val.title) {
                // Safe replacement: look for id: 'ID' ... title: '...'
                // We use a specific regex ensuring we match the specific ID's block
                // This is tricky with regex global modify. 
                // Strategy: Find the exact block for this ID.

                // Regex to find the block for a specific ID
                // capture group 1: pre-title
                // capture group 2: title content
                // capture group 3: post-title
                const titleRegex = new RegExp(`(id:\\s*'${id}'[^}]*title:\\s*')([^']*)(')`, 'g');
                content = content.replace(titleRegex, `$1${val.title}$3`);
            }
            if (val.desc) {
                const descRegex = new RegExp(`(id:\\s*'${id}'[^}]*description:\\s*')([^']*)(')`, 'g');
                content = content.replace(descRegex, `$1${val.desc}$3`);
            }
        });

        fs.writeFileSync(this.cardManagerPath, content);
    }

    // --- HELPERS ---

    private readJson(p: string) {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
        return {};
    }

    private saveJson(dir: string, dataMap: any) {
        ['ru', 'en', 'tr', 'ar'].forEach(lang => {
            const p = path.join(dir, `${lang}.json`);
            // Merge with existing to avoid data loss? Or overwrite? 
            // Overwrite is safer for "Sync" logic if CSV is complete. 
            // But CSV might be partial. Let's merge if possible, but deep merge is complex.
            // For now: Overwrite with what we have, assuming CSV was fully exported first.
            // BETTER: Load existing, merge updates, save.

            const existing = this.readJson(p);
            const merged = this.deepMerge(existing, dataMap[lang]);
            fs.writeFileSync(p, JSON.stringify(merged, null, 4));
        });
    }

    private deepMerge(target: any, source: any) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], this.deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    private getAllKeys(obj: any, prefix = ''): string[] {
        let keys: string[] = [];
        for (const k in obj) {
            const newKey = prefix ? `${prefix}.${k}` : k;
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                keys = keys.concat(this.getAllKeys(obj[k], newKey));
            } else {
                keys.push(newKey);
            }
        }
        return keys;
    }

    private getValue(obj: any, key: string) {
        return key.split('.').reduce((o, i) => o?.[i], obj);
    }

    private setValue(obj: any, key: string, val: string) {
        if (!val) return;
        const keys = key.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = val;
    }

    private escapeCsv(str: string): string {
        if (!str) return '';
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    private parseCsvLine(line: string): string[] {
        // Basic parser handling quotes
        const res: string[] = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (inQuote) {
                if (c === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuote = false;
                    }
                } else {
                    cur += c;
                }
            } else {
                if (c === '"') {
                    inQuote = true;
                } else if (c === ',') {
                    res.push(cur);
                    cur = '';
                } else {
                    cur += c;
                }
            }
        }
        res.push(cur);
        return res;
    }
}
