'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { partnershipApi } from '@/lib/partnershipApi';

export default function DepositPage() {
    const router = useRouter();
    const [step, setStep] = useState<'AMOUNT' | 'REQUISITES' | 'SUCCESS'>('AMOUNT');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Load User (for ID)
    useEffect(() => {
        // Try to get user from localStorage or context
        // Assuming partnershipApi doesn't store session automatically, we check local storage 'user'
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            // Redirect or show error if no user
            // Maybe fetch profile via partnershipApi?
            // For now assume user MUST be logged in
        }
    }, []);

    const amounts = [20, 100, 1000, 1120];

    const handleSelectAmount = (amount: number) => {
        setSelectedAmount(amount);
        setStep('REQUISITES');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !selectedAmount || !user) return;

        const file = e.target.files[0];
        setLoading(true);

        try {
            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;

                // Determine userId (ObjectId preferred)
                // user object usually has _id
                const userId = user._id || user.id;

                await partnershipApi.requestDeposit(userId, selectedAmount, base64);
                setStep('SUCCESS');
                setLoading(false);
            };
            reader.onerror = (error) => {
                console.error('File Error: ', error);
                alert('Ошибка чтения файла');
                setLoading(false);
            };
        } catch (error: any) {
            console.error('Upload Error:', error);
            alert('Ошибка загрузки: ' + error.message);
            setLoading(false);
        }
    };

    if (step === 'SUCCESS') {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-2xl font-bold mb-2">Заявка принята!</h1>
                <p className="text-slate-400 mb-6">Ваш скриншот отправлен на проверку. <br />Баланс будет пополнен автоматически после подтверждения.</p>
                <button
                    onClick={() => router.push('/earn')}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl w-full max-w-xs transition"
                >
                    Вернуться в меню
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
            <div className="max-w-md mx-auto">
                <header className="flex items-center gap-4 mb-8 pt-4">
                    {step === 'REQUISITES' && (
                        <button onClick={() => setStep('AMOUNT')} className="text-2xl">⬅️</button>
                    )}
                    <h1 className="text-xl font-bold">Пополнение (Green)</h1>
                </header>

                {step === 'AMOUNT' && (
                    <div className="grid grid-cols-2 gap-4">
                        {amounts.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => handleSelectAmount(amount)}
                                className="bg-slate-900 border border-slate-700 hover:border-green-500 hover:bg-slate-800 rounded-xl p-6 flex flex-col items-center gap-2 transition"
                            >
                                <span className="text-3xl font-bold text-green-400">${amount}</span>
                                <span className="text-xs text-slate-500">Пополнить</span>
                            </button>
                        ))}
                    </div>
                )}

                {step === 'REQUISITES' && selectedAmount && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">Реквизиты для оплаты ${selectedAmount}</h2>

                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">Сбербанк</div>
                                <div className="bg-slate-950 p-3 rounded flex justify-between items-center">
                                    <code className="text-green-300 font-mono">+79164632850</code>
                                    <button onClick={() => navigator.clipboard.writeText('+79164632850')} className="text-xs bg-slate-800 px-2 py-1 rounded">Copy</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">USDT (BEP-20)</div>
                                <div className="bg-slate-950 p-3 rounded flex justify-between items-center">
                                    <code className="text-yellow-300 font-mono text-xs truncate mr-2">0xb15e97ad107d57f5ca5405556877395848cf745d</code>
                                    <button onClick={() => navigator.clipboard.writeText('0xb15e97ad107d57f5ca5405556877395848cf745d')} className="text-xs bg-slate-800 px-2 py-1 rounded">Copy</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">USDT (TRC-20)</div>
                                <div className="bg-slate-950 p-3 rounded flex justify-between items-center">
                                    <code className="text-blue-300 font-mono text-xs truncate mr-2">TG8Ltochc5rYz54M5SeRPbMq7Xj9ovz7j9</code>
                                    <button onClick={() => navigator.clipboard.writeText('TG8Ltochc5rYz54M5SeRPbMq7Xj9ovz7j9')} className="text-xs bg-slate-800 px-2 py-1 rounded">Copy</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl text-sm text-yellow-200">
                            ⚠️ После перевода средств сделайте скриншот подтверждения и загрузите его ниже.
                        </div>

                        <div className="pt-4">
                            <label className={`block w-full text-center py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold cursor-pointer transition ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {loading ? 'Отправка...' : '📤 Загрузить скриншот'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={loading}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
