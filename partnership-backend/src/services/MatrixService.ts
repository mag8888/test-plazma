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
     * (Oldest active avatar with < 3 partners)
     */
    static async findHungryParent(type: AvatarType, excludeOwner?: mongoose.Types.ObjectId): Promise<IAvatar | null> {
        // Find all avatars of this type with less than 3 partners
        // Sort by createdAt ASC (Oldest first) to fill from top/root down
        const candidates = await Avatar.find({
            type,
            isActive: true,
            owner: { $ne: excludeOwner },
            $expr: { $lt: [{ $size: "$partners" }, 3] }
        }).sort({ createdAt: 1 });

        if (candidates.length === 0) return null;

        // Return the oldest one
        return candidates[0];
    }

    /**
     * Place avatar in matrix
     * Priority: 
     * 1. Referrer's avatar of same type (if not full)
     * 2. Hungriest Parent (Oldest with space)
     */
    static async placeAvatar(
        newAvatar: IAvatar,
        referrerId?: mongoose.Types.ObjectId
    ): Promise<{ parent: IAvatar | null }> {
        let parentAvatar: IAvatar | null = null;

        // Try to find referrer's avatar of same type
        if (referrerId) {
            // Find Older Referrer Avatars first
            parentAvatar = await Avatar.findOne({
                owner: referrerId,
                type: newAvatar.type,
                isActive: true,
                $expr: { $lt: [{ $size: "$partners" }, 3] } // Has space
            }).sort({ createdAt: 1 }); // If referrer has multiple, fill oldest
        }

        // If no referrer avatar or it's full, find hungry parent (Spillover)
        if (!parentAvatar) {
            parentAvatar = await this.findHungryParent(newAvatar.type, newAvatar.owner);
        }

        // Update relationships
        if (parentAvatar) {
            newAvatar.parent = parentAvatar._id;
            newAvatar.level = 0; // Always start at level 0

            // Add to parent
            parentAvatar.partners.push(newAvatar._id);
            await parentAvatar.save();
        }

        await newAvatar.save();
        return { parent: parentAvatar };
    }

    /**
     * Distribute bonuses on avatar purchase
     * 50% green to direct inviter (User.referrer)
     * 50% yellow to Matrix Parent Avatar (Accumulation)
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
        let referrerBonusSent = 0;
        let referrerId: mongoose.Types.ObjectId | null = null;

        // 1. Green bonus to DIRECT Referrer (User who invited the buyer)
        if (buyerUser.referrer) {
            const referrer = await User.findById(buyerUser.referrer);
            if (referrer) {
                referrerId = referrer._id;
                // Only pay if referrer has active subscription (Any avatar)
                const hasSubscription = await this.hasActiveSubscription(referrer._id);

                if (hasSubscription) {
                    await WalletService.deposit(
                        referrer._id,
                        Currency.GREEN,
                        halfCost,
                        `Green bonus: ${type} avatar purchase by ${buyerUser.username}`,
                        TransactionType.AVATAR_BONUS
                    );
                    referrerBonusSent = halfCost;

                    // Notification
                    if (referrer.telegram_id) {
                        NotificationService.sendIncomeNotification(referrer.telegram_id, halfCost, buyerUser.username || 'Unknown').catch(console.error);
                    }
                }
            }
        }

        // 2. Yellow bonus to MATRIX Parent (Avatar accumulation)
        let parentBonusSent = 0;
        let parentOwnerId: mongoose.Types.ObjectId | null = null;

        if (parentAvatar) {
            const parentOwner = await User.findById(parentAvatar.owner);
            if (parentOwner) {
                parentOwnerId = parentOwner._id;

                // Add to Avatar's Yellow Balance (Accumulation)
                parentAvatar.yellowBalance = (parentAvatar.yellowBalance || 0) + halfCost;
                await parentAvatar.save();
                parentBonusSent = halfCost;

                // Check Level Progression for Parent (Since verification is balance-driven + partner-driven)
                // Actually, the trigger is usually strictly "3 partners", and the balance should match.
                // 3 partners * 50% = 150% cost.
                // Required for Level 0->1 is exactly 150% cost.
                await this.checkLevelProgression(parentAvatar);
            }

            // Log Transaction for Matrix Parent (Yellow Bonus)
            if (parentOwnerId) {
                await Transaction.create({
                    user: parentOwnerId,
                    amount: halfCost,
                    currency: 'YELLOW',
                    type: TransactionType.AVATAR_BONUS,
                    description: `Yellow bonus: ${type} avatar placed under yours by ${buyerUser.username}`
                });
            }
        }

        // 3. Log Purchase
        try {
            await AvatarPurchase.create({
                buyer,
                avatarId,
                type,
                cost,
                referrerBonus: referrerBonusSent,
                referrerId: referrerId,
                parentBonus: parentBonusSent,
                parentAvatarId: parentAvatar?._id,
                parentOwnerId: parentOwnerId
            });
        } catch (e) { console.error(e); }
    }

    /**
     * Calculate required balance to transition FROM level
     * Level 0->1: Cost/2 * 3
     * Level 1->2: (PreviousKeep) * 3
     */
    static getRequiredBalanceForLevel(type: AvatarType, currentLevel: number): number {
        const config = AVATAR_CONFIG[type];
        const baseInput = config.cost / 2; // Initial Yellow Input ($50 for $100 avatar)

        // Formula: Required = baseInput * 3 * (2^currentLevel)
        // L0: 50 * 3 * 1 = 150
        // L1: 50 * 3 * 2 = 300
        // L2: 50 * 3 * 4 = 600
        return baseInput * 3 * Math.pow(2, currentLevel);
    }

    /**
     * Check and trigger level progression
     * Triggered when Avatar receives funds/partners
     */
    static async checkLevelProgression(avatar: IAvatar, depth: number = 0): Promise<void> {
        if (depth > 10) return; // Safety

        // Requirement: 3 Partners (Implied by balance usually, but let's check strict count if we want)
        // Actually, sometimes balance might come from elsewhere? No, closed system.
        // But let's check partner count to be safe and consistent with "3 partners".
        if (avatar.partners.length < 3) return; // Not full yet

        const requiredBalance = this.getRequiredBalanceForLevel(avatar.type, avatar.level);

        // Check funds
        if (avatar.yellowBalance < requiredBalance) {
            // Should not happen if logic is tight, but return if insufficient
            return;
        }

        // Ready to Level Up
        const totalPot = requiredBalance; // Use exact amount
        const fromLevel = avatar.level;
        const toLevel = fromLevel + 1;

        // Level 5 Closure (4->5)
        if (toLevel === 5) {
            // All goes to Owner
            const owner = await User.findById(avatar.owner);
            if (owner) {
                await WalletService.deposit(
                    owner._id,
                    Currency.GREEN,
                    totalPot,
                    `Level 5 Closure: Avatar ${avatar._id} completed matrix`,
                    TransactionType.AVATAR_BONUS
                );
            }

            avatar.level = 5;
            avatar.isClosed = true;
            avatar.yellowBalance -= totalPot; // Deduct used funds
            avatar.lastLevelUpAt = new Date();
            await avatar.save();
            return;
        }

        // Standard Transition (0->1, 1->2, ... 3->4)
        // Split: 1/3 Green to Inviter, 2/3 Yellow to Parent
        const greenPart = totalPot / 3;
        const yellowPart = (totalPot * 2) / 3;

        const owner = await User.findById(avatar.owner);
        if (!owner) return;

        // 1. Green Bonus -> Inviter of the Avatar Owner
        if (owner.referrer) {
            const referrer = await User.findById(owner.referrer);
            if (referrer) { // Check subscription?
                const hasSub = await this.hasActiveSubscription(referrer._id);
                if (hasSub) {
                    await WalletService.deposit(
                        referrer._id,
                        Currency.GREEN,
                        greenPart,
                        `Referral Bonus: ${owner.username}'s avatar Level ${fromLevel}->${toLevel}`,
                        TransactionType.AVATAR_BONUS
                    );

                    if (referrer.telegram_id) {
                        NotificationService.sendIncomeNotification(referrer.telegram_id, greenPart, owner.username || 'Unknown').catch(console.error);
                    }
                }
            }
        }

        // 2. Yellow Bonus -> Parent Avatar
        if (avatar.parent) {
            const parentAvatar = await Avatar.findById(avatar.parent);
            if (parentAvatar) {
                // Pass funds up
                parentAvatar.yellowBalance = (parentAvatar.yellowBalance || 0) + yellowPart;
                await parentAvatar.save();

                // Check Parent Progression
                await this.checkLevelProgression(parentAvatar, depth + 1);
            }
        }

        // 3. Update Current Avatar
        avatar.level = toLevel;
        avatar.yellowBalance -= totalPot; // Deduct the pot consumed
        avatar.lastLevelUpAt = new Date();
        await avatar.save();

        // Log
        try {
            await LevelTransition.create({
                avatar: avatar._id,
                fromLevel,
                toLevel,
                yellowBonusSent: yellowPart,
                referrerBonus: greenPart
            });
        } catch (e) { console.error(e); }
    }


    /**
     * Purchase avatar (Entry Point)
     */
    static async purchaseAvatar(
        userId: mongoose.Types.ObjectId,
        type: AvatarType
    ): Promise<{ success: boolean; error?: string; avatar?: IAvatar }> {
        const config = AVATAR_CONFIG[type];
        const user = await User.findById(userId);

        if (!user) return { success: false, error: 'User not found' };

        // Check premium limit
        if (type === AvatarType.PREMIUM) {
            if (!(await this.checkPremiumLimit())) {
                return { success: false, error: 'Premium avatar limit reached' };
            }
        }

        // Charge Wallet
        try {
            await WalletService.charge(userId, Currency.GREEN, config.cost, `Purchase ${type} avatar`);
        } catch (e: any) {
            return { success: false, error: e.message };
        }

        // Create
        let subscriptionExpires: Date | null = null;
        if (config.subscriptionMonths) {
            subscriptionExpires = new Date();
            subscriptionExpires.setMonth(subscriptionExpires.getMonth() + config.subscriptionMonths);
        }

        const newAvatar = new Avatar({
            owner: userId,
            type,
            cost: config.cost,
            subscriptionExpires,
            level: 0,
            yellowBalance: 0,
            isActive: true
        });

        // Place
        const { parent } = await this.placeAvatar(newAvatar, user.referrer);

        // Distribute Initial Bonus
        await this.distributeBonus(userId, newAvatar._id, type, config.cost, parent);

        return { success: true, avatar: newAvatar };
    }
}
