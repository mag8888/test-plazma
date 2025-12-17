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
            setIsReady(false); // Wait for auth

            // 1. Initial UI Setup
            document.documentElement.style.setProperty('--tg-theme-bg-color', app.backgroundColor);
            document.documentElement.style.setProperty('--tg-theme-text-color', app.textColor);

            // 2. Authenticate & Fetch User Data
            const login = async () => {
                try {
                    const initData = app.initData;
                    if (!initData) {
                        console.warn("No initData available (Dev mode?)");
                        // Fallback for dev: usage mock
                        setUser(app.initDataUnsafe?.user || { first_name: 'Dev Guest', balanceRed: 1000, referralBalance: 50 });
                        setIsReady(true);
                        return;
                    }

                    const res = await fetch('/api/auth/login/telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                    } else {
                        console.error("Auth failed");
                        setUser(app.initDataUnsafe?.user);
                    }
                } catch (e) {
                    console.error("Login failed", e);
                } finally {
                    setIsReady(true);
                }
            };

            login();
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
