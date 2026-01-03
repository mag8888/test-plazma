// @ts-nocheck
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

async function check() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log(`Connected to Database: ${mongoose.connection.db.databaseName}`);
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log(`Users: ${users.length}`);
        const totalGreen = users.reduce((acc, u) => acc + (u.greenBalance || 0), 0);
        console.log(`Total Green: ${totalGreen}`);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
