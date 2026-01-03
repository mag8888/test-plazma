
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'partnership-backend/.env') });

import mongoose from 'mongoose';
import { connectDB } from '../db'; // Adjust path if needed
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';
import { Transaction } from '../models/Transaction';
import { LevelTransition } from '../models/LevelTransition';

async function run() {
    await connectDB();

    const username = 'SvetaSvetlanaRodionova';
    const user = await User.findOne({ username });

    if (!user) {
        console.error('User not found');
        process.exit(1);
    }

    console.log(`Checking user: ${username} (${user._id})`);

    const avatar = await Avatar.findOne({ owner: user._id, type: 'ADVANCED', isActive: true });
    if (!avatar) {
        console.error('Active ADVANCED avatar not found');
        process.exit(1);
    }

    console.log(`Avatar: ${avatar._id}`);
    console.log(`  Level: ${avatar.level}`);
    console.log(`  Yellow Balance: ${avatar.yellowBalance}`);
    console.log(`  Partners Count: ${avatar.partners.length}`);

    // Check Partners
    console.log('\n--- Partners ---');
    if (avatar.partners.length > 0) {
        const partners = await Avatar.find({ _id: { $in: avatar.partners } }).populate('owner');
        for (const p of partners) {
            const ownerName = (p.owner as any).username;
            console.log(`  Partner ${ownerName} (${p._id}) - Level: ${p.level}`);
        }
    }

    console.log('\n--- Child Upgrades (Potential Income) ---');
    const partnerIds = avatar.partners;
    const transitions = await LevelTransition.find({
        avatar: { $in: partnerIds },
        fromLevel: 0 // Upgrading from 0 to 1
    }).populate('avatar');

    for (const t of transitions) {
        const p = t.avatar as any;
        console.log(`  Child Upgrade: Avatar ${p._id} went L${t.fromLevel}->L${t.toLevel}. Yellow Bonus Sent: ${t.yellowBonusSent}`);
    }

    process.exit(0);
}

run();
