
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const PARTNERSHIP_URL = process.env.PARTNERSHIP_API_URL;
if (!PARTNERSHIP_URL) {
    console.error("FATAL: PARTNERSHIP_API_URL not set in PartnershipClient");
    // We cannot throw at top level easily without crashing app on require, 
    // but better to fail fast or handle in methods. 
    // For now, let's log fatal.
}
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin';

export enum Currency {
    GREEN = 'greenBalance',
    YELLOW = 'yellowBalance',
    RED = 'balanceRed'
}

export enum TransactionType {
    GAME_FEE = 'GAME_FEE',
    DEPOSIT = 'DEPOSIT'
}

export class PartnershipClient {

    /**
     * Get user balances
     */
    static async getBalances(userId: string | mongoose.Types.ObjectId): Promise<{ green: number, red: number, yellow: number, referral: number }> {
        try {
            const url = `${PARTNERSHIP_URL}/wallet/balance/${userId}`;
            const res = await fetch(url, {
                headers: { 'x-admin-secret': ADMIN_SECRET }
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }

            return await res.json() as any;
        } catch (e: any) {
            console.error('Failed to fetch balance:', e.message);
            // Fallback for safety? No, we should fail.
            throw e;
        }
    }

    /**
     * Charge user balance
     */
    static async charge(
        userId: string | mongoose.Types.ObjectId,
        currency: Currency,
        amount: number,
        reason: string
    ): Promise<void> {
        const url = `${PARTNERSHIP_URL}/wallet/charge`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': ADMIN_SECRET
            },
            body: JSON.stringify({ userId, currency, amount, reason })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `Charge failed: ${res.statusText}`);
        }
    }

    /**
     * Deposit to user balance
     */
    static async deposit(
        userId: string | mongoose.Types.ObjectId,
        currency: Currency,
        amount: number,
        reason: string,
        type: TransactionType = TransactionType.DEPOSIT
    ): Promise<void> {
        const url = `${PARTNERSHIP_URL}/wallet/deposit`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': ADMIN_SECRET
            },
            body: JSON.stringify({ userId, currency, amount, reason, type })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `Deposit failed: ${res.statusText}`);
        }
    }
}
