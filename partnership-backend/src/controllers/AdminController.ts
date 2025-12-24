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
                .populate('referrer', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const totalCount = await User.countDocuments(filter);

            // Add avatar counts for each user
            const usersWithAvatars = await Promise.all(users.map(async (user) => {
                const avatars = await Avatar.find({ owner: user._id, isActive: true });
                const avatarCounts = {
                    basic: avatars.filter(a => a.type === 'BASIC').length,
                    advanced: avatars.filter(a => a.type === 'ADVANCED').length,
                    premium: avatars.filter(a => a.type === 'PREMIUM').length,
                    total: avatars.length
                };
                return { ...user, avatarCounts };
            }));

            res.json({ users: usersWithAvatars, totalCount });
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

    // Rebuild Referrals Endpoint
    static async rebuildReferrals(req: ExpressRequest, res: ExpressResponse) {
        try {
            const allUsers = await User.find({});

            let updated = 0;
            let skipped = 0;
            let errors = 0;

            for (const user of allUsers) {
                // Skip if already has referrer ObjectId
                if (user.referrer) {
                    skipped++;
                    continue;
                }

                // Skip if no referredBy string
                if (!user.referredBy) {
                    continue;
                }

                try {
                    // Find the referrer by username or telegram_id
                    const referrer = await User.findOne({
                        $or: [
                            { username: user.referredBy },
                            { telegram_id: !isNaN(Number(user.referredBy)) ? Number(user.referredBy) : null }
                        ]
                    });

                    if (referrer && referrer._id.toString() !== user._id.toString()) {
                        user.referrer = referrer._id;
                        await user.save();
                        updated++;
                    }
                } catch (err) {
                    errors++;
                    console.error(`Error processing ${user.username}:`, err);
                }
            }

            res.json({
                success: true,
                updated,
                skipped,
                errors,
                totalUsers: allUsers.length
            });
        } catch (error: any) {
            console.error('AdminController.rebuildReferrals error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Debug: Check for missing referrers
    static async checkReferrers(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { searchUsername } = req.query;

            // 1. Search for specific user
            let targetUser = null;
            if (searchUsername) {
                targetUser = await User.findOne({
                    $or: [
                        { username: new RegExp(`^${searchUsername}$`, 'i') },
                        { telegram_id: !isNaN(Number(searchUsername)) ? Number(searchUsername) : null }
                    ]
                });
            }

            // 2. Count users with this referredBy
            const referredByCount = searchUsername
                ? await User.countDocuments({ referredBy: new RegExp(`^${searchUsername}$`, 'i') })
                : 0;

            // 3. Sample users with this referredBy
            const sampleReferrals = searchUsername
                ? await User.find({ referredBy: new RegExp(`^${searchUsername}$`, 'i') })
                    .limit(10)
                    .select('username telegram_id referredBy referrer')
                : [];

            // 4. Total broken referrals (referredBy exists but referrer ObjectId doesn't)
            const brokenCount = await User.countDocuments({
                referredBy: { $exists: true, $nin: [null, ''] },
                $or: [
                    { referrer: { $exists: false } },
                    { referrer: null }
                ]
            });

            res.json({
                searchUsername,
                userExists: !!targetUser,
                user: targetUser ? {
                    username: targetUser.username,
                    telegram_id: targetUser.telegram_id,
                    _id: targetUser._id
                } : null,
                referredByCount,
                sampleReferrals: sampleReferrals.map(u => ({
                    username: u.username,
                    telegram_id: u.telegram_id,
                    referredBy: u.referredBy,
                    hasReferrerObjectId: !!u.referrer
                })),
                totalBrokenReferrals: brokenCount
            });
        } catch (error: any) {
            console.error('checkReferrers error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Delete all avatars (cleanup)
    static async deleteAllAvatars(req: ExpressRequest, res: ExpressResponse) {
        try {
            const result = await Avatar.deleteMany({});
            const secret = req.headers['x-admin-secret'] as string;
            const adminName = secret.split(':')[0] || 'Unknown Admin';

            // Log action
            await AdminLog.create({
                adminName,
                action: AdminActionType.BALANCE_CHANGE, // Reusing enum, or add new type
                details: `Deleted all avatars. Count: ${result.deletedCount}`
            });

            res.json({
                success: true,
                deletedCount: result.deletedCount,
                message: `Deleted ${result.deletedCount} avatars`
            });
        } catch (error: any) {
            console.error('deleteAllAvatars error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
