import { Avatar, AvatarType, IAvatar } from '../models/Avatar';
import { User } from '../models/User';
import { AvatarPurchase } from '../models/AvatarPurchase';
import { Transaction, TransactionType } from '../models/Transaction';
import mongoose from 'mongoose';

// Avatar costs and subscription periods
const AVATAR_CONFIG = {
    BASIC: { cost: 20, subscriptionMonths: 1 },
    ADVANCED: { cost: 100, subscriptionMonths: 12 },
    PREMIUM: { cost: 1000, subscriptionMonths: null } // Lifetime
};

const PREMIUM_AVATAR_LIMIT = 25;

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
            newAvatar.level = parentAvatar.level + 1;

            parentAvatar.partners.push(newAvatar._id);
            await parentAvatar.save();
        }

        await newAvatar.save();
        return { parent: parentAvatar };
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
        const buyerUser = await User.findById(buyer);
        if (!buyerUser) return;

        const halfCost = cost / 2;

        // Green bonus to referrer (if exists and has subscription)
        if (buyerUser.referrer) {
            const referrer = await User.findById(buyerUser.referrer);
            if (referrer) {
                const hasSubscription = await this.hasActiveSubscription(referrer._id);

                if (hasSubscription) {
                    referrer.greenBalance = (referrer.greenBalance || 0) + halfCost;
                    await referrer.save();

                    // Log transaction
                    await Transaction.create({
                        user: referrer._id,
                        amount: halfCost,
                        type: TransactionType.AVATAR_BONUS,
                        description: `Green bonus: ${type} avatar purchase by ${buyerUser.username}`
                    });

                    // Log in purchase record
                    await AvatarPurchase.create({
                        buyer,
                        avatarId,
                        type,
                        cost,
                        referrerBonus: halfCost,
                        referrerId: referrer._id,
                        parentBonus: 0
                    });
                }
            }
        }

        // Yellow bonus to parent avatar owner
        if (parentAvatar) {
            const parentOwner = await User.findById(parentAvatar.owner);
            if (parentOwner) {
                parentOwner.yellowBalance = (parentOwner.yellowBalance || 0) + halfCost;
                await parentOwner.save();

                // Log transaction
                await Transaction.create({
                    user: parentOwner._id,
                    amount: halfCost,
                    type: TransactionType.AVATAR_BONUS,
                    description: `Yellow bonus: ${type} avatar placed under yours`
                });

                // Update purchase record
                await AvatarPurchase.findOneAndUpdate(
                    { avatarId },
                    {
                        parentBonus: halfCost,
                        parentAvatarId: parentAvatar._id,
                        parentOwnerId: parentOwner._id
                    }
                );
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

        // Check balance
        if ((user.greenBalance || 0) < config.cost) {
            return { success: false, error: 'Insufficient green balance' };
        }

        // Deduct cost
        user.greenBalance = (user.greenBalance || 0) - config.cost;
        await user.save();

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
            level: 1,
            isActive: true
        });

        // Place in matrix
        const { parent } = await this.placeAvatar(newAvatar, user.referrer);

        // Distribute bonuses
        await this.distributeBonus(userId, newAvatar._id, type, config.cost, parent);

        return { success: true, avatar: newAvatar };
    }
}
