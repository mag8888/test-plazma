
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CardModel } from '../models/card.model';

dotenv.config();

const cleanCards = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined');
        }

        await mongoose.connect(process.env.DATABASE_URL);
        console.log('📦 Connected to MongoDB');

        const countBefore = await CardModel.countDocuments();
        console.log(`Cards before cleanup: ${countBefore}`);

        await CardModel.deleteMany({});
        console.log('✅ All cards deleted.');

        const countAfter = await CardModel.countDocuments();
        console.log(`Cards after cleanup: ${countAfter}`);

        console.log('🚀 Next restart of backend will re-seed cards from source code (DbCardManager).');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error cleaning cards:', error);
        process.exit(1);
    }
};

cleanCards();
