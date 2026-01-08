'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useState, useEffect, ReactNode } from 'react';

// Import messages locally to include in bundle for client-side switching without server
import ruErrors from '../messages/ru.json';
import enErrors from '../messages/en.json';
import trErrors from '../messages/tr.json';
import arErrors from '../messages/ar.json';

const messagesMap: Record<string, any> = {
    ru: ruErrors,
    en: enErrors,
    tr: trErrors,
    ar: arErrors,
};

type Language = 'ru' | 'en' | 'tr' | 'ar';

export default function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Language>('ru');

    useEffect(() => {
        // 1. Try Telegram Init Data
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
            const tgLang = window.Telegram.WebApp.initDataUnsafe.user.language_code.toLowerCase();
            if (['ru', 'en', 'tr', 'ar'].includes(tgLang)) {
                setLocale(tgLang as Language);
                return;
            }
            // Special case for 'uk' (Ukrainian) or 'be' (Belarusian) -> RU if preferred, or just stick to RU/EN default logic
        }

        // 2. Try LocalStorage
        const stored = localStorage.getItem('moneo_lang');
        if (stored && ['ru', 'en', 'tr', 'ar'].includes(stored)) {
            setLocale(stored as Language);
            return;
        }

        // 3. Try Browser
        const browserLang = navigator.language.split('-')[0];
        if (['ru', 'en', 'tr', 'ar'].includes(browserLang)) {
            setLocale(browserLang as Language);
        }
    }, []);

    return (
        <NextIntlClientProvider locale={locale} messages={messagesMap[locale]} timeZone="Europe/Moscow">
            {children}
        </NextIntlClientProvider>
    );
}
