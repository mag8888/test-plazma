import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = '/Users/ADMIN/MONEO/partnership-backend/.env';
const result = dotenv.config({ path: envPath, debug: true });

if (result.error) {
    console.error("❌ Dotenv failed to load:", result.error);
} else {
    console.log(`✅ Loaded env from ${envPath}`);
}

// Keys provided by user (Removed for Security - Set in .env)
// process.env.CLOUDINARY_CLOUD_NAME = '...';
// process.env.CLOUDINARY_API_KEY = '...';
// process.env.CLOUDINARY_API_SECRET = '...';

console.log("DEBUG: Cloudinary Configured.");
console.log("DEBUG: Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "MISSING");

// CONFIG
const LOCAL_MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';
const KEEP_TYPES = ['DEPOSIT', 'PURCHASE', 'WITHDRAWAL', 'ADMIN_ADJUSTMENT', 'AVATAR_PURCHASE'];
// Exclude: 'AVATAR_BONUS', 'BONUS_GREEN', 'BONUS_YELLOW'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function run() {
    console.log("🚀 Starting Smart Restore to DEV...");

    // Configure explicitly
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log("☁️  Fetching latest backup from Cloudinary...");
    const search = await cloudinary.search
        .expression('folder:moneo_backups AND resource_type:raw')
        .sort_by('created_at', 'desc')
        .max_results(1)
        .execute();

    if (search.resources.length === 0) {
        console.error("❌ No backups found.");
        process.exit(1);
    }

    const backupUrl = search.resources[0].secure_url;
    console.log(`📥 Downloading: ${search.resources[0].created_at} -> ${backupUrl}`);

    const response = await fetch(backupUrl);
    const data = await response.json();

    if (!data.collections) {
        console.error("❌ Invalid Backup Data.");
        process.exit(1);
    }

    // 2. Process Data (Cleanse)
    console.log("🧹 Cleaning Data...");

    // A. Clean Transactions
    const rawTransactions = data.collections['transactions'] || [];
    const cleanTransactions = rawTransactions.filter((t: any) => {
        // Keep only 'Real' money flow
        return KEEP_TYPES.includes(t.type) || (t.currency === 'GREEN' && t.amount < 0); // Keep deductions
    });
    console.log(`- Transactions: ${rawTransactions.length} -> ${cleanTransactions.length} (Removed Bonuses)`);

    // B. Recalculate Balances
    console.log("💰 Recalculating Balances...");
    const userBalances = new Map<string, number>(); // userId -> balance

    // Initialize all users with 0
    const users = data.collections['users'] || [];
    users.forEach((u: any) => userBalances.set(u._id, 0));

    // Replay valid transactions
    cleanTransactions.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    cleanTransactions.forEach((t: any) => {
        const uid = t.user;
        const amount = Number(t.amount);
        if (userBalances.has(uid) && !isNaN(amount)) {
            const current = userBalances.get(uid) || 0;
            // ONLY count GREEN currency for balance
            if (t.currency === 'GREEN') {
                userBalances.set(uid, current + amount);
            }
        }
    });

    // Update Users
    let totalGreen = 0;
    const cleanUsers = users.map((u: any) => {
        const newBal = userBalances.get(u._id) || 0;
        // Cap at 0? User asked for "deposits and payments". 
        // If they spent more than deposited (e.g. using bonuses), they might be negative.
        // Let's keep it real.
        u.greenBalance = newBal;
        u.yellowBalance = 0; // Reset Yellow (Matrix) as requested "without earnings"
        totalGreen += newBal;
        return u;
    });
    console.log(`- Users Updated: ${cleanUsers.length}. Total Clean Green: $${totalGreen.toFixed(2)}`);

    // 3. Connect to Local DB
    console.log(`🔌 Connecting to Local DB: ${LOCAL_MONGO_URL} (dbName: moneo)`);
    await mongoose.connect(LOCAL_MONGO_URL, { dbName: 'moneo' });
    const db = mongoose.connection.db;
    if (!db) throw new Error("No DB");

    // 4. Restore
    const collectionsToRestore = ['users', 'transactions', 'avatars']; // Only core
    // We might need avatars structure? User said "without earnings".
    // Avatars imply structure. Let's keep them but maybe reset their balances.

    // Users
    await db.collection('users').deleteMany({});
    await db.collection('users').insertMany(cleanUsers.map(fixIds));
    console.log("✅ Users Restored");

    // Transactions
    await db.collection('transactions').deleteMany({});
    if (cleanTransactions.length > 0) {
        await db.collection('transactions').insertMany(cleanTransactions.map(fixIds));
    }
    console.log("✅ Transactions Restored");

    // Avatars (Reset balances)
    const rawAvatars = data.collections['avatars'] || [];
    const cleanAvatars = rawAvatars.map((a: any) => {
        a.yellowBalance = 0;
        a.level = 0; // Reset Matrix progress? User said "without earnings". 
        // Usually matrix structure is kept, but earnings wiped?
        // "оплаты без начисления" -> payments without accruals.
        // Let's keep structure (parent/partners) but 0 balance.
        return a;
    });

    await db.collection('avatars').deleteMany({});
    if (cleanAvatars.length > 0) {
        await db.collection('avatars').insertMany(cleanAvatars.map(fixIds));
    }
    console.log("✅ Avatars Restored (Balances Reset)");

    console.log("🎉 DONE! Dev DB is now clean.");
    process.exit(0);
}

function fixIds(doc: any) {
    if (doc._id && typeof doc._id === 'string') doc._id = new mongoose.Types.ObjectId(doc._id);
    ['user', 'owner', 'referrer', 'parent'].forEach(f => {
        if (doc[f] && typeof doc[f] === 'string' && /^[0-9a-fA-F]{24}$/.test(doc[f])) {
            doc[f] = new mongoose.Types.ObjectId(doc[f]);
        }
    });
    // Dates
    ['createdAt', 'updatedAt'].forEach(f => {
        if (doc[f]) doc[f] = new Date(doc[f]);
    });
    return doc;
}

run().catch(console.error);
