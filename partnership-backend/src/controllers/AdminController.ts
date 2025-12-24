import { Request, Response } from 'express';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';

// Use a simple env var for protection, fallback to a default for dev if needed
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin';

export class AdminController {

    // Middleware to check secret
    static async authenticate(req: Request, res: Response, next: any) {
        const secret = req.headers['x-admin-secret'];
        // console.log(`[AdminAuth] Received: ${secret}, Expected: ${ADMIN_SECRET}`); // Debug log

        if (secret !== ADMIN_SECRET) {
            // START TEMP BYPASS IF USER REQUESTED "NO CHECKS" - But user said "leave login password".
            // So we must check.
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
                const q = query as string;
                // If numeric, search exact telegram_id OR username regex
                if (/^\d+$/.test(q)) {
                    filter = {
                        $or: [
                            { username: new RegExp(q, 'i') },
                            { telegram_id: Number(q) }
                        ]
                    };
                } else {
                    filter = { username: new RegExp(q, 'i') };
                }
            }

            const users = await User.find(filter)
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('referrer', 'username telegram_id');
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

            let user;
            // Check if userId is MongoID
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(userId);
            } else {
                // Try finding by telegramId
                user = await User.findOne({ telegram_id: Number(userId) });
                if (!user) {
                    user = await User.findOne({ username: userId });
                }
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            const value = Number(amount);
            if (isNaN(value)) return res.status(400).json({ error: 'Invalid amount' });

            if (type === 'GREEN') {
                user.greenBalance = (user.greenBalance || 0) + value;
            } else if (type === 'YELLOW') {
                user.yellowBalance = (user.yellowBalance || 0) + value;
            } else if (type === 'RED') {
                user.balanceRed = (user.balanceRed || 0) + value;
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
    // Update Referrer
    static async updateReferrer(req: Request, res: Response) {
        try {
            const { userId, referrerIdentifier } = req.body;
            if (!userId) return res.status(400).json({ error: 'Missing userId' });

            // 1. Find User
            let user;
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(userId);
            } else {
                user = await User.findOne({ telegram_id: Number(userId) }) || await User.findOne({ username: userId });
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            // 2. Handle Removal (if empty referrer)
            if (!referrerIdentifier) {
                user.referrer = undefined;
                await user.save();
                return res.json({ success: true, message: 'Referrer removed' });
            }

            // 3. Find New Referrer
            let newRef;
            if (referrerIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
                newRef = await User.findById(referrerIdentifier);
            } else {
                // Try username (remove @ if present)
                const cleanUser = referrerIdentifier.replace('@', '');
                newRef = await User.findOne({ username: new RegExp(`^${cleanUser}$`, 'i') });
                // If not found by username, try ID
                if (!newRef && !isNaN(Number(referrerIdentifier))) {
                    newRef = await User.findOne({ telegram_id: Number(referrerIdentifier) });
                }
            }

            if (!newRef) return res.status(404).json({ error: 'New Referrer not found' });
            if (newRef._id.equals(user._id)) return res.status(400).json({ error: 'Cannot refer self' });

            // 4. Update
            user.referrer = newRef._id;
            await user.save();

            res.json({ success: true, message: `Referrer updated to ${newRef.username}` });

        } catch (error: any) {
            console.error("Update Referrer Error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}
