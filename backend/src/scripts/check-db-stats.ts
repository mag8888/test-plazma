import { MongoClient } from 'mongodb';

const URLS = [
    'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910',
    'mongodb://mongo:dXEyqPWOuIkMPnJjuDrHYFKgKZzocIDl@switchback.proxy.rlwy.net:13336'
];

const check = async () => {
    for (const url of URLS) {
        console.log(`\n🔍 Checking: ${url.split('@')[1]}`);
        const client = new MongoClient(url);
        try {
            await client.connect();
            const db = client.db('test'); // Assuming 'test' is the main DB as per recent fixes

            const users = await db.collection('users').countDocuments();
            const cards = await db.collection('cards').countDocuments();
            const depositRequests = await db.collection('depositrequests').countDocuments();

            console.log(`   - Users: ${users}`);
            console.log(`   - Cards: ${cards}`);
            console.log(`   - DepositRequests: ${depositRequests}`);

            const allDbs = await client.db().admin().listDatabases();
            console.log(`   - Databases: ${allDbs.databases.map(d => d.name).join(', ')}`);

        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        } finally {
            await client.close();
        }
    }
};

check();
