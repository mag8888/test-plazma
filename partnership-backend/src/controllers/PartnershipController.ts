import { Request, Response } from 'express';
import { MatrixService } from '../services/MatrixService';
import { FinanceService } from '../services/FinanceService';
import { User } from '../models/User';
import { Avatar, TariffType } from '../models/Avatar';
import mongoose from 'mongoose';

const TARIFF_PRICES = {
    [TariffType.GUEST]: 0,
    [TariffType.PLAYER]: 20,
    [TariffType.MASTER]: 100,
    [TariffType.PARTNER]: 1000
};

export class PartnershipController {

    static async subscribe(req: Request, res: Response) {
        try {
            const { userId, tariff, referrerId } = req.body;

            if (!userId || !tariff) {
                return res.status(400).json({ error: 'userId and tariff are required' });
            }

            // check price
            const price = TARIFF_PRICES[tariff as TariffType];
            if (price === undefined) {
                return res.status(400).json({ error: 'Invalid tariff' });
            }

            // Distribute payment first (simulate successful payment)
            if (price > 0) {
                await FinanceService.distributePayment(price, userId, referrerId);
            }

            // Place avatar
            const avatar = await MatrixService.placeAvatar(userId, tariff, referrerId);

            res.json({ success: true, avatar });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getTree(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            // Get all avatars for user + their structure?
            // For visualization, we might want the whole tree or just the user's view.
            // Let's return the user's Avatars and their children (1 level deep? or full?).
            // Full recursive tree might be big.
            // Let's fetching avatars where owner is user, then populate down?

            // Simple approach: Get all avatars of user.
            const userAvatars = await Avatar.find({ owner: userId }).populate({
                path: 'partners',
                populate: { path: 'partners' } // 2 levels deep for now
            });

            res.json(userAvatars);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getStats(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            // Count avatars
            const avatarCount = await Avatar.countDocuments({ owner: userId });

            res.json({
                greenBalance: user.greenBalance,
                yellowBalance: user.yellowBalance,
                avatarCount
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async withdraw(req: Request, res: Response) {
        try {
            const { userId, amount } = req.body;
            if (!userId || !amount) return res.status(400).json({ error: 'Missing fields' });

            const result = await FinanceService.processWithdrawal(userId, amount);
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // Unified Create or Login
    static async createUser(req: Request, res: Response) {
        try {
            const { telegramId, username, referrerId } = req.body;

            // 1. Try to find existing user first (Read-Heavy optimization)
            let user = await User.findOne({ telegramId });

            if (user) {
                // Update username if changed
                if (username && user.username !== username) {
                    user.username = username;
                    await user.save();
                }
                return res.json(user);
            }

            // 2. If not found, Create Explicitly (Avoid findOneAndUpdate upsert executor error)
            try {
                user = await User.create({
                    telegramId,
                    username,
                    referrer: referrerId
                });
                return res.json(user);
            } catch (createError: any) {
                // Handle Race Condition (Duplicate Key)
                if (createError.code === 11000 || createError.message.includes('E11000')) {
                    const existing = await User.findOne({ telegramId });
                    if (existing) return res.json(existing);
                }
                throw createError;
            }

        } catch (error: any) {
            console.error("CreateUser Error:", error);
            res.status(500).json({ error: error.message || "Login failed" });
        }
    }
    // Public stats for profile modal (Avatar + Level)
    static async getPublicStats(req: Request, res: Response) {
        try {
            const { telegramId } = req.params;
            const user = await User.findOne({ telegramId: Number(telegramId) });

            if (!user) {
                // Return defaults if user not in partnership system yet
                return res.json({ tariff: 'GUEST', level: 0, partners: 0 });
            }

            // Find best active avatar
            // Priority: PARTNER > MASTER > PLAYER > GUEST
            // Sort by tariff price desc
            const avatars = await Avatar.find({ owner: user._id, active: true }).lean();

            let bestAvatar: any = null;
            let maxPrice = -1;

            for (const av of avatars) {
                const p = TARIFF_PRICES[av.tariff as TariffType] || 0;
                if (p > maxPrice) {
                    maxPrice = p;
                    bestAvatar = av;
                }
            }

            if (!bestAvatar) {
                return res.json({ tariff: 'GUEST', level: 0, partners: 0 });
            }

            res.json({
                tariff: bestAvatar.tariff,
                level: bestAvatar.level,
                partners: bestAvatar.partners?.length || 0 // Direct children count
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
