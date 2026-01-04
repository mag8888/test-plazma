'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { getGameServiceUrl } from '../../lib/config';

interface Card {
    id: string;
    type: 'MARKET' | 'EXPENSE' | 'DEAL_SMALL' | 'DEAL_BIG' | 'BUSINESS' | 'DREAM';
    title: string;
    description: string;
    cardNumber?: string; // Unique card number
    currentValue?: number; // Current state/price (e.g. Tesla stock at $5 or $40)
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
    targetCardNumber?: string; // For market cards: which card number this affects
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
            // Fix: Use absolute URL from config to ensure we hit the backend
            const baseUrl = getGameServiceUrl();
            const res = await fetch(`${baseUrl}/api/cards/${type}`, {
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
                    <button
                        onClick={async () => {
                            if (!confirm('Reload all cards from database? This will refresh the card templates.')) return;
                            try {
                                const res = await fetch('/api/admin/reload-cards', {
                                    method: 'POST',
                                    headers: { 'x-admin-secret': secret }
                                });
                                const data = await res.json();
                                if (data.success) {
                                    alert(`Cards reloaded!\nSmall: ${data.counts.small}\nBig: ${data.counts.big}\nMarket: ${data.counts.market}\nExpense: ${data.counts.expense}`);
                                    fetchCards(selectedType);
                                } else {
                                    alert('Failed to reload cards: ' + data.error);
                                }
                            } catch (e) {
                                console.error('Failed to reload cards:', e);
                                alert('Network error while reloading cards');
                            }
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <RotateCcw size={18} /> Reload from DB
                    </button>
                    <button
                        onClick={async () => {
                            if (!confirm('⚠️ RUN MIGRATION? This will DELETE all cards and re-insert 148 cards from code. Continue?')) return;
                            try {
                                const res = await fetch('/api/admin/migrate-cards', {
                                    method: 'POST',
                                    headers: { 'x-admin-secret': secret }
                                });
                                const data = await res.json();
                                if (data.success) {
                                    alert(`Migration completed!\nDeleted: ${data.counts.deleted}\nInserted: ${data.counts.inserted}\n\nBreakdown:\nExpense: ${data.counts.breakdown.expense}\nSmall: ${data.counts.breakdown.small}\nBig: ${data.counts.breakdown.big}\nMarket: ${data.counts.breakdown.market}`);
                                    fetchCards(selectedType);
                                } else {
                                    alert('Migration failed: ' + data.error);
                                }
                            } catch (e) {
                                console.error('Migration failed:', e);
                                alert('Network error during migration');
                            }
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <RotateCcw size={18} /> Run Migration
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
                            className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group"
                        >
                            <div className="p-4 h-full flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {card.displayId && (
                                            <span className="bg-blue-500/30 text-blue-300 text-sm font-bold px-2.5 py-1 rounded border border-blue-400/30">
                                                №{card.displayId}
                                            </span>
                                        )}
                                        {card.cardNumber && (
                                            <span className="bg-purple-500/20 text-purple-400 text-xs font-mono px-2 py-0.5 rounded">
                                                {card.cardNumber}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-sm mb-1 line-clamp-2" title={card.title}>{card.title}</h3>
                                    {card.description && (
                                        <p className="text-slate-400 text-xs mb-2 line-clamp-2" title={card.description}>
                                            {card.description}
                                        </p>
                                    )}

                                    <div className="space-y-1 text-xs">
                                        {/* Financials */}
                                        {card.cost !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Price/Cost:</span>
                                                <span className="text-white font-bold">${card.cost.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {card.downPayment !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Down Pay:</span>
                                                <span className="text-white font-bold">${card.downPayment.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {card.liability !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Liability:</span>
                                                <span className="text-red-400 font-bold">-${card.liability.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {card.cashflow !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Cashflow:</span>
                                                <span className={`font-bold ${card.cashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {card.cashflow >= 0 ? '+' : ''}${card.cashflow.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        {card.roi !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">ROI:</span>
                                                <span className="text-yellow-400 font-bold">{card.roi}%</span>
                                            </div>
                                        )}

                                        {/* Stock / Market */}
                                        {card.offerPrice !== undefined && <div className="text-blue-400 font-bold">Offer: ${card.offerPrice.toLocaleString()}</div>}
                                        {card.symbol && <div className="text-purple-400 font-mono">Sym: {card.symbol}</div>}
                                        {card.targetCardNumber && (
                                            <div className="text-purple-400 font-bold text-[10px] mt-1">Target: {card.targetCardNumber}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Actions - Always visible now */}
                            <div className="flex gap-2 mt-4">
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
                    ))}
                </div>
            )
            }

            {/* Edit/Create Modal */}
            {
                editingCard && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-2xl space-y-4 my-8">
                            <h2 className="text-2xl font-bold text-white">{isCreating ? 'Create New Card' : 'Edit Card'}</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Card Number *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SD-001, BD-025"
                                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                        value={editingCard.cardNumber || ''}
                                        onChange={(e) => setEditingCard({ ...editingCard, cardNumber: e.target.value })}
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
                                    <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Current Value</label>
                                    <input
                                        type="number"
                                        placeholder="Current price/state"
                                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                        value={editingCard.currentValue || ''}
                                        onChange={(e) => setEditingCard({ ...editingCard, currentValue: Number(e.target.value) })}
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
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        For MLM: Income per partner (с каждого партнера)
                                    </div>
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

                            {/* Market Card Specific Fields */}
                            {selectedType === 'market' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                                    <div>
                                        <label className="text-xs text-purple-400 uppercase font-bold block mb-2">Target Card Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. SD-001"
                                            className="w-full bg-slate-950 text-white p-3 rounded-xl border border-purple-500/50 focus:border-purple-400 outline-none"
                                            value={editingCard.targetCardNumber || ''}
                                            onChange={(e) => setEditingCard({ ...editingCard, targetCardNumber: e.target.value })}
                                        />
                                        <p className="text-xs text-purple-400 mt-1">Which card does this market card affect?</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-purple-400 uppercase font-bold block mb-2">Offer Price</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-950 text-white p-3 rounded-xl border border-purple-500/50 focus:border-purple-400 outline-none"
                                            value={editingCard.offerPrice || ''}
                                            onChange={(e) => setEditingCard({ ...editingCard, offerPrice: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}

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
                )
            }
        </div >
    );
}
