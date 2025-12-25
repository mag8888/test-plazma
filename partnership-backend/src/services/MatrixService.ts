import { Avatar, AvatarType, IAvatar } from '../models/Avatar';
import { User } from '../models/User';
import { AvatarPurchase } from '../models/AvatarPurchase';
import { Transaction, TransactionType } from '../models/Transaction';
import { LevelTransition } from '../models/LevelTransition';
import { WalletService, Currency } from './WalletService';
import { NotificationService } from './NotificationService';
import mongoose from 'mongoose';

// Avatar costs and subscription periods
const AVATAR_CONFIG = {
    BASIC: { cost: 20, subscriptionMonths: 1 },
    ADVANCED: { cost: 100, subscriptionMonths: 12 },
    PREMIUM: { cost: 1000, subscriptionMonths: null } // Lifetime
};

const PREMIUM_AVATAR_LIMIT = 25;

// Level progression yellow bonuses (per avatar reaching this level)
const LEVEL_BONUSES = [50, 100, 200, 400, 800]; // Levels 0→1, 1→2, 2→3, 3→4, 4→5

export class MatrixService {

    /**
     * Check if user has active subscription (any avatar with valid subscription)
     */
    static async hasActiveSubscription(userId: mongoose.Types.ObjectId): Promise<boolean> {
        const now = new Date();
        const activeAvatar = await Avatar.findOne({
            owner: userId,
            isActive: true,
            $or: [
                { subscriptionExpires: { $gt: now } }, // Not expired
                { subscriptionExpires: null } // Lifetime (PREMIUM)
            ]
        });
        return !!activeAvatar;
    }

    /**
     * Check premium avatar limit
     */
    static async checkPremiumLimit(): Promise<boolean> {
        const count = await Avatar.countDocuments({ type: AvatarType.PREMIUM, isActive: true });
        return count < PREMIUM_AVATAR_LIMIT;
    }

    /**
     * Find the "hungriest" parent avatar of the same type
     * (avatar with fewest children, prioritizing lower levels)
     */
    static async findHungryParent(type: AvatarType, excludeOwner?: mongoose.Types.ObjectId): Promise<IAvatar | null> {
        // Find all avatars of this type with less than 3 partners
        const candidates = await Avatar.find({
            type,
            isActive: true,
            owner: { $ne: excludeOwner },
            $expr: { $lt: [{ $size: "$partners" }, 3] }
        }).populate('owner').sort({ level: 1, 'partners': 1 });

        if (candidates.length === 0) return null;

        // Return the one with fewest partners (already sorted)
        return candidates[0];
    }

    /**
     * Place avatar in matrix
     * Priority: referrer's avatar of same type > hungry parent
     */
    static async placeAvatar(
        newAvatar: IAvatar,
        referrerId?: mongoose.Types.ObjectId
    ): Promise<{ parent: IAvatar | null }> {
        let parentAvatar: IAvatar | null = null;

        // Try to find referrer's avatar of same type
        if (referrerId) {
            parentAvatar = await Avatar.findOne({
                owner: referrerId,
                type: newAvatar.type,
                isActive: true,
                $expr: { $lt: [{ $size: "$partners" }, 3] } // Has space
            });
        }

        // If no referrer avatar or it's full, find hungry parent
        if (!parentAvatar) {
            parentAvatar = await this.findHungryParent(newAvatar.type, newAvatar.owner);
        }

        // Update relationships
        if (parentAvatar) {
            newAvatar.parent = parentAvatar._id;
            newAvatar.level = 0; // Always start at level 0

            parentAvatar.partners.push(newAvatar._id);
            await parentAvatar.save();

            // Check if parent can level up now
            await this.checkLevelProgression(parentAvatar);
        }

        await newAvatar.save();
        return { parent: parentAvatar };
    }

    /**
     * Calculate yellow bonus for a level transition
     */
    static calculateYellowBonus(fromLevel: number): number {
        return LEVEL_BONUSES[fromLevel] || 0;
    }

