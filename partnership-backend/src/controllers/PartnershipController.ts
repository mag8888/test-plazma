import { Request, Response } from 'express';
import { MatrixService } from '../services/MatrixService';
import { FinanceService } from '../services/FinanceService';
import { User } from '../models/User';
import { Avatar, AvatarType } from '../models/Avatar';
import { AvatarPurchase } from '../models/AvatarPurchase';
import { Transaction, TransactionType } from '../models/Transaction';
import mongoose from 'mongoose';

const TARIFF_PRICES = {
    BASIC: 20,
    ADVANCED: 100,
    PREMIUM: 1000
};

export class PartnershipController {

    // ... (Existing methods omitted for brevity, keeping only changes where needed) ...

    static async getTree(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const userAvatars = await Avatar.find({ owner: userId }).populate({
                path: 'partners',
                populate: { path: 'partners' }
            });
            res.json(userAvatars);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getStats(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            let user = await User.findById(userId).populate('referrer', 'username');

            if (!user && !isNaN(Number(userId))) {
                user = await User.findOne({ telegram_id: Number(userId) }).populate('referrer', 'username');
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            const avatarCount = await Avatar.countDocuments({ owner: user._id, isActive: true });

            // Calculate Tariff
            const bestAvatar = await Avatar.findOne({ owner: user._id, isActive: true })
                .sort({ cost: -1 }); // PREMIUM(1000) > ADVANCED(100) > BASIC(20)

            const tariff = bestAvatar ? bestAvatar.type : 'GUEST';

            res.json({
                username: user.username,
                photoUrl: user.photo_url,
                registrationDate: user.createdAt,
                referrer: user.referrer ? (user.referrer as any).username : null,
                greenBalance: user.greenBalance,
                yellowBalance: user.yellowBalance,
                balanceRed: user.balanceRed,
                rating: user.rating,
                gamesPlayed: user.gamesPlayed,
                wins: user.wins,
                referralsCount: user.referralsCount,
                avatarCount,
                tariff // Return calculated tariff
            });
        } catch (error: any) {
            console.error('[getStats] Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // ... (withdraw is fine) ...

    // ... (createUser is fine) ...

    static async getPartners(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            let user;

            if (mongoose.Types.ObjectId.isValid(userId)) {
                user = await User.findById(userId);
            }

            if (!user && !isNaN(Number(userId))) {
                user = await User.findOne({ telegram_id: Number(userId) });
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            let referrals = await User.find({ referrer: user._id }).lean();

            // ... (Rest of logic is same, but using Resolved user._id) ...

            if (referrals.length < (user.referralsCount || 0)) {
                // ... (Fallback logic) ...
                const fallbackReferrals = await User.find({
                    referrer: { $exists: false },
                    $or: [
                        { referredBy: user.username },
                        { referredBy: { $regex: new RegExp(`^${user.username}$`, 'i') } },
                        { referredBy: String(user.telegram_id) },
                        { referredBy: String(user._id) }
                    ]
                });
                if (fallbackReferrals.length > 0) {
                    // ... repair logic ...
                    referrals = [...referrals, ...fallbackReferrals.map(r => r.toObject())] as any;
                }
            }

            const result = [];
            for (const ref of referrals) {
                const refUser = ref as any;
                const bestAvatar = await Avatar.findOne({ owner: refUser._id, isActive: true })
                    .sort({ level: -1 }).lean();

                // IMPROVED SEARCH: Look for Username in description (Direct Bonus, Level Bonus, Yellow Bonus)
                const bonuses = await Transaction.find({
                    user: user._id,
                    description: { $regex: new RegExp(refUser.username, 'i') }
                }).lean();

                let green = 0;
                let yellow = 0;
                let red = 0;

                for (const tx of bonuses) {
                    const type = tx.type as string;
                    if (type === TransactionType.BONUS_GREEN || (type === 'AVATAR_BONUS' && tx.currency === 'GREEN')) green += tx.amount;
                    if (type === TransactionType.BONUS_YELLOW || (type === 'AVATAR_BONUS' && tx.currency === 'YELLOW')) yellow += tx.amount;

                    // Red Balance Logic Audit:
                    if (tx.currency === 'balanceRed' || type === 'GAME_WIN' || type === 'REFERRAL_REWARD') {
                        red += tx.amount;
                    }
                }

                result.push({
                    _id: refUser._id,
                    username: refUser.username,
                    firstName: refUser.first_name,
                    telegramId: refUser.telegram_id,
                    avatarType: bestAvatar?.type || (!bestAvatar && refUser.isMaster ? 'MASTER' : 'GUEST'), // Fallback if matrix avatar missing but legacy flag exists
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

    // ...

    static async getMyAvatars(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            let targetId = userId;

            // Resolve Telegram ID if needed
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                const u = await User.findOne({ telegram_id: Number(userId) });
                if (u) targetId = u._id.toString();
                else if (!isNaN(Number(userId))) return res.json({ avatars: [] }); // User not found
            }

            const avatars = await Avatar.find({
                owner: targetId,
                isActive: true
            }).populate('parent').sort({ createdAt: -1 });

            // Aggregation to get earnings (Optional, fail-safe)
            const avatarIds = avatars.map(a => a._id);
            let earningsMap = new Map();

            try {
                if (avatarIds.length > 0) {
                    const earnings = await AvatarPurchase.aggregate([
                        {
                            $match: {
                                parentAvatarId: { $in: avatarIds }
                            }
                        },
                        {
                            $group: {
                                _id: '$parentAvatarId',
                                yellowEarned: { $sum: '$parentBonus' },
                                greenEarned: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ['$referrerId', new mongoose.Types.ObjectId(targetId as string)] },
                                            '$referrerBonus',
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ]);
                    earnings.forEach(e => earningsMap.set(e._id.toString(), e));
                }
            } catch (aggError) {
                console.error('[getMyAvatars] Aggregation failed:', aggError);
                // Continue without earnings data
            }

            const now = new Date();
            const avatarsWithStatus = avatars.map(avatar => {
                const earn = earningsMap.get(avatar._id.toString()) || { yellowEarned: 0, greenEarned: 0 };
                return {
                    ...avatar.toObject(),
                    hasActiveSubscription: !avatar.subscriptionExpires || avatar.subscriptionExpires > now,
                    earnedGreen: earn.greenEarned,
                    earnedYellow: earn.yellowEarned
                };
            });

            res.json({ avatars: avatarsWithStatus });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async withdraw(req: Request, res: Response) {
        try {
            const { userId, amount, walletAddress } = req.body;
            if (!userId || !amount || !walletAddress) return res.status(400).json({ error: 'Missing fields: userId, amount, walletAddress' });

            const result = await FinanceService.processWithdrawal(userId, amount, walletAddress);
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async createUser(req: Request, res: Response) {
        try {
            const { telegramId, username, referrerId } = req.body;
            let user = await User.findOne({ telegram_id: telegramId });

            if (user) {
                if (username && user.username !== username) {
                    user.username = username;
                    await user.save();
                }
                return res.json(user);
            }

            try {
                user = await User.create({
                    telegram_id: telegramId,
                    username,
                    referrer: referrerId
                });
                return res.json(user);
            } catch (createError: any) {
                if (createError.code === 11000 || createError.message.includes('E11000')) {
                    const existing = await User.findOne({ telegram_id: telegramId });
                    if (existing) return res.json(existing);

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

    static async getPublicStats(req: Request, res: Response) {
        try {
            const { telegramId } = req.params;
            const user = await User.findOne({ telegram_id: Number(telegramId) });

            if (!user) {
                return res.json({ tariff: 'GUEST', level: 0, partners: 0 });
            }

            const avatars = await Avatar.find({ owner: user._id, isActive: true }).lean();
            let bestAvatar: any = null;
            let maxPrice = -1;

            for (const av of avatars) {
                const p = av.cost || 0;
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
                partners: bestAvatar.partners?.length || 0
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getGlobalStats(req: Request, res: Response) {
        try {
            const users = await User.countDocuments();
            res.json({
                users,
                debug: {
                    dbName: mongoose.connection.name,
                    host: process.env.RAILWAY_SERVICE_NAME || 'local'
                }
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }



    static async purchaseAvatar(req: Request, res: Response) {
        try {
            console.log('[PartnershipController] purchaseAvatar req.body:', req.body);
            const { userId, type } = req.body;

            if (!userId || !type) {
                return res.status(400).json({ error: 'userId and type are required' });
            }

            let targetUserId = userId;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                const userByTg = await User.findOne({ telegram_id: userId });
                if (userByTg) {
                    targetUserId = userByTg._id.toString();
                    console.log(`[PartnershipController] Resolved Telegram ID ${userId} to ObjectId ${targetUserId}`);
                } else {
                    return res.status(400).json({ error: 'Invalid user ID format and user not found by Telegram ID' });
                }
            }

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

    static async getAvatarMatrix(req: Request, res: Response) {
        try {
            const { avatarId } = req.params;

            console.time(`MatrixLoad-${avatarId}`);
            const rootAvatar = await Avatar.findById(avatarId).populate('owner', 'username greenBalance yellowBalance');
            if (!rootAvatar) {
                return res.status(404).json({ error: 'Avatar not found' });
            }

            const owner = rootAvatar.owner as any;
            const ownerId = owner._id || rootAvatar.owner;

            const childPurchases = await AvatarPurchase.find({
                parentAvatarId: avatarId,
                referrerId: ownerId
            });

            const greenEarned = childPurchases.reduce((sum, p) => sum + (p.referrerBonus || 0), 0);

            const tree: any = {
                root: rootAvatar,
                level1: [],
                level2: [],
                level3: [],
                level4: [],
                level5: [],
                totalPartners: 0,
                earnings: {
                    greenEarned: Math.round(greenEarned * 100) / 100,
                    yellowEarned: rootAvatar.yellowBalance || 0,
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
                    }).populate('owner', 'username referrer');

                    for (const partner of partners) {
                        queue.push({ avatar: partner, level: level + 1 });
                    }
                }
            }

            console.timeEnd(`MatrixLoad-${avatarId}`);
            res.json(tree);
        } catch (error: any) {
            console.error('Matrix Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
