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

    getTree: async (userId: string) => {
        const res = await fetch(`${API_URL}/tree/${userId}`);
        return res.json();
    },

    getStats: async (userId: string) => {
        const res = await fetch(`${API_URL}/stats/${userId}`);
        return res.json();
    }
};
