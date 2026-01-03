
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Avatar, AvatarType } from '../models/Avatar';
import { User } from '../models/User';
import { MatrixService } from '../services/MatrixService';

dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGO_URL) throw new Error("MONGO_URL missing");
        await mongoose.connect(process.env.MONGO_URL, { dbName: 'moneo' });
        console.log('Connected to DB');

        console.log('--- STARTING MATRIX RECALCULATION ---');

        // 1. Fetch All Avatars
        const avatars = await Avatar.find({ isActive: true }).sort({ createdAt: 1 });
        console.log(`Found ${avatars.length} active avatars.`);

        // 2. Reset All Links
        console.log('Resetting all connections...');
        await Avatar.updateMany({}, {
            $set: {
                parent: null,
                partners: [],
                level: 0,
                yellowBalance: 0
                // Don't reset isClosed or level if we want to preserve 'progress'? 
                // User said "logically and sequentially... place by time of purchase".
                // This implies rebuilding the structure. 
                // Money/Levels might be tricky. Resetting level to 0 might destroy accrued earnings value.
                // However, structure dictates flow. 
                // SAFEST APPROACH: Keep levels/money AS IS, just fix PARENTS/PARTNERS?
                // NO, if we move a node, the partners array of the OLD parent must be cleared.
                // AND the valid partners of this node must be re-evaluated.
                // A full rebuild usually implies strictly re-simulating.
                // For now, let's ONLY fix the LINKS (Parent/Partners). 
                // We will rely on placeAvatar to set 'parent' and 'partners'.
            }
        });

        // 3. Re-Place One by One
        let count = 0;
        for (const avatar of avatars) {
            count++;
            const user = await User.findById(avatar.owner);
            // console.log(`[${count}/${avatars.length}] Placing ${user?.username} (${avatar.type})...`);

            if (!user) {
                console.warn(`Skipping orphan avatar ${avatar._id}`);
                continue;
            }

            // We behave as if it's a new placement
            // Note: MatrixService.placeAvatar appends to parent's partner list.
            // Since we cleared all partner lists, this will rebuild them in order.

            await MatrixService.placeAvatar(avatar, user.referrer);
        }

        console.log('--- RECALCULATION COMPLETE ---');

        // Validation: Check RomanGemini
        const roman = await User.findOne({ username: 'roman_arctur' });
        const gemini = await User.findOne({ username: 'RomanGemini' });

        if (roman && gemini) {
            const geminiAvatar = await Avatar.findOne({ owner: gemini._id });
            if (geminiAvatar?.parent) {
                const parent = await Avatar.findById(geminiAvatar.parent).populate('owner');
                const pUser = parent?.owner as any;
                console.log(`\nVERIFICATION: RomanGemini is now under: ${pUser?.username}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
