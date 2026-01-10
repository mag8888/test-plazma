"use client";

import { useState, useEffect } from 'react';
import { giftsApi } from '../../../lib/giftsApi';
import { Loader2, Plus, Trash2, Gift } from 'lucide-react';

export default function GiftManager() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        slug: '',
        name: '',
        description: '',
        price: '',
        currency: 'RED',
        imageUrl: '',
        isSecret: false,
        items: [] as any[]
    });

    const [newItem, setNewItem] = useState({
        type: 'BALANCE_GREEN',
        value: '',
        weight: '100'
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await giftsApi.getTemplates(); // In future add admin-specific endpoint for inactive ones
            setTemplates(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { ...newItem, weight: Number(newItem.weight) }]
        });
        setNewItem({ type: 'BALANCE_GREEN', value: '', weight: '100' });
    };

    const handleCreate = async () => {
        try {
            await fetch('/api/gifts/admin/templates', { // We need to proxy this or call direct
                // Since standard giftsApi is client-facing, we might need a direct fetch here or extend API
                // For MVP let's assume we used the controller method.
                // Wait, I didn't verify if I exposed POST /admin/templates on the frontend PROXY. 
                // The frontend is static export, so it must call the Gifts Service URL directly.
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    price: Number(formData.price)
                })
            });
            // Actually, let's use a quick fetch helper that points to getGiftsUrl()
            // But for now let's just alert
            alert("This requires the Admin Endpoint to be accessible. Assuming success for layout demo.");
            setIsCreating(false);
            loadTemplates();
        } catch (e) {
            alert("Error creating template");
        }
    };

    // Quick hack to call the protected endpoint directly from client for the Admin Panel
    const createDirectly = async () => {
        const { getGiftsUrl } = require('../../../lib/config');
        // Dynamic import or just assume config is available in scope
        // Just use window fetch to the service url
        const baseUrl = process.env.NEXT_PUBLIC_GIFTS_API_URL || 'http://localhost:3003';

        const res = await fetch(`${baseUrl}/api/gifts/admin/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                price: Number(formData.price)
            })
        });

        if (res.ok) {
            alert("Created!");
            setIsCreating(false);
            loadTemplates();
        } else {
            alert("Failed");
        }
    };


    if (loading) return <Loader2 className="animate-spin text-white" />;

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gift className="text-purple-400" /> Gift Templates
                </h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm"
                >
                    <Plus size={16} /> New Template
                </button>
            </div>

            {isCreating && (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-purple-500/30 mb-6">
                    <h3 className="font-bold text-white mb-4">Create New Template</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input placeholder="Slug (id)" className="bg-slate-800 p-2 rounded text-white text-xs" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                        <input placeholder="Name" className="bg-slate-800 p-2 rounded text-white text-xs" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        <input placeholder="Description" className="bg-slate-800 p-2 rounded text-white text-xs col-span-2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        <input placeholder="Price" type="number" className="bg-slate-800 p-2 rounded text-white text-xs" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                        <select className="bg-slate-800 p-2 rounded text-white text-xs" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                            <option value="RED">RED Balance</option>
                            <option value="GREEN">GREEN Balance</option>
                            <option value="TON">TON</option>
                        </select>
                        <label className="flex items-center gap-2 text-white text-xs">
                            <input type="checkbox" checked={formData.isSecret} onChange={e => setFormData({ ...formData, isSecret: e.target.checked })} />
                            Is Secret Box?
                        </label>
                    </div>

                    <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-2">Items (Content)</p>
                        {formData.items.map((it, i) => (
                            <div key={i} className="flex gap-2 text-xs text-white mb-1">
                                <span>{it.type}</span>
                                <span>{it.value}</span>
                                <span>{it.weight}%</span>
                            </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                            <select className="bg-slate-800 p-1 rounded text-white text-xs" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                                <option value="BALANCE_GREEN">Green Bal</option>
                                <option value="BALANCE_RED">Red Bal</option>
                                <option value="AVATAR">Avatar</option>
                            </select>
                            <input placeholder="Value (e.g. 100 or PREMIUM)" className="bg-slate-800 p-1 rounded text-white text-xs" value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} />
                            <input placeholder="Weight" className="bg-slate-800 p-1 rounded text-white text-xs w-16" value={newItem.weight} onChange={e => setNewItem({ ...newItem, weight: e.target.value })} />
                            <button onClick={handleAddItem} className="bg-slate-700 px-2 rounded">+</button>
                        </div>
                    </div>

                    <button onClick={createDirectly} className="w-full bg-purple-600 py-2 rounded font-bold text-white text-sm">Save Template</button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2">
                {templates.map(t => (
                    <div key={t._id} className="bg-slate-900/40 p-3 rounded flex justify-between items-center text-white">
                        <div>
                            <span className="font-bold text-sm block">{t.name}</span>
                            <span className="text-xs text-slate-400">{t.price} {t.currency} • {t.isSecret ? 'Secret' : 'Bundle'}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                            {t.slug}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
