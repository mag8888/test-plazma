import { GiftTemplate, IGiftItem } from '../models/GiftTemplate';
import { GiftInventory } from '../models/GiftInventory';
import { User, IUser } from '../models/User';
import { Avatar, AvatarType } from '../models/Avatar';
import mongoose from 'mongoose';

interface Riddle {
    question: string;
    answer: number;
    id: string; // Encryption of answer or temp ID
    expiresAt: number;
}

// Simple in-memory riddle store for MVP (Production should use Redis)
const activeRiddles = new Map<string, number>();

export class GiftsService {

    // --- ADMIN ---
    async createTemplate(data: any) {
        return await GiftTemplate.create(data);
    }

    async getTemplates(isAdmin: boolean = false) {
        const query = isAdmin ? {} : { isActive: true };
        return await GiftTemplate.find(query);
    }

    // --- USER: BUY ---
    async purchaseGift(userId: string, templateSlug: string) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const template = await GiftTemplate.findOne({ slug: templateSlug, isActive: true }).session(session);
            if (!template) throw new Error('Gift not found or inactive');

            const user = await User.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            // Check Balance
            // Logic depending on currency
            if (template.currency === 'GREEN') {
                if (user.greenBalance < template.price) throw new Error('Insufficient Green Balance');
                user.greenBalance -= template.price;
            } else if (template.currency === 'RED') {
                if (user.balanceRed < template.price) throw new Error('Insufficient Red Balance');
                user.balanceRed -= template.price;
            } else if (template.currency === 'TON') {
                // TODO: Implement TON external processing check here
                // For now, assume pre-paid or simulated
            }

            await user.save({ session });

            // Create Inventory Item
            const inventoryItem = await GiftInventory.create([{
                userId: user._id,
                templateId: template._id,
                status: 'CLOSED'
            }], { session });

            await session.commitTransaction();
            return inventoryItem[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getInventory(userId: string) {
        return await GiftInventory.find({ userId }).populate('templateId');
    }

    // --- USER: OPEN (STEP 1 - RIDDLE) ---
    async initOpen(inventoryId: string, userId: string): Promise<Riddle> {
        const item = await GiftInventory.findOne({ _id: inventoryId, userId, status: 'CLOSED' });
        if (!item) throw new Error('Box not found or already opened');

        // Generate Math Riddle
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 50) + 1;
        const operators = ['+', '-', '*'];
        const op = operators[Math.floor(Math.random() * (a * b > 100 ? 2 : 3))]; // Avoid multiply if too big? Keep it simple.

        // Simple logic
        const q = `${a} + ${b}`; // For MVP just Plus
        const ans = a + b;

        const riddleId = new mongoose.Types.ObjectId().toString();
        activeRiddles.set(riddleId, ans);

        // Auto-cleanup after 5 mins
        setTimeout(() => activeRiddles.delete(riddleId), 5 * 60 * 1000);

        return {
            question: `${a} + ${b} = ?`,
            answer: ans, // HIDE THIS IN PROD API RESPONSE! (Only for debug now if needed, but remove type)
            id: riddleId,
            expiresAt: Date.now() + 5 * 60 * 1000
        };
    }

    // --- USER: OPEN (STEP 2 - VERIFY & REWARD) ---
    async verifyAndOpen(inventoryId: string, userId: string, riddleId: string, answer: number) {
        // 1. Verify Riddle
        const correct = activeRiddles.get(riddleId);
        if (correct === undefined || correct !== answer) {
            throw new Error('Incorrect answer or riddle expired');
        }
        activeRiddles.delete(riddleId); // Consume riddle

        // 2. Open Box Logic
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const item = await GiftInventory.findOne({ _id: inventoryId, userId, status: 'CLOSED' })
                .populate('templateId')
                .session(session);

            if (!item) throw new Error('Box unavailable');
            const template = item.templateId as any; // Cast to IGiftTemplate

            // 3. Roll Item
            const wonItem = this.rollItem(template.items);

            // 4. Give Reward
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            let rewardDescription = '';

            if (wonItem.type === 'BALANCE_GREEN') {
                user.greenBalance += Number(wonItem.value);
                rewardDescription = `Green Balance: ${wonItem.value}`;
            } else if (wonItem.type === 'BALANCE_RED') {
                user.balanceRed += Number(wonItem.value);
                rewardDescription = `Red Balance: ${wonItem.value}`;
            } else if (wonItem.type === 'AVATAR') {
                // Determine avatar props
                const avatarType = wonItem.value as AvatarType;
                // Create Avatar
                await Avatar.create([{
                    owner: user._id,
                    type: avatarType,
                    cost: 0, // Gifted
                    isActive: true,
                    level: 0,
                    createdAt: new Date()
                }], { session });
                rewardDescription = `Avatar: ${avatarType}`;
            }

            await user.save({ session });

            // 5. Update Inventory
            item.status = 'OPENED';
            item.openedAt = new Date();
            item.reward = rewardDescription;
            await item.save({ session });

            await session.commitTransaction();
            return { success: true, reward: wonItem };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    private rollItem(items: IGiftItem[]): IGiftItem {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of items) {
            if (random < item.weight) return item;
            random -= item.weight;
        }
        return items[0]; // Fallback
    }
}
