import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async () => {
    try {
        // USE SAME DATABASE AS GAME BACKEND
        // Old: process.env.MONGO_URL_PARTNERSHIP (separate DB)
        // New: process.env.MONGO_URL (shared with Game Backend)
        const mongoURI = process.env.MONGO_URL || 'mongodb://localhost:27017/moneo';

        // Mask password for logging
        const maskedURI = mongoURI.replace(/:([^:@]+)@/, ':****@');
        console.log('Attempting to connect to MongoDB URI (SHARED WITH GAME BACKEND):', maskedURI);

        await mongoose.connect(mongoURI);

        // Log the connected Database Name
        if (mongoose.connection.db) {
            console.log('MongoDB Connected to Database:', mongoose.connection.db.databaseName);
            console.log('✅ Partnership Backend now sharing database with Game Backend');
        } else {
            console.log('MongoDB Connected (Database name unknown)');
        }
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};
