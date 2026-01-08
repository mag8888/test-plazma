import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { User } from '../models/User';
import { Transaction, TransactionType } from '../models/Transaction';
import { AdminLog, AdminActionType } from '../models/AdminLog';
import { Avatar } from '../models/Avatar';
import { CardModel } from '../models/Card';
import { RoomModel } from '../models/Room';
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
                // Strip @ if present for username search
                const q = (query as string).replace('@', '').trim();

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

            // 4.5 Lookup Transitions for Spent Yellow Calculation
            // We need to find LevelTransitions where 'avatar' matches any of the user's avatars
            pipeline.push({
                $lookup: {
                    from: 'leveltransitions',
                    let: { avatarIds: '$avatars._id' }, // Array of avatar IDs
                    pipeline: [
                        { $match: { $expr: { $in: ['$avatar', '$$avatarIds'] } } }
                    ],
                    as: 'transitions'
                }
            });

            pipeline.push({
                $addFields: {
                    spentYellow: {
                        $sum: {
                            $map: {
                                input: '$transitions',
                                as: 't',
                                in: { $add: ['$$t.yellowBonusSent', '$$t.referrerBonus'] }
                            }
                        }
                    }
                }
            });

            // Cleanup transitions array to keep response light
            pipeline.push({ $project: { transitions: 0 } });

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

    // Get User Transactions (Legacy)
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

    // Get Full User History (Transactions, Referrals, Inviter)
    static async getUserHistory(req: ExpressRequest, res: ExpressResponse) {
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

            // 1. Transactions
            const transactions = await Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(100);

            // 2. Inviter (Referrer)
            const inviter = await User.findById(user.referrer).select('username telegram_id photo_url greenBalance');

            // 3. Referrals (Users invited by this user)
            // Limit to 50 for performance, maybe add viewing all later
            const referrals = await User.find({ referrer: user._id })
                .select('username telegram_id photo_url greenBalance yellowBalance createdAt')
                .sort({ createdAt: -1 })
                .limit(50);

            // 4. Counts
            const referralsCount = await User.countDocuments({ referrer: user._id });

            res.json({
                user: {
                    _id: user._id,
                    username: user.username,
                    telegram_id: user.telegram_id,
                    greenBalance: user.greenBalance,
                    yellowBalance: user.yellowBalance,
                    balanceRed: user.balanceRed
                },
                transactions,
                inviter,
                referrals,
                referralsCount
            });

        } catch (error: any) {
            console.error('getUserHistory error:', error);
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

            // Aggregations for User balances
            const balanceStats = await User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalGreen: { $sum: "$greenBalance" },
                        // users might still have legacy yellow balance
                        totalUserYellow: { $sum: "$yellowBalance" }
                    }
                }
            ]);

            // Aggregations for Avatar Matrix Liquidity (Yellow Balance) & Levels
            const avatarStats = await Avatar.aggregate([
                {
                    $group: {
                        _id: "$level",
                        count: { $sum: 1 },
                        matrixLiquidity: { $sum: "$yellowBalance" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Transform into object { "0": 30, "1": 5 }
            const levels: any = {};
            let totalMatrixLiquidity = 0;

            avatarStats.forEach(s => {
                levels[s._id] = s.count;
                totalMatrixLiquidity += s.matrixLiquidity || 0;
            });

            res.json({
                totalUsers,
                totalAvatars,
                levels, // Breakdown by level
                totalGreen: balanceStats[0]?.totalGreen || 0,
                // Combine User Legacy Yellow + Active Matrix Yellow for total view, or separate
                totalYellow: (balanceStats[0]?.totalUserYellow || 0) + totalMatrixLiquidity,
                matrixLiquidity: totalMatrixLiquidity,
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

            // Import Services
            const { MatrixService } = require('../services/MatrixService');

            console.log(`[Admin] Starting FULL MATRIX RECALCULATION (Replay Mode)...`);

            // 1. Fetch ALL Avatars (Active & Inactive - we might want to fix everything, or just active)
            // User implies "distribution according to purchases", usually usually means all valid purchases.
            // We'll stick to 'isActive: true' to avoid resurrecting deleted/banned ones.
            const avatars = await Avatar.find({ isActive: true }).sort({ createdAt: 1 }).populate('owner');

            console.log(`[Admin] Resetting ${avatars.length} avatars...`);

            // 2. RESET STATE (Structure & Balance)
            // We leave 'owner', 'type', 'cost', 'createdAt' intact.
            // We wipe 'parent', 'partners', 'level', 'yellowBalance', 'isClosed'.
            await Avatar.updateMany(
                { isActive: true },
                {
                    $set: {
                        parent: null,
                        partners: [],
                        level: 0,
                        yellowBalance: 0,
                        isClosed: false,
                        lastLevelUpAt: null
                    }
                }
            );

            let processed = 0;
            const errors = [];

            // 3. REPLAY HISTORY
            for (const avatar of avatars) {
                try {
                    // Reload fresh state (it was reset)
                    const freshAvatar = await Avatar.findById(avatar._id);
                    if (!freshAvatar) continue;

                    // Get Referrer ID from populated owner or fetch user
                    const owner = avatar.owner as any; // Type assertion
                    const referrerId = owner.referrer;

                    // A. PLACE AVATAR (New Logic: Hungry Global)
                    const { parent } = await MatrixService.placeAvatar(freshAvatar, referrerId);

                    // B. SIMULATE MATRIX VALUE FLOW (50% Cost)
                    if (parent) {
                        const matrixValue = (freshAvatar.cost || 0) / 2;

                        // Add to Parent Yellow Balance
                        parent.yellowBalance = (parent.yellowBalance || 0) + matrixValue;
                        await parent.save();

                        // C. TRIGGER LEVEL PROGRESSION
                        // This will recursively level up the parent chain
                        // PASS TRUE for isSimulation to avoid duplicate payouts
                        await MatrixService.checkLevelProgression(parent, 0, true);
                    }

                    processed++;
                } catch (err: any) {
                    console.error(`Replay Error Avatar ${avatar._id}:`, err);
                    errors.push(`Avatar ${avatar._id}: ${err.message}`);
                }
            }

            console.log(`[Admin] Replay Complete. Processed: ${processed}`);

            // Log Admin Action
            await AdminLog.create({
                adminName,
                action: AdminActionType.BALANCE_CHANGE, // Reusing existing type
                details: `Recalculated (Replay) avatars. Total: ${avatars.length}, Processed: ${processed}, Errors: ${errors.length}`
            });

            res.json({
                success: true,
                total: avatars.length,
                processed,
                activated: processed, // Map for frontend
                updated: 0,           // Map for frontend
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error: any) {
            console.error('recalculateAvatars error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get Avatars for a User (Admin View)
    static async getUserAvatars(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId } = req.params;
            if (!userId) return res.status(400).json({ error: 'Missing userId' });

            let user;
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(userId);
            } else {
                user = await User.findOne({ telegram_id: Number(userId) }) || await User.findOne({ username: userId });
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            const avatars = await Avatar.find({ owner: user._id }).sort({ level: -1 });

            res.json({ success: true, avatars });
        } catch (error: any) {
            console.error('getUserAvatars error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get All Cards
    static async getCards(req: ExpressRequest, res: ExpressResponse) {
        try {
            const cards = await CardModel.find().sort({ id: 1 });
            res.json(cards);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get All Games (Rooms)
    static async getGames(req: ExpressRequest, res: ExpressResponse) {
        try {
            const rooms = await RoomModel.find().sort({ createdAt: -1 }).limit(50);
            res.json(rooms);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Broadcast Message
    static async broadcast(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { message, filters, dryRun } = req.body;
            const secret = req.headers['x-admin-secret'] as string;
            const adminName = secret.split(':')[0] || 'Unknown Admin';

            if (!message) return res.status(400).json({ error: 'Message is required' });

            // Build Filter Query
            const query: any = {};

            if (filters) {
                if (filters.minRating !== undefined) query.rating = { $gte: Number(filters.minRating) };
                if (filters.maxRating !== undefined) query.rating = { ...query.rating, $lte: Number(filters.maxRating) };

                if (filters.minBalance !== undefined) query.greenBalance = { $gte: Number(filters.minBalance) };
                if (filters.maxBalance !== undefined) query.greenBalance = { ...query.greenBalance, $lte: Number(filters.maxBalance) };

                if (filters.minInvited !== undefined) {
                    // This is hard to query directly without aggregation or denormalization.
                    // Assuming 'referralsCount' is maintained on User.
                    query.referralsCount = { $gte: Number(filters.minInvited) };
                }

                if (filters.hasAvatar === true) {
                    // Check if user owns an active avatar. 
                    // Since this is across collections, we might need a two-step process or aggregation.
                    // Option 1: Find all avatars, get owners, use $in.
                    const activeAvatars = await Avatar.find({ isActive: true }).distinct('owner');
                    query._id = { $in: activeAvatars };
                }
            }

            // Exclude users without telegram_id
            query.telegram_id = { $exists: true, $ne: null };

            console.log('[AdminBroadcast] Query:', query);

            const users = await User.find(query).select('telegram_id username');

            if (dryRun) {
                return res.json({
                    success: true,
                    count: users.length,
                    sample: users.slice(0, 5).map(u => u.username)
                });
            }

            // START BROADCAST
            let sent = 0;
            let errors = 0;

            // Use simple loop for now, maybe queue later
            for (const user of users) {
                try {
                    await NotificationService.sendTelegramMessage(user.telegram_id, message);
                    sent++;
                } catch (e) {
                    errors++;
                    console.error(`Failed to send to ${user.username} (${user.telegram_id})`, e);
                }
                // Rate limit slightly? Telegram allows 30/sec.
                // await new Promise(r => setTimeout(r, 35)); 
            }

            await AdminLog.create({
                adminName,
                action: AdminActionType.BALANCE_CHANGE, // Or add BROADCAST type
                details: `Broadcast sent to ${sent} users. Filters: ${JSON.stringify(filters)}. Errors: ${errors}`
            });

            res.json({ success: true, sent, errors, total: users.length });

        } catch (error: any) {
            console.error('Broadcast Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get Root Avatar specific (Oldest)
    static async getRootAvatar(req: ExpressRequest, res: ExpressResponse) {
        try {
            const rootAvatar = await Avatar.findOne({ isActive: true }).sort({ createdAt: 1 }).populate('owner');
            if (rootAvatar) {
                res.json({ success: true, avatar: rootAvatar });
            } else {
                res.status(404).json({ error: 'No avatars found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Audit Endpoint
     */
    static async auditBonuses(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId } = req.query;
            const { AuditService } = require('../services/AuditService');

            const results = await AuditService.performAudit(userId as string);

            res.json({
                success: true,
                issuesFound: results.length,
                results
            });
        } catch (error: any) {
            console.error('Audit Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Fix Audit Issues Endpoint
     */
    static async auditFix(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { userId } = req.body;
            const { AuditService } = require('../services/AuditService');

            if (userId) {
                // Single User
                const result = await AuditService.fixBalances(userId);
                res.json(result);
            } else {
                // Fix All Users
                console.log('[Admin] Starting Global Balance Fix...');
                const users = await User.find({});
                let fixed = 0;
                let totalDeducted = 0;
                const details = [];

                for (const user of users) {
                    const res = await AuditService.fixBalances(user._id);
                    if (res.deducted > 0) {
                        fixed++;
                        totalDeducted += res.deducted;
                        details.push(`${user.username || user.telegram_id}: -$${res.deducted.toFixed(2)}`);
                    }
                }

                res.json({
                    success: true,
                    message: `Global Fix Complete. Fixed: ${fixed} users. Total Deducted: $${totalDeducted.toFixed(2)}`,
                    details
                });
            }

        } catch (error: any) {
            console.error('Audit Fix Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
