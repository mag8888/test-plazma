
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';
import dotenv from 'dotenv';
import path from 'path';

// Load ENV specifically from partner backend to get MONGO_URL
dotenv.config({ path: path.resolve(__dirname, '../../partnership-backend/.env') });

const MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function run() {
    console.log("Connecting to:", MONGO_URL);
    await mongoose.connect(MONGO_URL, { dbName: 'test' });

    console.log("\n--- USER: SvetaSvetlanaRodionova ---");
    const sveta = await User.findOne({ username: 'SvetaSvetlanaRodionova' });
    if (!sveta) {
        console.log("User NOT FOUND");
    } else {
        console.log(`ID: ${sveta._id}`);
        console.log(`Created: ${sveta.createdAt}`);
        console.log(`Referrer: ${sveta.referrer}`);
        console.log(`RefBy: ${sveta.referredBy}`);

        const avatars = await Avatar.find({ owner: sveta._id });
        console.log(`Avatars: ${avatars.length}`);
        avatars.forEach(a => console.log(` - ID: ${a._id}, Type: ${a.type}, Active: ${a.isActive}, Created: ${a.createdAt}`));
    }

    console.log("\n--- USER: izobilioner ---");
    const izo = await User.findOne({ username: 'izobilioner' });
    if (!izo) {
        console.log("User NOT FOUND");
    } else {
        console.log(`ID: ${izo._id}`);
        console.log(`Created: ${izo.createdAt}`);

        const avatars = await Avatar.find({ owner: izo._id });
        console.log(`Avatars: ${avatars.length}`);
        avatars.forEach(a => console.log(` - ID: ${a._id}, Type: ${a.type}, Partners: ${a.partners.length}`));

        if (avatars.length > 0) {
            console.log("\n--- PARTNERS of izobilioner ---");
            const partners = await Avatar.find({ _id: { $in: avatars[0].partners } }).populate('owner');
            partners.forEach((p: any) => {
                console.log(`User: ${p.owner?.username}, Created: ${p.createdAt}`);
            });
        }
    }

    process.exit(0);
}

run().catch(console.error);
