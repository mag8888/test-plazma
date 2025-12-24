import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { User } from '../models/User';
import { Transaction, TransactionType } from '../models/Transaction';
import { AdminLog, AdminActionType } from '../models/AdminLog';
import { Avatar } from '../models/Avatar';
import mongoose from 'mongoose';

// Use a simple env var for protection, fallback to a default for dev if needed
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin';

export class AdminController {

    // Middleware to check secret
    static async authenticate(req: ExpressRequest, res: ExpressResponse, next: any) {
        const secret = req.headers['x-admin-secret'];
        // console.log(`[AdminAuth] Received: ${secret}, Expected: ${ADMIN_SECRET}`); // Debug log

        const validSecrets = (ADMIN_SECRET || '').split(',').map(s => s.trim());
        if (!validSecrets.includes(secret as string)) {
            // START TEMP BYPASS IF USER REQUESTED "NO CHECKS" - But user said "leave login password".
            // So we must check.
            return res.status(403).json({ error: 'Unauthorized: Invalid Admin Secret' });
        }
        next();
    }

    // Search Users
    static async getUsers(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { query, page } = req.query;
            const pageNum = Number(page) || 1;
            const limit = 50;
            const skip = (pageNum - 1) * limit;

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
                .skip(skip)
                .limit(limit)
                .populate('referrer', 'username telegram_id');

            const total = await User.countDocuments(filter);

            res.json({ users, total, page: pageNum, pages: Math.ceil(total / limit) });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update Balance
    static async updateBalance(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId, amount, type, description } = req.body;
            const secret = req.headers['x-admin-secret'] as string;
            // Parse admin name
            const adminName = secret.split(':')[0] || 'Unknown Admin';
            // type: 'GREEN' | 'YELLOW' | 'RED' | 'RATING'
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
            } else if (type === 'RATING') {
                user.rating = (user.rating || 1000) + value;
            } else {
                return res.status(400).json({ error: 'Invalid balance type' });
            }

            if (description) {
                // Log Transaction (for user history)
                await Transaction.create({
                    user: user._id,
                    amount: value,
                    type: TransactionType.ADMIN_ADJUSTMENT,
                    description: `${description} (by ${adminName})`
                });

                // Log Admin Action (for admin panel audit)
                await AdminLog.create({
                    adminName,
                    action: AdminActionType.BALANCE_CHANGE,
                    targetUser: user._id,
                    details: `Changed ${type} balance by ${value}. Reason: ${description}`
                });
            } else {
                // Even without description (legacy support?), should likely log
                await AdminLog.create({
                    adminName,
                    action: AdminActionType.BALANCE_CHANGE,
                    targetUser: user._id,
                    details: `Changed ${type} balance by ${value}. (No reason provided)`
                });
            }

            await user.save();
            res.json({ success: true, user });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Global Stats
    static async getGlobalStats(req: ExpressRequest, res: ExpressResponse) {
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
    static async updateReferrer(req: ExpressRequest, res: ExpressResponse) {
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

    static async getLogs(req: ExpressRequest, res: ExpressResponse) {
        try {
            const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(100).populate('targetUser', 'username telegram_id');
            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
