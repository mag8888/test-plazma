
import mongoose from 'mongoose';

const SOURCE_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';
const TARGET_URL = 'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336';

const DATABASES = ['test', 'moneo', 'admin', 'local'];

const checkDB = async (url: string, label: string) => {
    console.log(`\n--- Checking ${label} ---`);
    for (const dbName of DATABASES) {
        try {
            const conn = await mongoose.createConnection(url, { dbName }).asPromise();
            const count = await conn.collection('users').countDocuments({});
            console.log(`[${label}] DB: '${dbName}' -> Users: ${count}`);

            if (count > 0) {
                // Check Roman
                const roman = await conn.collection('users').findOne({
                    $or: [{ username: /roman/i }, { first_name: /roman/i }]
                });
                if (roman) {
                    console.log(`   Owner found: ${roman.username} (G:${roman.greenBalance}, Y:${roman.yellowBalance}, R:${roman.balanceRed})`);
                }
            }
            await conn.close();
        } catch (e: any) {
            console.log(`[${label}] DB: '${dbName}' -> Error: ${e.message}`);
        }
    }
};

const run = async () => {
    await checkDB(SOURCE_URL, 'SOURCE (Nozomi)');
    await checkDB(TARGET_URL, 'TARGET (Switchback)');
    console.log('\nDone.');
    process.exit(0);
};

run();
