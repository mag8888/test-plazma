import { Request, Response } from 'express';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';

// Use a simple env var for protection, fallback to a default for dev if needed
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'supersecret';

export class AdminController {

    // Middleware to check secret
    static async authenticate(req: Request, res: Response, next: any) {
        const secret = req.headers['x-admin-secret'];
        if (secret !== ADMIN_SECRET) {
            return res.status(403).json({ error: 'Unauthorized: Invalid Admin Secret' });
        }
        next();
    }

    // Search Users
    static async getUsers(req: Request, res: Response) {
        try {
            const { query } = req.query;
            let filter = {};
            if (query) {
                const regex = new RegExp(query as string, 'i');
                filter = {
                    $or: [
                        { username: regex },
                        { telegramId: regex }
                    ]
                };
            }

            const users = await User.find(filter).sort({ createdAt: -1 }).limit(50);
            res.json(users);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update Balance
    static async updateBalance(req: Request, res: Response) {
        try {
            const { userId, amount, type } = req.body;
            // type: 'GREEN' | 'YELLOW' | 'RED' (if red is stored in User?)
            // Note: User model has greenBalance and yellowBalance. 
            // The MAIN 'RED' balance is actually stored in the Main Backend (Moneo), 
            // but here we might have duplicated it if we are syncing?
            // Checking User model...
            // User.ts has: greenBalance, yellowBalance. 
            // It does NOT have redBalance (that's likely on main game backend).
            // However, the prompt asked to top up players.
            // If this is Partnership Backend, we can only update Partnership balances (Green/Yellow).
            // Unless we proxy? For now, implementing Green/Yellow only.

            if (!userId || !amount || !type) return res.status(400).json({ error: 'Missing fields' });

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const value = Number(amount);
            if (isNaN(value)) return res.status(400).json({ error: 'Invalid amount' });

            if (type === 'GREEN') {
                user.greenBalance = (user.greenBalance || 0) + value;
            } else if (type === 'YELLOW') {
                user.yellowBalance = (user.yellowBalance || 0) + value;
            } else {
                return res.status(400).json({ error: 'Invalid balance type' });
            }

            await user.save();
            res.json({ success: true, user });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Global Stats
    static async getGlobalStats(req: Request, res: Response) {
        try {
            const totalUsers = await User.countDocuments();
            const totalAvatars = await Avatar.countDocuments();

            // Aggregations for balances
            const balanceStats = await User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalGreen: { $sum: "$greenBalance" },
                        totalYellow: { $sum: "$yellowBalance" }
                    }
                }
            ]);

            res.json({
                totalUsers,
                totalAvatars,
                totalGreen: balanceStats[0]?.totalGreen || 0,
                totalYellow: balanceStats[0]?.totalYellow || 0
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
