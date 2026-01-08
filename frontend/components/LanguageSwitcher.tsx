'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

const languages = [
    { code: 'ru', label: '🇷🇺 Русский' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'tr', label: '🇹🇷 Türkçe' },
    { code: 'ar', label: '🇸🇦 العربية' },
];

export default function LanguageSwitcher() {
    const locale = useLocale();
    const t = useTranslations('Language');
    const [isOpen, setIsOpen] = useState(false);

    const changeLanguage = (lang: string) => {
        localStorage.setItem('moneo_lang', lang);
        window.location.reload(); // Simple reload to apply changes via LanguageProvider
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
            >
                <span>{languages.find(l => l.code === locale)?.label.split(' ')[0]}</span>
                <span className="uppercase">{locale}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#1A1D21] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${locale === lang.code ? 'text-[#00C853] bg-white/[0.02]' : 'text-gray-300'
                                }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
