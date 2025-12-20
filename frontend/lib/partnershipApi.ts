import { getBackendUrl } from './config';

// 1. Ensure Protocol for Partnership API
const getPartnershipUrl = () => {
    let url = (process.env.NEXT_PUBLIC_PARTNERSHIP_API_URL || '').trim();
    if (!url) return 'http://localhost:4000/api';
    url = url.replace(/^["']|["']$/g, '');
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    return url.replace(/\/$/, '');
};

const API_URL = getPartnershipUrl();

export const partnershipApi = {
    login: async (telegramId: string, username?: string, referrerId?: string) => {
        const url = `${API_URL}/user`;
        console.log(`[Partnership] Attempting login to: ${url}`, { telegramId, username, referrerId });
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId, username, referrerId })
            });
            if (!res.ok) {
                const text = await res.text();
                console.error(`[Partnership] Login failed ${res.status}: ${text}`);
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 50)}`);
            }
            return res.json();
        } catch (e: any) {
            console.error("[Partnership] Fetch Error:", e);
            // Re-throw with more context to be caught by UI
            throw new Error(`Fetch Fail: ${e.message} (URL: ${url})`);
        }
    },

    subscribe: async (userId: string, tariff: string, referrerId?: string) => {
        const res = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, tariff, referrerId })
        });
        return res.json();
    },

    withdraw: async (userId: string, amount: number) => {
        const res = await fetch(`${API_URL}/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount })
        });
        return res.json();
    },

    async getTree(userId: string) {
        const res = await fetch(`${API_URL}/tree/${userId}`);
        return res.json();
    },

    async getStats(userId: string) {
        const res = await fetch(`${API_URL}/stats/${userId}`);
        return res.json();
    },

    async getPublicProfile(telegramId: number) {
        try {
            const res = await fetch(`${API_URL}/public-profile/${telegramId}`);
            if (!res.ok) return null;
            return res.json();
        } catch (e) {
            console.error("Public Profile Fetch Error", e);
            return null;
        }
    },

    // Sync from Main Backend Legacy Balance
    async syncLegacyBalance(initData: string) {
        const BACKEND_URL = getBackendUrl();
        try {
            const res = await fetch(`${BACKEND_URL}/api/partnership/sync-balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            });
            return res.json();
        } catch (e) {
            console.error("Sync Balance Error", e);
            return { error: "Sync failed" };
        }
    },

    // Check Pending Legacy Balance
    async getLegacyBalance(initData: string) {
        const BACKEND_URL = getBackendUrl();
        try {
            // Using /api/partnership/legacy-balance on Main Backend
            // Send initData as query param to avoid Header Character issues (Cyrillic names etc)
            const res = await fetch(`${BACKEND_URL}/api/partnership/legacy-balance?initData=${encodeURIComponent(initData)}`, {
                method: 'GET',
                // headers: { 'Authorization': `Bearer ${initData}` } // Removed to prevent DOMException
            });
            return res.json();
        } catch (e) {
            console.error("Get Legacy Balance Error", e);
            return { legacyBalance: 0 };
        }
    }
};
