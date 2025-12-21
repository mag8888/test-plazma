'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { WebApp as WebAppType } from '@twa-dev/types';
import { getBackendUrl } from '../lib/config';
import { socket } from '../app/socket';

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

    // Reconnection Logic for Mobile Stability
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("📱 App visible, checking socket connection...");
                if (!socket.connected) {
                    console.log("🔌 Socket disconnected, forcing reconnect...");
                    socket.connect();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        // Separate Auth Logic from Telegram App Logic to support Browser Links
        const initAndLogin = async () => {
            let app: WebAppType | null = null;
            if ((window as any).Telegram?.WebApp) {
                app = (window as any).Telegram.WebApp;
                app?.ready();
                app?.expand();
                setWebApp(app);

                // UI Setup
                document.documentElement.style.setProperty('--tg-theme-bg-color', app?.backgroundColor || '#0f172a');
                document.documentElement.style.setProperty('--tg-theme-text-color', (app as any)?.textColor || '#ffffff');
            }

            const BACKEND_URL = getBackendUrl();
            try {
                const initData = app?.initData;
                // Check for Auth Code (Direct Link)
                const urlParams = new URLSearchParams(window.location.search);
                const authCode = urlParams.get('auth');

                // Check LocalStorage for cached Auth Code
                const cachedAuthCode = localStorage.getItem('moneo_auth_code');

                if (initData) {
                    // Priority 1: Telegram Web App Init Data
                    console.log("🔑 Login via Telegram InitData");
                    const res = await fetch(`${BACKEND_URL}/api/auth/login/telegram`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                    } else {
                        console.error("Telegram Auth failed", res.status);
                        setUser(app?.initDataUnsafe?.user || { id: 123456789, first_name: 'Guest (Auth Failed)', username: 'guest_fallback', balanceRed: 1000, referralBalance: 50 });
                    }
                } else if (authCode || cachedAuthCode) {
                    // Priority 2: Magic Link Auth Code (URL or Cached)
                    const codeToUse = authCode || cachedAuthCode;
                    console.log("🔑 Attempting Magic Login with code:", codeToUse, authCode ? '(URL)' : '(Cached)');

                    const res = await fetch(`${BACKEND_URL}/api/auth/magic-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: codeToUse })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);

                        // Save valid code to cache if it came from URL
                        if (authCode) {
                            localStorage.setItem('moneo_auth_code', authCode);
                            // Optional: Clean URL
                            window.history.replaceState({}, '', window.location.pathname);
                        }
                    } else {
                        console.error("Magic Login failed");
                        // If cached code failed, clear it
                        if (cachedAuthCode && !authCode) {
                            console.warn("Cached auth code invalid, clearing.");
                            localStorage.removeItem('moneo_auth_code');
                        }
                        // Fallback for failed magic login
                        setUser({ id: 123456789, first_name: 'Guest (Bad Link)', username: 'guest_link', balanceRed: 1000, referralBalance: 50 });
                    }
                } else {
                    // No Auth - Check if inside Telegram but no initData (weird) OR standard browser
                    console.warn("No initData or Auth Code. Treating as Guest/Dev.");
                    if (app?.initDataUnsafe?.user) {
                        setUser(app.initDataUnsafe.user);
                    } else {
                        // Fallback dev/guest
                        setUser({ id: 123456789, first_name: 'Dev Guest', username: 'dev_guest', balanceRed: 1000, referralBalance: 50 });
                    }
                }

            } catch (e) {
                console.error("Login failed", e);
                setUser({ id: 999999, first_name: 'Guest (Error)', username: 'guest_err', balanceRed: 1000, referralBalance: 50 });
            } finally {
                setIsReady(true);
            }
        };

        // Give a small delay for script to load if needed, but usually 'beforeInteractive' manages it.
        // We can just run it.
        initAndLogin();
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
