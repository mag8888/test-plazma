'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { WebApp as WebAppType } from '@twa-dev/types';

declare global {
    interface Window {
        Telegram: {
            WebApp: WebAppType;
        };
    }
}

interface TelegramContextType {
    webApp: WebAppType | null;
    user: any;
    isReady: boolean;
}

const TelegramContext = createContext<TelegramContextType>({
    webApp: null,
    user: null,
    isReady: false,
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
    const [webApp, setWebApp] = useState<WebAppType | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const app = (window as any).Telegram?.WebApp;
        if (app) {
            app.ready();
            app.expand();
            setWebApp(app);
            setIsReady(true);
            setUser(app.initDataUnsafe?.user);

            // Set Theme
            document.documentElement.style.setProperty('--tg-theme-bg-color', app.backgroundColor);
            document.documentElement.style.setProperty('--tg-theme-text-color', app.textColor);
        }
    }, []);

    return (
        <TelegramContext.Provider value={{ webApp, user, isReady }}>
            <Script
                src="https://telegram.org/js/telegram-web-app.js"
                strategy="beforeInteractive"
            />
            {children}
        </TelegramContext.Provider>
    );
};
