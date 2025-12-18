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
                    // Check for Auth Code (Direct Link)
                    const urlParams = new URLSearchParams(window.location.search);
                    const authCode = urlParams.get('auth');

                    if (initData) {
                        // Priority 1: Telegram Web App Init Data
                        const res = await fetch('/api/auth/login/telegram', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ initData })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            setUser(data.user);
                        } else {
                            console.error("Telegram Auth failed");
                            setUser(app.initDataUnsafe?.user || { id: 123456789, first_name: 'Guest (Auth Failed)', username: 'guest_fallback', balanceRed: 1000, referralBalance: 50 });
                        }
                    } else if (authCode) {
                        // Priority 2: Magic Link Auth Code
                        console.log("Attempting Magic Login with code:", authCode);
                        const res = await fetch('/api/auth/magic-login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: authCode })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            setUser(data.user);
                            // Optional: Clear URL param
                        } else {
                            console.error("Magic Login failed");
                            setUser({ id: 123456789, first_name: 'Guest (Bad Link)', username: 'guest_link', balanceRed: 1000, referralBalance: 50 });
                        }
                    } else {
                        console.warn("No initData or Auth Code (Dev mode?)");
                        // Fallback for dev: usage mock
                        setUser(app.initDataUnsafe?.user || { id: 123456789, first_name: 'Dev Guest', username: 'dev_guest', balanceRed: 1000, referralBalance: 50 });
                    }

                } catch (e) {
                    console.error("Login failed", e);
                    setUser({ id: 999999, first_name: 'Guest (Error)', username: 'guest_err', balanceRed: 1000, referralBalance: 50 });
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