    /**
     * Check and trigger level progression for an avatar
     * Called after adding a new partner
     */
    /**
     * Check and trigger level progression for an avatar
     * Called after adding a new partner
     */
    static async checkLevelProgression(avatar: IAvatar, depth: number = 0): Promise<void> {
        // Prevent infinite recursion (limit to > 5 levels which is max tree height anyway)
        if (depth > 10) {
            console.error('Max recursion depth reached in checkLevelProgression', avatar._id);
            return;
        }

        try {
            // Count partners at avatar's current level
            const partners = await Avatar.find({
                _id: { $in: avatar.partners },
                level: avatar.level
            });

            // Need exactly 3 partners of same level to progress
            if (partners.length !== 3) return;

            const fromLevel = avatar.level;
            const toLevel = fromLevel + 1;
            const yellowBonus = this.calculateYellowBonus(fromLevel);
            const totalFromPartners = yellowBonus * 3;

            // Level 5 special case: all to owner as green
            if (toLevel === 5) {
                const owner = await User.findById(avatar.owner);
                if (owner) {
                    // Use WalletService for atomic/transactional deposit
                    await WalletService.deposit(
                        owner._id,
                        Currency.GREEN,
                        totalFromPartners,
                        `Level 5 closure: ${totalFromPartners}$ from avatar matrix completion`,
                        TransactionType.AVATAR_BONUS
                    );

                    // Log level transition
                    await LevelTransition.create({
                        avatar: avatar._id,
                        fromLevel,
                        toLevel,
                        yellowBonusSent: totalFromPartners,
                        ownerPayout: totalFromPartners
                    });
                }

                avatar.level = 5;
                avatar.isClosed = true;
                avatar.lastLevelUpAt = new Date();
                await avatar.save();

                return;
            }

            // Levels 0-4: distribute bonuses
            const owner = await User.findById(avatar.owner);
            if (!owner) return;

            const referrerBonus = totalFromPartners / 3; // 1/3 to referrer
            const progressionBonus = (totalFromPartners * 2) / 3; // 2/3 for progression

            // Pay referrer if has subscription
            if (owner.referrer) {
                const referrer = await User.findById(owner.referrer);
                if (referrer && await this.hasActiveSubscription(referrer._id)) {
                    await WalletService.deposit(
                        referrer._id,
                        Currency.GREEN,
                        referrerBonus,
                        `Referral bonus: level ${toLevel} progression of ${owner.username}'s avatar`,
                        TransactionType.AVATAR_BONUS
                    );
                }
            }

            // Accumulate progression bonus
            avatar.levelProgressionAccumulated = (avatar.levelProgressionAccumulated || 0) + progressionBonus;
            avatar.level = toLevel;
            avatar.lastLevelUpAt = new Date();
            await avatar.save();

            // Log transition
            await LevelTransition.create({
                avatar: avatar._id,
                fromLevel,
                toLevel,
                yellowBonusSent: totalFromPartners,
                referrerBonus: owner.referrer ? referrerBonus : 0
            });

            // Recursively check if parent can now level up
            if (avatar.parent) {
                const parentAvatar = await Avatar.findById(avatar.parent);
                if (parentAvatar) {
                    await this.checkLevelProgression(parentAvatar, depth + 1);
                }
            }
        } catch (error) {
            console.error('Error in checkLevelProgression:', error);
        }
    }

