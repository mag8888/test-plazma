import { getGiftsUrl } from './config';

const getBaseUrl = () => `${getGiftsUrl()}/api/gifts`;

export const giftsApi = {
    getTemplates: async () => {
        const res = await fetch(`${getBaseUrl()}/templates`);
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
    },

    buy: async (userId: string, templateSlug: string) => {
        const res = await fetch(`${getBaseUrl()}/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, templateSlug })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to buy gift');
        }
        return res.json();
    },

    getMyInventory: async (userId: string) => {
        const res = await fetch(`${getBaseUrl()}/inventory?userId=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch inventory');
        return res.json();
    },

    initOpen: async (inventoryId: string, userId: string) => {
        const res = await fetch(`${getBaseUrl()}/open-init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryId, userId })
        });
        if (!res.ok) throw new Error('Failed to init open');
        return res.json();
    },

    verifyOpen: async (inventoryId: string, userId: string, riddleId: string, answer: number) => {
        const res = await fetch(`${getBaseUrl()}/open-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryId, userId, riddleId, answer })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Verification failed');
        }
        return res.json(); // Returns { success: true, reward: ... }
    }
};
