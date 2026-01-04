
import { MongoClient } from 'mongodb';

const SOURCE_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

const list = async () => {
    console.log('🔌 Connecting to SOURCE...');
    const client = new MongoClient(SOURCE_URL);
    await client.connect();

    // Check 'moneo' first
    try {
        const db = client.db('moneo');
        const cols = await db.listCollections().toArray();
        console.log(`\n📚 Collections in 'moneo':`);
        cols.forEach(c => console.log(` - ${c.name}`));
    } catch (e) {
        console.log("Error checking moneo db:", e);
    }

    // Check 'test' just in case
    try {
        const db = client.db('test');
        const cols = await db.listCollections().toArray();
        console.log(`\n📚 Collections in 'test':`);
        cols.forEach(c => console.log(` - ${c.name}`));
    } catch (e) { }

    await client.close();
};

list();
