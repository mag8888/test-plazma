const API_URL = process.env.NEXT_PUBLIC_PARTNERSHIP_API_URL || 'http://localhost:4000/api';

export const partnershipApi = {
    login: async (telegramId: string, username?: string, referrerId?: string) => {
        const res = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId, username, referrerId })
        });
        return res.json();
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
        try {
            const res = await fetch('/api/partnership/sync-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            });
            return res.json();
        } catch (e) {
            console.error("Sync Balance Error", e);
            return { error: "Sync failed" };
        }
    }
};
