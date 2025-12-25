import { Request, Response } from 'express';
import { WalletService, Currency } from '../services/WalletService';
import { TransactionType } from '../models/Transaction';

export class WalletController {

    static async getBalance(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const balances = await WalletService.getBalances(userId);
            res.json(balances);
        } catch (e: any) {
            res.status(404).json({ error: e.message });
        }
    }

    static async charge(req: Request, res: Response) {
        try {
            const { userId, currency, amount, reason } = req.body;

            if (!Object.values(Currency).includes(currency)) {
                return res.status(400).json({ error: 'Invalid currency' });
            }

            const newBalance = await WalletService.charge(userId, currency, amount, reason);
            res.json({ success: true, newBalance });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async deposit(req: Request, res: Response) {
        try {
            const { userId, currency, amount, reason, type } = req.body;

            if (!Object.values(Currency).includes(currency)) {
                return res.status(400).json({ error: 'Invalid currency' });
            }

            const newBalance = await WalletService.deposit(userId, currency, amount, reason, type || TransactionType.DEPOSIT);
            res.json({ success: true, newBalance });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }
}
