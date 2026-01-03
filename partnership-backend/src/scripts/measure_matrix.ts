
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Avatar } from '../models/Avatar';
import { User } from '../models/User';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!, { dbName: 'moneo' });
        console.log('Connected to DB');

        const rootId = '694cd2da0430b0422b279278'; // Use the Root ID from previous debug
        // Or find the user's root
        // const user = await User.findOne({ username: 'roman_arctur' });
        // const root = await Avatar.findOne({ owner: user._id, level: 0 });

        console.time('MatrixBFS');

        const rootAvatar = await Avatar.findById(rootId);
        if (!rootAvatar) { console.log('Root not found'); return; }

        let treeSize = 0;
        const queue: { avatar: any, level: number }[] = [{ avatar: rootAvatar, level: 0 }];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const { avatar, level } = queue.shift()!;

            if (visited.has(avatar._id.toString())) continue;
            visited.add(avatar._id.toString());
            treeSize++;

            if (level < 5 && avatar.partners && avatar.partners.length > 0) {
                // Determine query time
                // console.time(`Query-L${level}-${avatar._id}`);
                const partners = await Avatar.find({
                    _id: { $in: avatar.partners }
                }).lean(); // Use lean for speed simulation
                // console.timeEnd(`Query-L${level}-${avatar._id}`);

                for (const partner of partners) {
                    queue.push({ avatar: partner, level: level + 1 });
                }
            }
        }

        console.timeEnd('MatrixBFS');
        console.log(`Total Nodes Processed: ${treeSize}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
