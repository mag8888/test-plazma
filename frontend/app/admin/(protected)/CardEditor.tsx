'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';

interface Card {
    id: string;
    type: 'MARKET' | 'EXPENSE' | 'DEAL_SMALL' | 'DEAL_BIG' | 'BUSINESS' | 'DREAM';
    title: string;
    description: string;
    cardNumber?: string; // Unique card number
    cost?: number;
    cashflow?: number;
    price?: number;
    downPayment?: number;
    liability?: number;
    roi?: number;
    symbol?: string;
    mandatory?: boolean;
    action?: string;
    targetTitle?: string;
    offerPrice?: number;
    businessType?: string;
    subtype?: string;
    assetType?: string;
    maxQuantity?: number;
    outcomeDescription?: string;
    displayId?: number;
}

interface CardEditorProps {
    secret: string;
}

const CARD_TYPES = [
    { value: 'small', label: 'Small Deals' },
    { value: 'big', label: 'Big Deals' },
    { value: 'market', label: 'Market Cards' },
    { value: 'expense', label: 'Expense Cards' }
];

export default function CardEditor({ secret }: CardEditorProps) {
    const [selectedType, setSelectedType] = useState('small');
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchCards = async (type: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/cards/${type}`, {
                headers: { 'x-admin-secret': secret }
            });
            const data = await res.json();
            if (data.success) {
                setCards(data.cards);
            }
        } catch (e) {
            console.error('Failed to fetch cards:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCards(selectedType);
    }, [selectedType]);

    const handleDelete = async (cardId: string) => {
        if (!confirm('Delete this card?')) return;
        try {
            const res = await fetch(`/api/cards/${selectedType}/${cardId}`, {
                method: 'DELETE',
                headers: { 'x-admin-secret': secret }
            });
            const data = await res.json();
            if (data.success) {
                setCards(data.cards);
            }
        } catch (e) {
            console.error('Failed to delete card:', e);
        }
    };

    const handleReset = async () => {
        if (!confirm('Reset all cards to defaults?')) return;
        try {
            const res = await fetch(`/api/cards/${selectedType}/reset`, {
                method: 'POST',
                headers: { 'x-admin-secret': secret }
            });
            const data = await res.json();
            if (data.success) {
                setCards(data.cards);
            }
        } catch (e) {
            console.error('Failed to reset cards:', e);
        }
    };

    const handleSave = async (card: Card) => {
        try {
            if (isCreating) {
                // Create
                const res = await fetch('/api/cards', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-secret': secret
                    },
                    body: JSON.stringify({ type: selectedType, card })
                });
                const data = await res.json();
                if (data.success) {
                    setCards(data.cards);
                }
            } else {
                // Update
                const res = await fetch(`/api/cards/${selectedType}/${card.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-secret': secret
                    },
                    body: JSON.stringify(card)
                });
                const data = await res.json();
                if (data.success) {
                    setCards(data.cards);
                }
            }
            setEditingCard(null);
            setIsCreating(false);
        } catch (e) {
            console.error('Failed to save card:', e);
        }
    };

    return (
        <div className="space-y-6">
            {/* Type Selector */}
            <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                    <div className="text-slate-400 text-sm font-bold mr-4">
                        Всего: <span className="text-white">{cards.length}</span> карточек
                    </div>
                    {CARD_TYPES.map(type => (
                        <button
                            key={type.value}
                            onClick={() => setSelectedType(type.value)}
                            className={`px-4 py-2 rounded-lg font-bold transition ${selectedType === type.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setIsCreating(true);
                            setEditingCard({
                                id: '',
                                type: 'DEAL_SMALL',
                                title: '',
                                description: ''
                            } as Card);
                        }}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <Plus size={18} /> New Card
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <RotateCcw size={18} /> Reset
                    </button>
                </div>
            </div>

            {/* Card Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cards.map(card => (
                        <div
                            key={card.id}
                            className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-blue-500 transition group"
                            style={{ height: '300px' }}
                        >
                            {/* Card Preview */}
                            <div className="p-4 h-full flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    {card.cardNumber && (
                                        <div className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">
                                            № {card.cardNumber}
                                        </div>
                                    )}
                                    <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">{card.title}</h3>
                                    <p className="text-slate-400 text-xs mb-3 line-clamp-3">{card.description}</p>
                                    <div className="space-y-1 text-xs">
                                        {card.cost && <div className="text-yellow-400">Cost: ${card.cost.toLocaleString()}</div>}
                                        {card.cashflow && <div className="text-green-400">+${card.cashflow}/mo</div>}
                                        {card.offerPrice && <div className="text-blue-400">Offer: ${card.offerPrice.toLocaleString()}</div>}
                                        {card.symbol && <div className="text-purple-400">Symbol: {card.symbol}</div>}
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        onClick={() => setEditingCard(card)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(card.id)}
                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit/Create Modal */}
            {editingCard && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-2xl space-y-4 my-8">
                        <h2 className="text-2xl font-bold text-white">{isCreating ? 'Create New Card' : 'Edit Card'}</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Title</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                    value={editingCard.title}
                                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Cost</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                    value={editingCard.cost || ''}
                                    onChange={(e) => setEditingCard({ ...editingCard, cost: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Description</label>
                            <textarea
                                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none h-24 resize-none"
                                value={editingCard.description}
                                onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Cashflow</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                    value={editingCard.cashflow || ''}
                                    onChange={(e) => setEditingCard({ ...editingCard, cashflow: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Symbol</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                    value={editingCard.symbol || ''}
                                    onChange={(e) => setEditingCard({ ...editingCard, symbol: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <button
                                onClick={() => {
                                    setEditingCard(null);
                                    setIsCreating(false);
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSave(editingCard)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition"
                            >
                                {isCreating ? 'Create' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
