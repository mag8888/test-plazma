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
                // Check if disconnected AND not currently trying to connect (active)
                if (!socket.connected && !(socket as any).active) {
                    console.log("🔌 Socket disconnected/inactive, forcing reconnect...");
                    socket.connect();
                } else {
                    console.log(`socket status: connected=${socket.connected}, active=${(socket as any).active}`);
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

                // Priority 1: Magic Link Auth Code from URL (highest for fresh login)
                // This bypasses logout state - magic link always works
                if (authCode) {
                    console.log("🔑 Magic Login from URL with code:", authCode);

                    // Clear logout flag when using magic link
                    localStorage.removeItem('moneo_is_logged_out');

                    const res = await fetch(`${BACKEND_URL}/api/auth/magic-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: authCode })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);

                        // Save to localStorage for persistence
                        localStorage.setItem('moneo_user_auth', JSON.stringify({
                            user: data.user,
                            token: data.token || authCode
                        }));

                        // Save code to cache
                        localStorage.setItem('moneo_auth_code', authCode);

                        // Clean URL
                        window.history.replaceState({}, '', window.location.pathname);
                        setIsReady(true);
                        return;
                    } else {
                        console.error("Magic Login from URL failed");
                        // Continue to other auth methods
                    }
                }

                // Check for explicit logout (only if NO auth param)
                const isLoggedOut = localStorage.getItem('moneo_is_logged_out');
                if (isLoggedOut) {
                    console.log("⛔ User explicitly logged out, ignoring all auth");
                    setIsReady(true);
                    return;
                }

                // Priority 2: Stored Authentication (for persistence)
                const storedUserAuth = localStorage.getItem('moneo_user_auth');
                if (storedUserAuth) {
                    console.log("✅ Restoring session from localStorage");
                    try {
                        const parsed = JSON.parse(storedUserAuth);
                        let currentUser = parsed.user;

                        // AUTO-REPAIR: If user is missing telegram_id, try to fetch fresh data
                        if (parsed.token && (!currentUser.telegram_id || !currentUser.referralsCount)) {
                            console.log("🛠️ Session stale (missing telegram_id), attempting auto-repair...");
                            try {
                                const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
                                    headers: { 'Authorization': `Bearer ${parsed.token}` }
                                });
                                if (meRes.ok) {
                                    const meData = await meRes.json();
                                    currentUser = meData.user;
                                    console.log("✅ Session auto-repaired!", currentUser);

                                    // Update storage with fresh data
                                    localStorage.setItem('moneo_user_auth', JSON.stringify({
                                        user: currentUser,
                                        token: parsed.token
                                    }));
                                } else {
                                    console.warn("⚠️ Auto-repair failed", meRes.status);
                                }
                            } catch (err) {
                                console.error("❌ Auto-repair network error", err);
                            }
                        }

                        setUser(currentUser);
                        setIsReady(true);
                        return;
                    } catch (e) {
                        console.error("Invalid stored auth", e);
                        localStorage.removeItem('moneo_user_auth');
                    }
                }

                // Priority 3: Telegram InitData (Telegram Web App)
                if (app?.initData) {
                    console.log("🔑 Login via Telegram InitData");
                    const res = await fetch(`${BACKEND_URL}/api/auth/telegram`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData: app.initData })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                        // Save to localStorage
                        localStorage.setItem('moneo_user_auth', JSON.stringify({
                            user: data.user,
                            token: data.token
                        }));
                        setIsReady(true);
                        return;
                    } else {
                        console.error("Telegram Auth failed", res.status);
                        console.error("Telegram Auth failed", res.status);
                        // Do not set guest fallback. Page.tsx will handle the login form.
                        setUser(null);
                    }
                } else if (cachedAuthCode) {
                    // Priority 4: Cached Magic Link code (fallback)
                    console.log("🔑 Attempting cached Magic Login");

                    const res = await fetch(`${BACKEND_URL}/api/auth/magic-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: cachedAuthCode })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);

                        localStorage.setItem('moneo_user_auth', JSON.stringify({
                            user: data.user,
                            token: data.token || cachedAuthCode
                        }));
                    } else {
                        console.error("Cached Magic Login failed");
                        localStorage.removeItem('moneo_auth_code');
                        console.error("Cached Magic Login failed");
                        localStorage.removeItem('moneo_auth_code');
                        setUser(null);
                    }
                } else {
                    // No Auth - Check if inside Telegram but no initData (weird) OR standard browser

                    // Check if explicitly logged out
                    const isLoggedOut = localStorage.getItem('moneo_is_logged_out');

                    if (app?.initDataUnsafe?.user && !isLoggedOut) {
                        setUser(app.initDataUnsafe.user);
                    } else if (app?.initDataUnsafe?.user && isLoggedOut) {
                        console.log("🔒 User explicitly logged out. Ignoring Telegram auto-login.");
                    } else {
                        // Standard Browser / Dev Mode
                        if (isLoggedOut === 'true') {
                            console.log("🔒 User explicitly logged out. Waiting for manual login.");
                            // Do NOT set user, effectively leaving it null
                        } else {
                            console.log("ℹ️ No auth found. Waiting for user action.");
                            // Do NOT auto-login as Dev/Guest anymore.
                            // User must click "Enter as Guest" on Splash Screen.
                        }
                    }
                }

            } catch (e) {
                console.error("Login failed", e);
                setUser(null);
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
