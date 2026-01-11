import mongoose from 'mongoose';
import { UserModel } from './models/user.model';

const seedTestUsers = async () => {
    const testUsers = [
        { username: 'Masha', password: '123', first_name: 'Masha' },
        { username: 'Pttia', password: '123', first_name: 'Pttia' },
        { username: 'Sasha', password: '123', first_name: 'Sasha' }
    ];

    for (const u of testUsers) {
        const exists = await UserModel.exists({ username: u.username });
        if (!exists) {
            await UserModel.create(u);
            console.log(`Seeded test user: ${u.username}`);
        }
    }
};

export const connectDatabase = async () => {
    try {
        let mongoUrl = process.env.MONGO_URL;

        // DEBUG: Print all env keys to see what is actually available
        console.log('[DEBUG] Available Env Keys:', Object.keys(process.env).sort().join(', '));
        console.log('[DEBUG] MONGO_URL value type:', typeof process.env.MONGO_URL, process.env.MONGO_URL ? '(Present)' : '(Missing)');
        console.log('[DEBUG] DATABASE_URL value type:', typeof process.env.DATABASE_URL, process.env.DATABASE_URL ? '(Present)' : '(Missing)');

        // Fallback to DATABASE_URL if MONEO_URL is missing
        if (!mongoUrl && process.env.DATABASE_URL) {
            console.log('[Database] MONGO_URL not found, using DATABASE_URL instead.');
            mongoUrl = process.env.DATABASE_URL;
        }

        if (!mongoUrl) {
            console.error('FATAL: MONGO_URL (and DATABASE_URL) not found in environment variables. Database connections will fail.');
            // We throw here so the bootstrap knows it failed, rather than silently returning
            throw new Error('Missing MONGO_URL and DATABASE_URL');
        }

        mongoose.set('strictQuery', false);

        // V19 DB ISOLATION: Check Environment and Service Name
        const envName = (process.env.RAILWAY_ENVIRONMENT_NAME || '').toLowerCase();
        const serviceName = (process.env.RAILWAY_SERVICE_NAME || '').toLowerCase();

        console.log(`[Database] Init Check: Env='${envName}', Service='${serviceName}'`);

        let dbOptions: mongoose.ConnectOptions = {};

        // Check if ANY indicator suggests Development
        if (envName.includes('dev') || serviceName.includes('dev')) {
            console.log(`[Database] Detected DEV mode (Env: ${envName}, Service: ${serviceName}). Switching to 'moneo_dev' database.`);
            dbOptions = { dbName: 'moneo_dev' };
        } else {
            console.log(`[Database] Detected PROD/DEFAULT mode. Using default database from MONGO_URL.`);
        }

        console.log(`[Database] Attempting to connect with Connection String of type: ${typeof mongoUrl}`);

        if (typeof mongoUrl !== 'string') {
            console.error('[Database] FATAL: mongoUrl is not a string:', mongoUrl);
            throw new Error(`MONGO_URL must be a string, got ${typeof mongoUrl}`);
        }

        // Sanitize log
        const logSafeUrl = mongoUrl.includes('@') ? 'mongodb://***@' + mongoUrl.split('@')[1] : 'mongodb://*** (Hidden)';
        console.log(`[Database] Connection String: ${logSafeUrl}`);

        await mongoose.connect(mongoUrl, dbOptions);
        console.log(`Successfully connected to MongoDB`);

        // Seed users after connection
        await seedTestUsers();

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error; // Re-throw so index.ts sees the failure
    }
};
