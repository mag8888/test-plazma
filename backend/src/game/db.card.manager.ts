import { Card, EXPENSE_CARDS, SMALL_DEALS, BIG_DEALS, MARKET_CARDS } from './card.manager';
import { CardModel } from '../models/card.model';

export class DbCardManager {
    static instance: DbCardManager;

    // These hold the "Master" copy of the cards loaded from DB
    private smallDealsTemplate: Card[] = [];
    private bigDealsTemplate: Card[] = [];
    private marketDeckTemplate: Card[] = [];
    private expenseDeckTemplate: Card[] = [];

    private initialized = false;

    constructor() { }

    static getInstance() {
        if (!DbCardManager.instance) {
            DbCardManager.instance = new DbCardManager();
        }
        return DbCardManager.instance;
    }

    async init() {
        if (this.initialized) return;

        console.log('🔄 DbCardManager: Initializing...');

        try {
            const count = await CardModel.countDocuments();
            console.log(`📊 Total cards in database: ${count}`);

            if (count === 0) {
                console.log('⚠️ DB is empty. Seeding default cards...');
                await this.seedCards();
            }

            const allCards = await CardModel.find({}).lean();
            console.log(`📦 Fetched ${allCards.length} cards from database`);

            // Debug: Check what types we have
            const typeBreakdown: any = {};
            allCards.forEach(c => {
                typeBreakdown[c.type] = (typeBreakdown[c.type] || 0) + 1;
            });
            console.log('📋 Cards by type in fetched data:', typeBreakdown);

            // Map DB docs to Card interface (ensure _id -> id if needed, though we use 'id' field)
            const mapCard = (c: any): Card => {
                const { _id, __v, ...rest } = c;
                return rest as Card;
            };

            this.smallDealsTemplate = allCards.filter(c => c.type === 'DEAL_SMALL').map(mapCard);
            this.bigDealsTemplate = allCards.filter(c => c.type === 'DEAL_BIG').map(mapCard);
            this.marketDeckTemplate = allCards.filter(c => c.type === 'MARKET').map(mapCard);
            this.expenseDeckTemplate = allCards.filter(c => c.type === 'EXPENSE').map(mapCard);

            this.initialized = true;
            console.log('✅ Cards Loaded from DB:', {
                small: this.smallDealsTemplate.length,
                big: this.bigDealsTemplate.length,
                market: this.marketDeckTemplate.length,
                expense: this.expenseDeckTemplate.length
            });
        } catch (e) {
            console.error('Failed to load cards from DB:', e);
            // Fallback to memory defaults if DB fails? 
            // Better to throw so we know it's broken, or fallback silent?
            // Fallback silent is safer for uptime.
            this.loadFallback();
        }
    }

    private loadFallback() {
        console.warn('⚠️ Using fallback hardcoded cards (DB Failed)');
        this.smallDealsTemplate = [...SMALL_DEALS];
        this.bigDealsTemplate = [...BIG_DEALS];
        this.marketDeckTemplate = [...MARKET_CARDS];
        this.expenseDeckTemplate = [...EXPENSE_CARDS];
        this.initialized = true;
    }

    // Force reload cards from DB (useful after migration)
    async reload() {
        console.log('🔄 DbCardManager: Force reloading cards from database...');
        this.initialized = false;
        await this.init();
    }

    private async seedCards() {
        await this.seedDeck(EXPENSE_CARDS, 'EXPENSE');
        await this.seedDeck(SMALL_DEALS, 'DEAL_SMALL');
        await this.seedDeck(BIG_DEALS, 'DEAL_BIG');
        await this.seedDeck(MARKET_CARDS, 'MARKET');
    }

    private async seedDeck(cards: Card[], type: string) {
        let counter = 1;
        const ops = cards.map(card => {
            // Some cards might be expanded duplicates with unique IDs but same content
            // We want unique displayId for each *entry* in the deck
            return {
                insertOne: {
                    document: {
                        ...card,
                        displayId: counter++
                    }
                }
            };
        });

        if (ops.length > 0) {
            await CardModel.bulkWrite(ops);
        }
    }

    // Return COPIES for shuffling
    getTemplates() {
        return {
            small: this.smallDealsTemplate.map(c => ({ ...c })),
            big: this.bigDealsTemplate.map(c => ({ ...c })),
            market: this.marketDeckTemplate.map(c => ({ ...c })),
            expense: this.expenseDeckTemplate.map(c => ({ ...c }))
        };
    }
}
