import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL || 'mongodb://localhost:27017/moneo-partnership';
        console.log('Attempting to connect to MongoDB URI:', mongoURI.replace(/:([^:@]+)@/, ':****@')); // Mask password

        // Debug DNS Logic
        const hostname = mongoURI.split('://')[1].split(':')[0].split('/')[0].split('@').pop();
        if (hostname) {
            console.log(`Resolving hostname: ${hostname}`);
            dns.lookup(hostname, (err, address, family) => {
                if (err) console.error('DNS Lookup Error:', err);
                else console.log(`DNS Lookup Success: ${hostname} -> ${address}`);
            });
        }

        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};
