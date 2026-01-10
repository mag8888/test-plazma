"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { giftsApi } from '../../../lib/giftsApi';
import { Loader2 } from 'lucide-react';
import { MatrixOpener } from '../../../components/MatrixOpener';

export default function InventoryPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Opener State
    const [openerOpen, setOpenerOpen] = useState(false);
    const [openerStatus, setOpenerStatus] = useState<'LOCKED' | 'CHALLENGE' | 'OPENING' | 'SUCCESS' | 'FAILED'>('LOCKED');
    const [currentInventoryId, setCurrentInventoryId] = useState<string | null>(null);
    const [riddle, setRiddle] = useState<any>(null);
    const [reward, setReward] = useState<any>(null);
    const [error, setError] = useState<string>('');

    const getUserId = () => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('partnership_user');
            if (stored) return JSON.parse(stored)._id;
        }
        return null;
    };

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        const userId = getUserId();
        if (!userId) return;
        try {
            const data = await giftsApi.getMyInventory(userId);
            // Filter only CLOSED for now or show history? Let's show CLOSED first
            setItems(data.filter((i: any) => i.status === 'CLOSED').reverse());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenStart = async (inventoryId: string) => {
        const userId = getUserId();
        if (!userId) return;

        setCurrentInventoryId(inventoryId);
        setOpenerStatus('LOCKED');
        setOpenerOpen(true);
        setError('');

        try {
            // Step 1: Init (Get Riddle)
            setOpenerStatus('CHALLENGE'); // Ideally after loading, but let's show UI first
            const data = await giftsApi.initOpen(inventoryId, userId);
            setRiddle(data);
        } catch (e: any) {
            setError(e.message);
            setOpenerStatus('FAILED');
        }
    };

    const handleAnswerSubmit = async (answer: number) => {
        const userId = getUserId();
        if (!userId || !currentInventoryId || !riddle) return;

        setOpenerStatus('OPENING'); // Spin cube

        try {
            // Fake delay for suspense
            await new Promise(r => setTimeout(r, 1500));

            const result = await giftsApi.verifyOpen(currentInventoryId, userId, riddle.riddleId, answer);
            if (result.success) {
                setReward(result.reward);
                setOpenerStatus('SUCCESS');
            } else {
                setError('Verification Failed');
                setOpenerStatus('FAILED');
            }
        } catch (e: any) {
            setError(e.message);
            setOpenerStatus('FAILED');
        }
    };

    const handleCloseOpener = () => {
        setOpenerOpen(false);
        setCurrentInventoryId(null);
        setRiddle(null);
        setReward(null);
        loadInventory(); // Refresh list
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">📦 Мой Инвентарь</h1>
                    <p className="text-slate-400 text-xs">Ваши нераспакованные боксы</p>
                </div>
                <button onClick={() => router.push('/partnership/gifts')} className="text-sm border border-slate-600 px-4 py-2 rounded-lg">
                    ← В Магазин
                </button>
            </header>

            {items.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    У вас пока нет боксов.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {items.map(item => (
                        <div key={item._id} className="bg-slate-800 p-4 rounded-xl flex flex-col items-center text-center">
                            <div className="text-4xl mb-3 animate-bounce">📦</div>
                            <h3 className="font-bold text-sm mb-1">{item.templateId?.name || 'Box'}</h3>
                            <p className="text-[10px] text-slate-400 mb-4">{new Date(item.acquiredAt).toLocaleDateString()}</p>
                            <button
                                onClick={() => handleOpenStart(item._id)}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-bold text-xs uppercase shadow-lg shadow-green-900/20"
                            >
                                ПРИМЕНИТЬ ХАК
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* OPENER COMPONENT */}
            {openerOpen && (
                <MatrixOpener
                    status={openerStatus}
                    riddle={riddle}
                    onAnswerSubmit={handleAnswerSubmit}
                    onClose={handleCloseOpener}
                    reward={reward}
                    error={error}
                />
            )}
        </div>
    );
}
