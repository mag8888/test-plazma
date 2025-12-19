import { Avatar, IAvatar } from '../models/Avatar';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { FinanceService } from './FinanceService';

export class MatrixService {

    // Place a new avatar in the tree
    static async placeAvatar(ownerId: string, tariff: string, referrerId?: string): Promise<IAvatar> {
        const owner = await User.findById(ownerId);
        if (!owner) throw new Error('Owner not found');

        // Create the new avatar
        const newAvatar = new Avatar({
            owner: ownerId,
            tariff,
            level: 0, // Starts at 0, "Guest" state equivalent for structure? Or Level 1? Spec says "Avatar ... starts working". Let's say Level 0 means "Just placed".
            partners: []
        });

        let parentAvatar: IAvatar | null = null;

        // Find placement
        if (referrerId) {
            // Find referrer's avatar (or global root if structure is shared?)
            // Assuming each user builds their own structure, but "System puts avatar under first unfilled in structure".
            // Usually this means Referrer's structure.
            const referrerUser = await User.findById(referrerId);
            if (referrerUser) {
                // Find referrer's active avatar (matching tariff? or any?)
                // Spec: "Subscription = Avatar".
                // Let's assume we look for the Referrer's oldest active avatar to place under.
                const referrerAvatar = await Avatar.findOne({ owner: referrerId, isActive: true }).sort({ createdAt: 1 });

                if (referrerAvatar) {
                    parentAvatar = await this.findFirstEmptySlot(referrerAvatar);
                }
            }
        }

        // If no parent found (e.g. no referrer or referrer has no avatar), place at root (null parent) or Admin?
        // For now, if no parent, it's a root node.

        if (parentAvatar) {
            newAvatar.parent = parentAvatar._id as mongoose.Types.ObjectId;
            parentAvatar.partners.push(newAvatar._id as mongoose.Types.ObjectId);
            await newAvatar.save();
            await parentAvatar.save();

            // Trigger generic level check upwards?
            await this.checkLevelUpRecursively(parentAvatar);
        } else {
            await newAvatar.save();
        }

        return newAvatar;
    }

    // BFS to find first node with < 3 partners
    static async findFirstEmptySlot(root: IAvatar): Promise<IAvatar> {
        const queue: IAvatar[] = [root];

        while (queue.length > 0) {
            const current = queue.shift()!;

            // Reload current to ensure partners are populated if needed? 
            // Assuming we need to fetch partners. The queue should store populated docs or we fetch.
            // Better: Fetch partners of current.
            const populatedCurrent = await Avatar.findById(current._id).populate('partners');
            if (!populatedCurrent) continue;

            if (populatedCurrent.partners.length < 3) {
                return populatedCurrent;
            }

            // Add partners to queue
            queue.push(...(populatedCurrent.partners as unknown as IAvatar[]));
        }

        return root; // Fallback, shouldn't happen if loop logic is right
    }

    // Recursive check for level updates
    static async checkLevelUpRecursively(avatar: IAvatar) {
        if (!avatar) return;

        // Reload to get fresh state
        const current = await Avatar.findById(avatar._id).populate('partners');
        if (!current) return;
        if (current.isLevel5Closed) return; // Already finished

        // Logic: To reach Level X, need 3 partners of Level X-1 (or same level? "3 partners of 4th level" -> Close 5th)
        // Interpret: To be Level 1, need 3 partners of Level 0.
        // To be Level 2, need 3 partners of Level 1.
        // ...
        // To be Level 5, need 3 partners of Level 4.

        const requiredLevel = current.level; // Partners must be at this level to push me up? 
        // Wait. If I am Level 0. I need 3 partners of Level 0 to become Level 1?
        // If so:
        // check partners.

        const validPartners = (current.partners as unknown as IAvatar[]).filter(p => p.level >= current.level);

        if (validPartners.length === 3) {
            // Level Up!
            current.level += 1;
            await current.save();

            console.log(`Avatar ${current._id} leveled up to ${current.level}`);

            if (current.level === 5) {
                current.isLevel5Closed = true;
                await current.save();
                await FinanceService.payoutLevel5(current);
            }

            // Recurse up
            if (current.parent) {
                const parent = await Avatar.findById(current.parent);
                if (parent) {
                    await this.checkLevelUpRecursively(parent);
                }
            }
        }
    }
}
