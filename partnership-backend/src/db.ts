import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async () => {
    try {
        // USE SAME DATABASE AS GAME BACKEND
        // Old: process.env.MONGO_URL_PARTNERSHIP (separate DB)
        // New: process.env.MONGO_URL (shared with Game Backend)
        const mongoURI = process.env.MONGO_URL;
        if (!mongoURI) {
            console.error('FATAL: MONGO_URL not set');
            process.exit(1);
        }

        // Mask password for logging
        const maskedURI = mongoURI.replace(/:([^:@]+)@/, ':****@');
        console.log('Attempting to connect to MongoDB URI (SHARED WITH GAME BACKEND):', maskedURI);

        // Match Isolation Logic from Game Backend
        const envName = (process.env.RAILWAY_ENVIRONMENT_NAME || '').toLowerCase();
        const serviceName = (process.env.RAILWAY_SERVICE_NAME || '').toLowerCase();

        let dbOptions: mongoose.ConnectOptions = {};

        // Determine DB Name
        if (envName.includes('dev') || serviceName.includes('dev')) {
            console.log(`[PartnershipDB] Detected DEV mode (Env: ${envName}, Service: ${serviceName}). Switching to 'moneo_dev' database.`);
            dbOptions = { dbName: 'moneo_dev' };
        } else {
            // In Prod, we want to use the default DB from the URI (which is likely 'moneo' or 'test')
            // Removing 'dbName: test' allows the URI to dictate the DB, or defaults to 'test' if URI has none.
            console.log(`[PartnershipDB] Detected PROD mode. Using default database from URI.`);
        }

        await mongoose.connect(mongoURI, dbOptions);

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
