
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Avatar } from '../models/Avatar';
import { User } from '../models/User';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });
        console.log('Connected to DB');

        const roman = await User.findOne({ username: 'roman_arctur' });
        const gemini = await User.findOne({ username: 'RomanGemini' });
        const mikhail = await User.findOne({ username: 'Mikhail9' });

        console.log(`\nUsers:`);
        console.log(`roman_arctur: ${roman?._id}`);
        console.log(`RomanGemini: ${gemini?._id}`);
        console.log(`Mikhail9: ${mikhail?._id}`);

        if (!roman || !gemini) return;

        // Check RomanGemini's Avatar
        const geminiAvatar = await Avatar.findOne({ owner: gemini._id }).populate('parent');
        console.log(`\nRomanGemini Avatar:`);
        console.log(`ID: ${geminiAvatar?._id}`);
        console.log(`Parent Avatar ID: ${geminiAvatar?.parent?._id}`);

        if (geminiAvatar?.parent) {
            const parentAvatar = await Avatar.findById(geminiAvatar.parent._id).populate('owner');
            const parentOwner = parentAvatar?.owner as any;
            console.log(`Parent Owner: ${parentOwner?.username} (${parentOwner?._id})`);
        }

        // Check Mikhail9's Avatar
        if (mikhail) {
            const mikhailAvatar = await Avatar.findOne({ owner: mikhail._id });
            console.log(`\nMikhail9 Avatar ID: ${mikhailAvatar?._id}`);
        }

        // Visualize roman_arctur's tree (BFS Order) to see why it picked Mikhail9
        console.log(`\n--- Tracing BFS for roman_arctur to find empty slot ---`);
        const root = await Avatar.findOne({ owner: roman._id, level: 0 }); // Assuming level 0 basic
        if (!root) { console.log('Root not found'); return; }

        const queue = [root];
        let found = false;
        let visited = 0;

        while (queue.length > 0) {
            const curr = queue.shift()!;
            visited++;

            // Check if this avatar corresponds to Mikhail9
            const currOwner = await User.findById(curr.owner);
            const isMikhail = currOwner?.username === 'Mikhail9';

            console.log(`Checking Node ${visited}: Owner=${currOwner?.username} (${curr._id}) - Partners: ${curr.partners.length}/3`);

            if (curr.partners.length < 3) {
                console.log(`>>> FOUND EMPTY SLOT at ${currOwner?.username} (${curr._id}) <<<`);
                // This is where a new spillover SHOULD go.
                // If this is Mikhail9, then working as intended (BFS).
                // If this is NOT Mikhail9, but Gemini went to Mikhail9, then logic is WRONG.
                if (isMikhail) console.log("MATCH: The logic correctly picked Mikhail9.");
                else console.log("MISMATCH: The logic should have picked this node, but Gemini is elsewhere.");

                // We can stop or continue to see where Mikhail is
                if (currOwner?.username === 'RomanGemini') {
                    console.log("WAIT, RomanGemini is already here?");
                }

                // If we found the slot where Gemini IS, we can check.
            }

            // Enqueue children
            const partners = await Avatar.find({ _id: { $in: curr.partners } });
            // We must enqueue in ORDER of partners array to match BFS
            // But map them correctly
            const partnerMap = new Map(partners.map(p => [p._id.toString(), p]));
            for (const pid of curr.partners) {
                const p = partnerMap.get(pid.toString());
                if (p) queue.push(p);
            }

            if (visited > 50) break; // Safety
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