    /**
     * Distribute bonuses on avatar purchase
     * 50% green to referrer (if has subscription)
     * 50% yellow to parent avatar owner
     */
    static async distributeBonus(
        buyer: mongoose.Types.ObjectId,
        avatarId: mongoose.Types.ObjectId,
        type: AvatarType,
        cost: number,
        parentAvatar: IAvatar | null
    ): Promise<void> {
        console.log(`[DistributeBonus] Buyer: ${buyer}, Avatar: ${avatarId}, Type: ${type}, Cost: ${cost}`);

        const buyerUser = await User.findById(buyer);
        if (!buyerUser) return;

        const halfCost = cost / 2;
        let referrerBonusSent = 0;
        let referrerId = null;

        // 1. Green bonus to referrer (if exists and has subscription)
        if (buyerUser.referrer) {
            const referrer = await User.findById(buyerUser.referrer);
            if (referrer) {
                referrerId = referrer._id;
                const hasSubscription = await this.hasActiveSubscription(referrer._id);

                import { NotificationService } from './NotificationService';

                // ... existing code ...

                if (hasSubscription) {
                    await WalletService.deposit(
                        referrer._id,
                        Currency.GREEN,
                        halfCost,
                        `Green bonus: ${type} avatar purchase by ${buyerUser.username}`,
                        TransactionType.AVATAR_BONUS
                    );
                    referrerBonusSent = halfCost;

                    // Send Telegram Notification
                    if (referrer.telegram_id) {
                        // Non-blocking notification
                        NotificationService.sendIncomeNotification(referrer.telegram_id, halfCost, buyerUser.username || 'Unknown').catch(e => console.error('Failed to send notification', e));
                    }

                } else {
                    console.log(`[DistributeBonus] Referrer ${referrer.username} has no subscription. Skipping bonus.`);
                }
            }
        } else {
            // COMPANY ACCOUNT FALLBACK
            // If user has no referrer, the 50% Green Balance goes to Company Account
            const COMPANY_ACCOUNT_ID = process.env.COMPANY_ACCOUNT_ID;
            if (COMPANY_ACCOUNT_ID) {
                try {
                    await WalletService.deposit(
                        COMPANY_ACCOUNT_ID,
                        Currency.GREEN,
                        halfCost,
                        `Green bonus (Company Fallback): ${type} avatar purchase by ${buyerUser.username}`,
                        TransactionType.AVATAR_BONUS
                    );
                } catch (e) {
                    console.error(`Failed to deposit to Company Account (${COMPANY_ACCOUNT_ID}):`, e);
                }
            }
        }

        // 2. Logging Purchase Record (Always create it to track purchase)
        try {
            await AvatarPurchase.create({
                buyer,
                avatarId,
                type,
                cost,
                referrerBonus: referrerBonusSent,
                referrerId: referrerId, // can be null
                parentBonus: 0 // Will be updated below
            });
        } catch (e) {
            console.error('[DistributeBonus] Failed to create AvatarPurchase record:', e);
        }

        // 3. Yellow bonus to parent avatar owner
        if (parentAvatar) {
            const parentOwner = await User.findById(parentAvatar.owner);
            if (parentOwner) {
                try {
                    await WalletService.deposit(
                        parentOwner._id,
                        Currency.YELLOW,
                        halfCost,
                        `Yellow bonus: ${type} avatar placed under yours`,
                        TransactionType.AVATAR_BONUS
                    );

                    // Update purchase record
                    await AvatarPurchase.findOneAndUpdate(
                        { avatarId },
                        {
                            parentBonus: halfCost,
                            parentAvatarId: parentAvatar._id,
                            parentOwnerId: parentOwner._id
                        }
                    );
                } catch (e) {
                    console.error('[DistributeBonus] Failed to distribute yellow bonus:', e);
                }
            }
        }
    }

    /**
     * Purchase avatar
     */
    static async purchaseAvatar(
        userId: mongoose.Types.ObjectId,
        type: AvatarType
    ): Promise<{ success: boolean; error?: string; avatar?: IAvatar }> {
        const config = AVATAR_CONFIG[type];
        const user = await User.findById(userId);

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // Check premium limit
        if (type === AvatarType.PREMIUM) {
            const canPurchase = await this.checkPremiumLimit();
            if (!canPurchase) {
                return { success: false, error: 'Premium avatar limit reached (25 max)' };
            }
        }

        // Charge balance
        try {
            await WalletService.charge(userId, Currency.GREEN, config.cost, `Purchase ${type} avatar`);
        } catch (e: any) {
            return { success: false, error: e.message };
        }

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
            cost: config.cost,
            subscriptionExpires,
            level: 0, // Start at level 0
            isActive: true
        });

        // Place in matrix
        const { parent } = await this.placeAvatar(newAvatar, user.referrer);

        // Distribute bonuses
        await this.distributeBonus(userId, newAvatar._id, type, config.cost, parent);

        return { success: true, avatar: newAvatar };
    }
}
