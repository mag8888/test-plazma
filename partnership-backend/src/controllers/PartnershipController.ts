import { Request, Response } from 'express';
import { MatrixService } from '../services/MatrixService';
import { FinanceService } from '../services/FinanceService';
import { User } from '../models/User';
import { Avatar, AvatarType } from '../models/Avatar';
import { Transaction, TransactionType } from '../models/Transaction';
import mongoose from 'mongoose';

const TARIFF_PRICES = {
    BASIC: 20,
    ADVANCED: 100,
    PREMIUM: 1000
};

export class PartnershipController {

    // OLD SUBSCRIBE METHOD - DEPRECATED, USE AVATAR PURCHASE INSTEAD
    /*
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
    */

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
                balanceRed: user.balanceRed,
                rating: user.rating,
                gamesPlayed: user.gamesPlayed,
                wins: user.wins,
                referralsCount: user.referralsCount,
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
            let user = await User.findOne({ telegram_id: telegramId });

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
                    telegram_id: telegramId,
                    username,
                    referrer: referrerId
                });
                return res.json(user);
            } catch (createError: any) {
                // Handle Race Condition (Duplicate Key)
                if (createError.code === 11000 || createError.message.includes('E11000')) {
                    // Check if existing by telegram_id
                    const existing = await User.findOne({ telegram_id: telegramId });
                    if (existing) return res.json(existing);

                    // Check if existing by username (Legacy user missing telegram_id?)
                    if (username) {
                        const existingByName = await User.findOne({ username });
                        if (existingByName) {
                            console.log(`[Partnership] Merging legacy user ${username} with new telegram_id ${telegramId}`);
                            existingByName.telegram_id = telegramId;
                            await existingByName.save();
                            return res.json(existingByName);
                        }
                    }
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
            const user = await User.findOne({ telegram_id: Number(telegramId) });

            if (!user) {
                // Return defaults if user not in partnership system yet
                return res.json({ tariff: 'GUEST', level: 0, partners: 0 });
            }

            // Find best active avatar
            // Priority: PARTNER > MASTER > PLAYER > GUEST
            // Sort by tariff price desc
            const avatars = await Avatar.find({ owner: user._id, isActive: true }).lean();

            let bestAvatar: any = null;
            let maxPrice = -1;

            for (const av of avatars) {
                const p = av.cost || 0; // Use actual avatar cost
                if (p > maxPrice) {
                    maxPrice = p;
                    bestAvatar = av;
                }
            }

            if (!bestAvatar) {
                return res.json({ tariff: 'GUEST', level: 0, partners: 0 });
            }

            res.json({
                avatarType: bestAvatar.type,
                level: bestAvatar.level,
                partners: bestAvatar.partners?.length || 0 // Direct children count
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getPartners(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            let user;

            // Robust Lookup: Handle both MongoID and Telegram ID
            if (mongoose.Types.ObjectId.isValid(userId)) {
                user = await User.findById(userId);
            }

            if (!user && !isNaN(Number(userId))) {
                user = await User.findOne({ telegram_id: Number(userId) });
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            // 1. Find direct referrals (Standard Relation)
            let referrals = await User.find({ referrer: user._id }).lean();

            // 2. FALLBACK / SELF-REPAIR
            // If we found fewer referrals than expected (based on user.referralsCount or just 0), try string matching.
            // This fixes legacy data where `referrer` ObjectId is missing but `referredBy` string exists.
            if (referrals.length < (user.referralsCount || 0)) {
                console.log(`[Partners] Mismatch for ${user.username}: Found ${referrals.length} vs Expected ${user.referralsCount}. Trying fallback...`);

                const fallbackReferrals = await User.find({
                    referrer: { $exists: false }, // Only check unlinked users
                    $or: [
                        { referredBy: user.username },
                        { referredBy: { $regex: new RegExp(`^${user.username}$`, 'i') } }, // Case insensitive
                        { referredBy: String(user.telegram_id) },
                        { referredBy: String(user._id) }
                    ]
                });

                if (fallbackReferrals.length > 0) {
                    console.log(`[Partners] Found ${fallbackReferrals.length} detached referrals. Reparing...`);
                    // Async Repair
                    Promise.all(fallbackReferrals.map(async (orphan) => {
                        try {
                            await User.updateOne({ _id: orphan._id }, { referrer: user._id });
                        } catch (e) {
                            console.error(`Failed to repair orphan ${orphan._id}`, e);
                        }
                    }));

                    // Add to current result list
                    referrals = [...referrals, ...fallbackReferrals.map(r => r.toObject())] as any;
                }
            }

            // Aggregate stats for each referral
            const result = [];
            for (const ref of referrals) {
                const refUser = ref as any;

                // Get Tariff/Level
                const bestAvatar = await Avatar.findOne({ owner: refUser._id, isActive: true })
                    .sort({ level: -1 }).lean();

                // Get Income generated by this partner FOR the current user
                // We look for transactions where 'to' is userId, and description contains refUser.username
                // Optimization: Maybe relatedUserId field? But transaction model might relying on description.
                // Let's use regex on description since we don't have relatedUserId in Partnership Transaction model yet?
                // Actually let's check Transaction model if possible, but description is safer fallback based on "Bonus from ..."

                const bonuses = await Transaction.find({
                    user: user._id, // Received by current user (Schema field is 'user')
                    description: { $regex: new RegExp(`from ${refUser.username}`, 'i') }
                }).lean();

                let green = 0;
                let yellow = 0;
                let red = 0;

                for (const tx of bonuses) {
                    if (tx.type === TransactionType.BONUS_GREEN) green += tx.amount;
                    if (tx.type === TransactionType.BONUS_YELLOW) yellow += tx.amount;
                    // Check for Red Balance transactions (Currency 'balanceRed' or inferred)
                    if (tx.currency === 'balanceRed' || (tx.type === 'ADMIN_ADJUSTMENT' && tx.amount > 0 && !tx.currency) /* fallback */) {
                        if (tx.currency === 'balanceRed') red += tx.amount;
                    }
                }

                result.push({
                    _id: refUser._id,
                    username: refUser.username,
                    firstName: refUser.first_name,
                    telegramId: refUser.telegram_id,
                    avatarType: bestAvatar?.type || null,
                    level: bestAvatar?.level || 0,
                    incomeGreen: green,
                    incomeYellow: yellow,
                    incomeRed: red,
                    joinedAt: refUser.createdAt
                });
            }

            res.json(result);
        } catch (error: any) {
            console.error("Get Partners Error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    // NEW AVATAR SYSTEM ENDPOINTS

    /**
     * Purchase avatar
     */
    static async purchaseAvatar(req: Request, res: Response) {
        try {
            console.log('[PartnershipController] purchaseAvatar req.body:', req.body);
            const { userId, type } = req.body;

            if (!userId || !type) {
                return res.status(400).json({ error: 'userId and type are required' });
            }

            let targetUserId = userId;

            // Resolve Telegram ID to ObjectId if necessary
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                // Try finding by telegram_id
                const userByTg = await User.findOne({ telegram_id: userId });
                if (userByTg) {
                    targetUserId = userByTg._id.toString();
                    console.log(`[PartnershipController] Resolved Telegram ID ${userId} to ObjectId ${targetUserId}`);
                } else {
                    return res.status(400).json({ error: 'Invalid user ID format and user not found by Telegram ID' });
                }
            }

            // Map Frontend Tariff Names to Backend AvatarTypes
            const TARIFF_MAP: Record<string, AvatarType> = {
                'PLAYER': AvatarType.BASIC,
                'MASTER': AvatarType.ADVANCED,
                'PARTNER': AvatarType.PREMIUM
            };

            const mappedType = TARIFF_MAP[type] || type as AvatarType;

            const result = await MatrixService.purchaseAvatar(
                new mongoose.Types.ObjectId(targetUserId),
                mappedType
            );

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({ success: true, avatar: result.avatar });
        } catch (error: any) {
            console.error('Avatar purchase error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get user's avatars with subscription status
     */
    static async getMyAvatars(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            const avatars = await Avatar.find({
                owner: userId,
                isActive: true
            }).populate('parent').sort({ createdAt: -1 });

            // Check subscription status
            const now = new Date();
            const avatarsWithStatus = avatars.map(avatar => ({
                ...avatar.toObject(),
                hasActiveSubscription: !avatar.subscriptionExpires || avatar.subscriptionExpires > now
            }));

            res.json({ avatars: avatarsWithStatus });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get premium avatar count (for limit display)
     */
    static async getPremiumCount(req: Request, res: Response) {
        try {
            const count = await Avatar.countDocuments({
                type: 'PREMIUM',
                isActive: true
            });

            res.json({ count, limit: 25, available: Math.max(0, 25 - count) });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get avatar matrix tree (5 levels)
     */
    static async getAvatarMatrix(req: Request, res: Response) {
        try {
            const { avatarId } = req.params;

            const rootAvatar = await Avatar.findById(avatarId).populate('owner', 'username greenBalance yellowBalance');
            if (!rootAvatar) {
                return res.status(404).json({ error: 'Avatar not found' });
            }

            // Calculate actual earnings from this avatar
            const owner = rootAvatar.owner as any; // Type assertion for populated field
            const ownerId = owner._id || rootAvatar.owner;

            // Calculate Green Earned: Sum of referral bonuses from children placed directly under this avatar
            // We only count bonuses that went to the current owner (if they are the referrer)
            const childPurchases = await mongoose.model('AvatarPurchase').find({
                parentAvatarId: avatarId,
                referrerId: ownerId
            });

            const greenEarned = childPurchases.reduce((sum, p) => sum + (p.referrerBonus || 0), 0);

            // BFS to get 5 levels
            const tree: any = {
                root: rootAvatar,
                level1: [],
                level2: [],
                level3: [],
                level4: [],
                level5: [],
                totalPartners: 0,
                // Add earnings data
                earnings: {
                    greenEarned: Math.round(greenEarned * 100) / 100,
                    yellowEarned: rootAvatar.levelProgressionAccumulated || 0, // Use the actual accumulated value from the model
                    greenBalance: owner.greenBalance || 0,
                    yellowBalance: owner.yellowBalance || 0
                }
            };

            const queue: { avatar: any, level: number }[] = [{ avatar: rootAvatar, level: 0 }];
            const visited = new Set<string>();

            while (queue.length > 0) {
                const { avatar, level } = queue.shift()!;

                if (visited.has(avatar._id.toString())) continue;
                visited.add(avatar._id.toString());

                if (level > 0 && level <= 5) {
                    const key = `level${level}` as keyof typeof tree;
                    tree[key].push(avatar);
                    tree.totalPartners++;
                }

                if (level < 5 && avatar.partners && avatar.partners.length > 0) {
                    const partners = await Avatar.find({
                        _id: { $in: avatar.partners }
                    }).populate('owner', 'username');

                    for (const partner of partners) {
                        queue.push({ avatar: partner, level: level + 1 });
                    }
                }
            }

            res.json(tree);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
