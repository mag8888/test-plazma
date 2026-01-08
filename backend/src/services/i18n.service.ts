import fs from 'fs';
import path from 'path';

export class I18nService {
    private locales: Record<string, any> = {};
    private defaultLocale = 'ru';

    constructor() {
        this.loadLocales();
    }

    private loadLocales() {
        const localesPath = path.join(__dirname, '../locales');
        const languages = ['ru', 'en', 'tr', 'ar'];

        languages.forEach(lang => {
            try {
                const filePath = path.join(localesPath, `${lang}.json`);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    this.locales[lang] = JSON.parse(content);
                }
            } catch (e) {
                console.error(`Failed to load locale ${lang}:`, e);
            }
        });
        console.log(`[I18nService] Loaded languages: ${Object.keys(this.locales).join(', ')}`);
    }

    t(lang: string | undefined, key: string, params: Record<string, string | number> = {}): string {
        const locale = (lang && this.locales[lang]) ? lang : this.defaultLocale;
        const keys = key.split('.');

        let value = this.locales[locale];
        for (const k of keys) {
            value = value?.[k];
        }

        if (!value) {
            // Fallback to default locale
            if (locale !== this.defaultLocale) {
                return this.t(this.defaultLocale, key, params);
            }
            return key;
        }

        // Replace params: {name}
        return value.replace(/{(\w+)}/g, (_: string, k: string) => {
            return params[k] !== undefined ? String(params[k]) : `{${k}}`;
        });
    }
}
