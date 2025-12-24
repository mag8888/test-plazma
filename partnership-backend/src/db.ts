import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO_PUBLIC_URL || 'mongodb://localhost:27017/moneo-partnership';

        // Mask password for logging
        const maskedURI = mongoURI.replace(/:([^:@]+)@/, ':****@');
        console.log('Attempting to connect to MongoDB URI:', maskedURI);

        await mongoose.connect(mongoURI);

        // Log the connected Database Name
        if (mongoose.connection.db) {
            console.log('MongoDB Connected to Database:', mongoose.connection.db.databaseName);
        } else {
            console.log('MongoDB Connected (Database name unknown)');
        }
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};
