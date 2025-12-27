import { Router } from 'express';
import { SMALL_DEALS, BIG_DEALS, MARKET_CARDS, EXPENSE_CARDS, Card } from './card.manager';

const router = Router();

// In-memory card storage (session-based, resets on restart)
class CardStore {
    private customSmallDeals: Card[] = [];
    private customBigDeals: Card[] = [];
    private customMarketCards: Card[] = [];
    private customExpenseCards: Card[] = [];
    private initialized = false;

    getCards(type: string): Card[] {
        let cards: Card[] = [];
        switch (type) {
            case 'small': cards = this.customSmallDeals.length > 0 ? this.customSmallDeals : [...SMALL_DEALS]; break;
            case 'big': cards = this.customBigDeals.length > 0 ? this.customBigDeals : [...BIG_DEALS]; break;
            case 'market': cards = this.customMarketCards.length > 0 ? this.customMarketCards : [...MARKET_CARDS]; break;
            case 'expense': cards = this.customExpenseCards.length > 0 ? this.customExpenseCards : [...EXPENSE_CARDS]; break;
            default: return [];
        }

        // Assign displayId if not present (for default cards)
        cards = cards.map((c, i) => c.displayId ? c : { ...c, displayId: i + 1 });
        return cards;
    }

    setCards(type: string, cards: Card[]) {
        switch (type) {
            case 'small': this.customSmallDeals = cards; break;
            case 'big': this.customBigDeals = cards; break;
            case 'market': this.customMarketCards = cards; break;
            case 'expense': this.customExpenseCards = cards; break;
        }
    }

    addCard(type: string, card: Card): Card[] {
        const cards = [...this.getCards(type)];
        const newCard = { ...card, id: `custom_${type}_${Date.now()}` };
        cards.push(newCard);
        this.setCards(type, cards);
        return cards;
    }

    updateCard(type: string, id: string, updates: Partial<Card>): Card[] {
        const cards = [...this.getCards(type)];
        const index = cards.findIndex(c => c.id === id);
        if (index !== -1) {
            cards[index] = { ...cards[index], ...updates };
            this.setCards(type, cards);
        }
        return cards;
    }

    deleteCard(type: string, id: string): Card[] {
        const cards = this.getCards(type).filter(c => c.id !== id);
        this.setCards(type, cards);
        return cards;
    }

    resetToDefaults(type: string) {
        this.setCards(type, []);
    }
}

const cardStore = new CardStore();

// Admin auth middleware
const requireAdmin = (req: any, res: any, next: any) => {
    const secret = req.headers['x-admin-secret'];
    const validSecrets = (process.env.ADMIN_SECRET || 'admin').split(',').map((s: string) => s.trim());
    if (!validSecrets.includes(secret as string)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

// Get cards of specific type
router.get('/:type', requireAdmin, (req, res) => {
    const type = req.params.type;
    try {
        const cards = cardStore.getCards(type);
        res.json({ success: true, cards, type });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Create new card
router.post('/', requireAdmin, (req, res) => {
    const { type, card } = req.body;
    try {
        const cards = cardStore.addCard(type, card);
        res.json({ success: true, cards, message: 'Card created' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Update card
router.put('/:type/:id', requireAdmin, (req, res) => {
    const { type, id } = req.params;
    const updates = req.body;
    try {
        const cards = cardStore.updateCard(type, id, updates);
        res.json({ success: true, cards, message: 'Card updated' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Delete card
router.delete('/:type/:id', requireAdmin, (req, res) => {
    const { type, id } = req.params;
    try {
        const cards = cardStore.deleteCard(type, id);
        res.json({ success: true, cards, message: 'Card deleted' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Reset to defaults
router.post('/:type/reset', requireAdmin, (req, res) => {
    const { type } = req.params;
    try {
        cardStore.resetToDefaults(type);
        const cards = cardStore.getCards(type);
        res.json({ success: true, cards, message: 'Cards reset to defaults' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
