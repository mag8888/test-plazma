
import { MongoClient } from 'mongodb';

const SOURCE_URL = 'mongodb://mongo:xARHeObYcGbdLXkpbknPDMrrxHxEZzod@nozomi.proxy.rlwy.net:55910';

const check = async () => {
    const client = new MongoClient(SOURCE_URL);
    await client.connect();
    const db = client.db('moneo'); // Source used 'moneo' based on finding.
    const user = await db.collection('users').findOne({});
    console.log('Sample User:', user);
    await client.close();
};

check();
