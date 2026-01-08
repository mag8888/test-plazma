import mongoose from 'mongoose';
import { CardModel } from '../models/card.model';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import card definitions directly from card manager
// Note: card.manager.ts exports: EXPENSE_CARDS, SMALL_DEALS (not DEAL_SMALL), BIG_DEALS, MARKET_CARDS
import { EXPENSE_CARDS, SMALL_DEALS, BIG_DEALS, MARKET_CARDS } from '../game/card.manager';

async function migrateCards() {
    try {
        console.log('🚀 Starting card migration...');

        // Connect to MongoDB
        const mongoUrl = process.env.MONGO_URL;
        if (!mongoUrl) {
            throw new Error('MONGO_URL not found in environment');
        }
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');

        // Clear existing cards
        const deleted = await CardModel.deleteMany({});
        console.log(`🗑️  Deleted ${deleted.deletedCount} existing cards`);

        // Combine all cards with displayId and ensure unique IDs
        const expenseCards = EXPENSE_CARDS.map((c, idx) => ({ ...c, displayId: idx + 1 }));
        const smallDeals = SMALL_DEALS.map((c, idx) => ({
            ...c,
            id: c.id.startsWith('DEAL_SMALL') ? `${c.id}_${idx}_${Date.now()}` : c.id, // Make expand() IDs unique
            displayId: idx + 1
        }));
        const bigDeals = BIG_DEALS.map((c, idx) => ({
            ...c,
            id: c.id.startsWith('DEAL_BIG') ? `${c.id}_${idx}_${Date.now()}` : c.id,
            displayId: idx + 1
        }));
        const marketCards = MARKET_CARDS.map((c, idx) => ({ ...c, displayId: idx + 1 }));

        const allCards = [
            ...expenseCards,
            ...smallDeals,
            ...bigDeals,
            ...marketCards,
        ];

        console.log(`📦 Preparing to insert ${allCards.length} cards...`);
        console.log(`   - EXPENSE: ${expenseCards.length}`);
        console.log(`   - DEAL_SMALL: ${smallDeals.length}`);
        console.log(`   - DEAL_BIG: ${bigDeals.length}`);
        console.log(`   - MARKET: ${marketCards.length}`);

        // Insert all cards
        const inserted = await CardModel.insertMany(allCards);
        console.log(`✅ Successfully inserted ${inserted.length} cards!`);

        // Show summary
        const counts = await CardModel.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        console.log('\n📊 Database Summary:');
        counts.forEach((c: any) => {
            console.log(`   ${c._id}: ${c.count} cards`);
        });

        await mongoose.disconnect();
        console.log('\n🎉 Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    migrateCards();
}

export default migrateCards;
