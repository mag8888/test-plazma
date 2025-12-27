import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { User } from '../models/User';
import { Transaction, TransactionType } from '../models/Transaction';
import { AdminLog, AdminActionType } from '../models/AdminLog';
import { Avatar } from '../models/Avatar';
import mongoose from 'mongoose';
import { NotificationService } from '../services/NotificationService';

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
            const { query, page, sortBy, order } = req.query;
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

            // Aggregation Pipeline for Advanced Sorting (Avatars)
            const pipeline: any[] = [];

            // 1. Match Filter
            if (Object.keys(filter).length > 0) {
                pipeline.push({ $match: filter });
            }

            // 2. Lookup Avatars to get Counts (Required for sorting by avatarsCount)
            pipeline.push({
                $lookup: {
                    from: 'avatars',
                    let: { userId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$owner', '$$userId'] } } }
                    ],
                    as: 'avatars'
                }
            });

            // 3. Add Computed Fields (Avatar Counts & details)
            pipeline.push({
                $addFields: {
                    avatarsCount: { $size: '$avatars' },
                    avatarCounts: {
                        basic: { $size: { $filter: { input: '$avatars', as: 'a', cond: { $eq: ['$$a.type', 'BASIC'] } } } },
                        advanced: { $size: { $filter: { input: '$avatars', as: 'a', cond: { $eq: ['$$a.type', 'ADVANCED'] } } } },
                        premium: { $size: { $filter: { input: '$avatars', as: 'a', cond: { $eq: ['$$a.type', 'PREMIUM'] } } } },
                        total: { $size: '$avatars' }
                    }
                }
            });

            // 4. Lookup Referrer (for display)
            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'referrer',
                    foreignField: '_id',
                    as: 'referrerData'
                }
            });
            pipeline.push({
                $addFields: {
                    referrer: { $arrayElemAt: ['$referrerData', 0] } // Flatten to single object or null
                }
            });

            // 5. Sort
            let sortStage: any = { createdAt: -1 };
            if (req.query.sortBy) {
                const field = req.query.sortBy as string;
                const order = req.query.order === 'asc' ? 1 : -1;
                sortStage = { [field]: order };
            }
            pipeline.push({ $sort: sortStage });

            // 6. Pagination
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });

            // Run Aggregation
            const users = await User.aggregate(pipeline);

            // Get total count (separate query for performance, or use $facet)
            const total = await User.countDocuments(filter);

            res.json({
                users,
                total,
                page,
                pages: Math.ceil(total / limit)
            });
        } catch (error: any) {
            console.error('getUsers error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get User Transactions
    static async getUserTransactions(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId } = req.params;
            if (!userId) return res.status(400).json({ error: 'Missing userId' });

            // Resolve User ID
            let user;
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(userId);
            } else {
                user = await User.findOne({ telegram_id: Number(userId) }) || await User.findOne({ username: userId });
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            const transactions = await Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(100);
            res.json(transactions);
        } catch (error: any) {
            console.error('getUserTransactions error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Update Balance
    static async updateBalance(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId, amount, type, description, bonusDescription } = req.body;
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

            console.log('[AdminController] updateBalance headers:', req.headers);
            console.log('[AdminController] updateBalance body:', req.body);

            if (!userId) return res.status(400).json({ error: 'Missing field: userId', receivedBody: req.body });
            if (amount === undefined || amount === null) return res.status(400).json({ error: 'Missing field: amount', receivedBody: req.body });
            if (!type) return res.status(400).json({ error: 'Missing field: type', receivedBody: req.body });

            let user;
            // Check if userId is MongoID
            if (String(userId).match(/^[0-9a-fA-F]{24}$/)) {
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
                if (['GREEN', 'YELLOW', 'RED'].includes(type.toUpperCase())) {
                    await Transaction.create({
                        user: user._id,
                        amount: value,
                        currency: type.toUpperCase(), // Fix: missing required field
                        type: TransactionType.ADMIN_ADJUSTMENT,
                        description: description || `Admin adjustment: ${value} ${type}`
                    });
                }     // Log Admin Action (for admin panel audit)
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

            // Notification for Green Deposit
            console.log(`[AdminController] Checking notification: Type=${type}, Value=${value}, TID=${user.telegram_id}`);
            if (type === 'GREEN' && value > 0 && user.telegram_id) {
                const note = bonusDescription ? `\n\n💬 ${bonusDescription}` : '';
                NotificationService.sendTelegramMessage(
                    user.telegram_id,
                    `Ваш счет пополнен на сумму <b>$${value}</b> (Админ)${note}`
                ).catch(e => console.error("Failed to send admin deposit notification", e));
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
                totalYellow: balanceStats[0]?.totalYellow || 0,
                debug: {
                    dbName: mongoose.connection.db?.databaseName,
                    host: mongoose.connection.host
                }
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

            let repaired = 0;
            let updated = 0;
            let skipped = 0;
            let errors = 0;

            for (const user of allUsers) {
                // Skip if no referredBy string
                if (!user.referredBy) {
                    continue;
                }

                try {
                    // Find the CORRECT referrer by username or telegram_id
                    const cleanRef = user.referredBy.trim();
                    const conditions: any[] = [
                        { username: new RegExp(`^${cleanRef}$`, 'i') }
                    ];

                    const numRef = Number(cleanRef);
                    if (!isNaN(numRef)) {
                        conditions.push({ telegram_id: numRef });
                    }

                    const correctReferrer = await User.findOne({ $or: conditions });

                    // Logic:
                    // 1. If currently no referrer, but we found one -> Link it (Update)
                    // 2. If currently has referrer, but it DOES NOT match the found one -> Fix it (Repair)

                    if (correctReferrer && correctReferrer._id.toString() !== user._id.toString()) {
                        const currentRefId = user.referrer?.toString();
                        const correctRefId = correctReferrer._id.toString();

                        if (currentRefId !== correctRefId) {
                            user.referrer = correctReferrer._id;
                            await user.save();

                            if (currentRefId) repaired++;
                            else updated++;
                        }
                    }
                } catch (err) {
                    errors++;
                    console.error(`Error processing ${user.username}:`, err);
                }
            }

            res.json({
                success: true,
                updated,
                repaired,
                skipped: 0,
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

    // Add Avatar (Admin Gift)
    static async addAvatar(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId, type, deductBalance } = req.body;
            const secret = req.headers['x-admin-secret'] as string;
            const adminName = secret.split(':')[0] || 'Unknown Admin';

            if (!userId || !type) return res.status(400).json({ error: 'Missing userId or type' });
            if (!['BASIC', 'ADVANCED', 'PREMIUM'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const config = {
                BASIC: { cost: 20, subscriptionMonths: 1 },
                ADVANCED: { cost: 100, subscriptionMonths: 12 },
                PREMIUM: { cost: 1000, subscriptionMonths: null }
            }[type as 'BASIC' | 'ADVANCED' | 'PREMIUM'];

            // Calculate subscription expiry
            let subscriptionExpires: Date | null = null;
            if (config.subscriptionMonths) {
                subscriptionExpires = new Date();
                subscriptionExpires.setMonth(subscriptionExpires.getMonth() + config.subscriptionMonths);
            }

            // Create avatar
            const newAvatar = new Avatar({
                owner: userId,
                type,
                cost: deductBalance ? config.cost : 0, // Cost is real if deducted
                subscriptionExpires,
                level: 0,
                isActive: true
            });

            // Import Services
            const { MatrixService } = require('../services/MatrixService');
            const { WalletService, Currency } = require('../services/WalletService');

            // Handle Balance Deduction (Simulate Real Purchase)
            if (deductBalance) {
                const userBalance = user.greenBalance || 0;
                if (userBalance < config.cost) {
                    return res.status(400).json({ error: `Insufficient Green Balance. Required: ${config.cost}, Available: ${userBalance}` });
                }

                // Deduct Balance
                await WalletService.charge(user.id, Currency.GREEN, config.cost, `Admin Purchase: ${type} Avatar`);
            }

            // Place in matrix
            const { parent } = await MatrixService.placeAvatar(newAvatar, user.referrer);

            // Distribute Bonuses if purchased
            if (deductBalance) {
                await MatrixService.distributeBonus(user.id, newAvatar._id, type, config.cost, parent);
            }

            // Log Admin Action
            await AdminLog.create({
                adminName,
                action: AdminActionType.BALANCE_CHANGE,
                targetUser: user._id,
                details: `Gifted ACTIVE ${type} avatar. Parent: ${parent ? parent._id : 'None'}. Deducted: ${deductBalance || false}`
            });

            res.json({ success: true, avatar: newAvatar });

        } catch (error: any) {
            console.error('addAvatar error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Recalculate and activate all avatars - Admin tool for fixing broken states
     */
    static async recalculateAvatars(req: ExpressRequest, res: ExpressResponse) {
        try {
            const adminName = req.headers['x-admin-name'] as string || 'Unknown Admin';

            // Get all avatars
            const avatars = await Avatar.find({}).populate('owner');

            let activated = 0;
            let updated = 0;
            const errors = [];

            for (const avatar of avatars) {
                try {
                    let changed = false;

                    // Ensure isActive is set
                    if (avatar.isActive === undefined || avatar.isActive === null) {
                        avatar.isActive = true;
                        changed = true;
                        activated++;
                    }

                    // Save if changed
                    if (changed) {
                        await avatar.save();
                        updated++;
                    }
                } catch (err: any) {
                    errors.push(`Avatar ${avatar._id}: ${err.message}`);
                }
            }

            // Log Admin Action
            await AdminLog.create({
                adminName,
                action: AdminActionType.BALANCE_CHANGE, // Reusing existing type
                details: `Recalculated avatars. Total: ${avatars.length}, Activated: ${activated}, Updated: ${updated}, Errors: ${errors.length}`
            });

            res.json({
                success: true,
                total: avatars.length,
                activated,
                updated,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error: any) {
            console.error('recalculateAvatars error:', error);
            res.status(500).json({ error: error.message });
        }
    }

}
