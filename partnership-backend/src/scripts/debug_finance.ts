
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Avatar } from '../models/Avatar';
import { Transaction } from '../models/Transaction';
import dotenv from 'dotenv';
import path from 'path';

// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function run() {
    console.log(`🔌 Connecting to DB: ${LOCAL_MONGO_URL} (dbName: test)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'test' });

    // 1. Transaction Types Count
    console.log("\n--- Transaction Types ---");
    const types = await Transaction.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } }
    ]);
    console.table(types);

    // 2. Sample Deductions
    console.log("\n--- Sample Expenditures (Negative Amounts) ---");
    const expenditures = await Transaction.find({ amount: { $lt: 0 } }).limit(5);
    if (expenditures.length === 0) {
        console.log("❌ NO EXPENDITURES FOUND! (Purchases/Withdrawals missing or positive?)");
    } else {
        expenditures.forEach(t => console.log(`${t.type}: ${t.amount} (${t.currency}) - ${t.description}`));
    }

    // 3. User Audit: izobilioner
    console.log("\n--- User Audit: izobilioner ---");
    const user = await User.findOne({ username: 'izobilioner' });
    if (user) {
        console.log(`User Balance (DB): Green=${user.greenBalance}, Yellow=${user.yellowBalance}`);

        const txs = await Transaction.find({ user: user._id });
        let calcGreen = 0;
        let purchaseCount = 0;
        let bonusCount = 0;

        txs.forEach((t: any) => {
            const type = String(t.type);
            if (t.currency === 'GREEN') calcGreen += t.amount;
            if (type === 'AVATAR_PURCHASE' || type === 'PURCHASE') purchaseCount++;
            if (type === 'AVATAR_BONUS') bonusCount++;
        });

        console.log(`Calculated Green from Txs: ${calcGreen}`);
        console.log(`Tx Count: ${txs.length} (Purchases: ${purchaseCount}, Bonuses: ${bonusCount})`);
        console.log(`Diff: ${user.greenBalance - calcGreen}`);
    }

    // 4. Yellow Distribution Stats
    console.log("\n--- Yellow Balance Stats ---");
    const totalYellow = await Avatar.aggregate([
        { $group: { _id: null, total: { $sum: "$yellowBalance" }, count: { $sum: 1 } } }
    ]);
    console.log(`Total Yellow in Avatars: ${totalYellow[0]?.total || 0} (across ${totalYellow[0]?.count || 0} avatars)`);

    process.exit(0);
}

run().catch(console.error);
