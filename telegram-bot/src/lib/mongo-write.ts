import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

// Separate Mongo Client for Writes to bypass Prisma's Replica Set requirement
// Prisma 5+ forces transactions on "create"/"update" occasionally, which fails on Standalone Mongo.
// We use native driver for critical writes.

let client: MongoClient | null = null;
let dbPromise: Promise<MongoClient> | null = null;

export async function getMongoDb() {
    if (client) {
        return client.db();
    }

    if (!dbPromise) {
        dbPromise = MongoClient.connect(env.databaseUrl);
    }

    client = await dbPromise;
    console.log('🔌 Connected to MongoDB via Native Driver for Writes');
    return client.db();
}

export async function closeMongoConnection() {
    if (client) {
        await client.close();
        client = null;
        dbPromise = null;
    }
}
