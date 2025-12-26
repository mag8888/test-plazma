
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const listCollections = async () => {
    try {
        const mongoURI = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/moneo';
        if (!mongoURI) {
            console.error('MONGO_URL not set');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI, { dbName: 'moneo' });
        console.log('Connected.');

        const collections = await mongoose.connection.db!.listCollections().toArray();
        console.log('Collections:');
        collections.forEach(c => console.log(`- ${c.name}`));

        // If 'cards' exists, let's peek at one
        const cardCollection = collections.find(c => c.name.toLowerCase().includes('card') || c.name.toLowerCase().includes('item'));
        if (cardCollection) {
            console.log(`\nPeeking at ${cardCollection.name}...`);
            const sample = await mongoose.connection.db!.collection(cardCollection.name).findOne({});
            console.log(JSON.stringify(sample, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listCollections();
