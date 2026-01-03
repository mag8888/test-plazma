import { getBackendUrl } from './config';

// Get Partnership API URL - use backend proxy for Telegram WebApp compatibility
const getPartnershipUrl = () => {
    if (typeof window !== 'undefined') {
        const backend = getBackendUrl();
        // Backend handles /api/partnership/* and proxies to partnership-backend
        return `${backend}/api/partnership`;
    }

    // SSR/Development fallback - MUST be set in ENV for production
    const envUrl = process.env.NEXT_PUBLIC_PARTNERSHIP_API_URL;
    if (!envUrl) console.warn("NEXT_PUBLIC_PARTNERSHIP_API_URL is not set");
    return envUrl || '';
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
        // Map tariff to type (frontend uses tariff names like 'PLAYER', 'MASTER' which match AvatarType)
        const res = await fetch(`${API_URL}/avatars/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type: tariff })
        });
        return res.json();
    },

    async getMyAvatars(userId: string) {
        const res = await fetch(`${API_URL}/avatars/my-avatars/${userId}`);
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

    async getPartners(userId: string) {
        console.log(`[Partnership] Loading partners for ${userId} from ${API_URL}/partners/${userId}`);
        const res = await fetch(`${API_URL}/partners/${userId}`);
        const data = await res.json();
        console.log(`[Partnership] Partners response:`, data);
        return data;
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

    async getGlobalStats() {
        const res = await fetch(`${API_URL}/stats`);
        return res.json();
    },

    async getPremiumCount() {
        const res = await fetch(`${API_URL}/avatars/premium-count`);
        return res.json();
    },

    async getAvatarMatrix(avatarId: string) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            const res = await fetch(`${API_URL}/avatars/matrix/${avatarId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Matrix Load Failed: ${res.status} ${text}`);
            }
            return res.json();
        } catch (e: any) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error("Matrix Load Timeout (Backend did not respond in 15s)");
            }
            throw e;
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
    },

    async requestDeposit(userId: string, amount: number, proofBase64: string) {
        const BACKEND_URL = getBackendUrl();
        try {
            const res = await fetch(`${BACKEND_URL}/api/deposit/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount, proofBase64 })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }
            return res.json();
        } catch (e: any) {
            console.error("Deposit Request Error", e);
            throw e;
        }
    }
};
