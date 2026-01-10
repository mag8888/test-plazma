"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { giftsApi } from '../../../lib/giftsApi';
import { usePartnership } from '../../../lib/partnershipContext'; // Assuming context exists or we use local storage/api
// If no context, we'll fetch ID from localStorage for now as per previous patterns
import { Loader2 } from 'lucide-react';

interface GiftTemplate {
    _id: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl?: string;
}

export default function GiftShopPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<GiftTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);

    // Temp User ID retrieval (Fallback to localStorage 'user_id' or similar if Context not ready)
    // For MVP we assume we can get it.
    const getUserId = () => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('partnership_user');
            if (stored) return JSON.parse(stored)._id; // Check schema
        }
        return null;
    };

    useEffect(() => {
        loadShop();
    }, []);

    const loadShop = async () => {
        try {
            const data = await giftsApi.getTemplates();
            setTemplates(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (slug: string) => {
        const userId = getUserId();
        if (!userId) {
            alert("Пожалуйста, войдите в систему (Partnership Login)");
            return;
        }

        setBuying(slug);
        try {
            await giftsApi.buy(userId, slug);
            alert("Успешно куплено! Проверьте инвентарь.");
            router.push('/partnership/inventory');
        } catch (e: any) {
            alert(e.message || "Ошибка покупки");
        } finally {
            setBuying(null);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        🎁 Магазин Боксов
                    </h1>
                    <p className="text-slate-400 text-xs">Испытай удачу в Матрице</p>
                </div>
                <button onClick={() => router.push('/partnership/inventory')} className="text-sm bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    📦 Инвентарь
                </button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {templates.map(t => (
                    <div key={t._id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col hover:border-purple-500/50 transition-all">
                        <div className="aspect-square bg-slate-900 relative">
                            {/* Placeholder for Image */}
                            <div className="absolute inset-0 flex items-center justify-center text-4xl">
                                {t.imageUrl ? <img src={t.imageUrl} className="w-full h-full object-cover" /> : '🎁'}
                            </div>
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                            <h3 className="font-bold text-sm mb-1">{t.name}</h3>
                            <p className="text-xs text-slate-400 mb-3 flex-1">{t.description}</p>

                            <button
                                onClick={() => handleBuy(t.slug)}
                                disabled={!!buying}
                                className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                            >
                                {buying === t.slug ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : `Купить за ${t.price} ${t.currency}`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
