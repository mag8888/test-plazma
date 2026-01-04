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
        const mongoUrl = process.env.MONGO_URL;
        if (!mongoUrl) {
            console.error('FATAL: MONGO_URL not found in environment variables. Database connections will fail.');
            return;
        }

        mongoose.set('strictQuery', false);
        // FORCE 'moneo' DB to match migrated data
        await mongoose.connect(mongoUrl, { dbName: 'moneo' });
        console.log('Successfully connected to MongoDB (dbName: test)');

        // Seed users after connection
        await seedTestUsers();

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        // process.exit(1); // Do not exit. Let the caller handle it or run without DB.
        throw error; // Re-throw so index.ts sees the failure
    }
};
