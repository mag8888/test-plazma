
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Upload, CheckCircle, CreditCard, Coins, Banknote } from 'lucide-react';
import { partnershipApi } from '../../lib/partnershipApi';

const DEPOSIT_METHODS = [
    {
        id: 'USDT_BEP20',
        name: 'USDT BEP20',
        icon: Coins,
        wallet: '0xb15e97ad107d57f5ca5405556877395848cf745d',
        color: 'from-yellow-500 to-amber-600'
    },
    {
        id: 'USDT_TRC20',
        name: 'USDT TRC20',
        icon: Coins,
        wallet: 'TG8Ltochc5rYz54M5SeRPbMq7Xj9ovz7j9',
        color: 'from-green-500 to-emerald-600'
    },
    {
        id: 'SBER_RUB',
        name: 'Сбербанк (RUB)',
        icon: Banknote,
        wallet: '+79164632850 (Роман Богданович П.)',
        color: 'from-green-600 to-green-800'
    }
];

const AMOUNTS = [20, 100, 1000];

export default function DepositPage() {
    const router = useRouter();
    const [step, setStep] = useState<'METHOD' | 'AMOUNT' | 'PROOF'>('METHOD');
    const [method, setMethod] = useState<any>(null);
    const [amount, setAmount] = useState<number | ''>('');
    const [customAmount, setCustomAmount] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleMethodSelect = (m: any) => {
        setMethod(m);
        setStep('AMOUNT');
    };

    const handleAmountSelect = (a: number) => {
        setAmount(a);
        setCustomAmount('');
    };

    const handleNextToProof = () => {
        if (!amount && !customAmount) return;
        setStep('PROOF');
    };

    const handleCopy = () => {
        if (!method?.wallet) return;
        navigator.clipboard.writeText(method.wallet);
        setCopied(true);
        // Haptic feedback
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        }
    };

    const handleSubmit = async () => {
        const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
            || localStorage.getItem('debug_telegram_id');

        if (!telegramId) {
            setError("Ошибка авторизации. Зайдите через Telegram.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const finalAmount = amount || Number(customAmount);

            // 1. Create Deposit Request
            const reqData = await partnershipApi.createDeposit(String(telegramId), finalAmount, method.id);
            if (!reqData.success) throw new Error("Failed to create request");

            const requestId = reqData.request._id;

            // 2. Upload Proof
            if (!preview) throw new Error("No proof image");

            // Upload via Generic Upload Endpoint
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://moneo-backend.up.railway.app';
            const uploadUrl = `${backendUrl}/api/upload`;

            const uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: preview, folder: 'deposits' })
            });

            if (!uploadRes.ok) throw new Error("Upload failed: " + await uploadRes.text());
            const { url } = await uploadRes.json();

            // 3. Submit Proof URL to Finance
            await partnershipApi.uploadProof(requestId, url as any);

            setSuccess(true);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ошибка отправки');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-white">Заявка отправлена!</h1>
                <p className="text-slate-400">
                    Мы проверим ваш платеж в ближайшее время. Скриншот отправлен администратору.
                </p>
                <button
                    onClick={() => router.back()}
                    className="w-full py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500"
                >
                    Вернуться назад
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 p-4">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={() => step === 'METHOD' ? router.back() : setStep(prev => prev === 'PROOF' ? 'AMOUNT' : 'METHOD')}
                    className="p-2 bg-slate-800 rounded-lg">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-xl font-bold text-white">
                    {step === 'METHOD' && 'Выберите способ'}
                    {step === 'AMOUNT' && 'Введите сумму'}
                    {step === 'PROOF' && 'Подтверждение'}
                </h1>
            </header>

            {step === 'METHOD' && (
                <div className="space-y-3">
                    {DEPOSIT_METHODS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => handleMethodSelect(m)}
                            className={`w-full p-4 rounded-xl border border-slate-700 bg-slate-800/50 flex items-center justify-between hover:bg-slate-800 transition-all`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                                    <m.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">{m.name}</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {step === 'AMOUNT' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                        {AMOUNTS.map(amt => (
                            <button
                                key={amt}
                                onClick={() => handleAmountSelect(amt)}
                                className={`p-4 rounded-xl border ${amount === amt ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700 bg-slate-800/50'} text-white font-bold transition-all`}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <label className="text-slate-400 text-sm">Ваша сумма ($)</label>
                        <input
                            type="number"
                            value={amount || customAmount}
                            onChange={(e) => {
                                setAmount('');
                                setCustomAmount(e.target.value);
                            }}
                            placeholder="Введите сумму"
                            className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <button
                        disabled={!amount && !customAmount}
                        onClick={handleNextToProof}
                        className="w-full py-4 bg-blue-600 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        Далее
                    </button>
                </div>
            )}

            {step === 'PROOF' && method && (
                <div className="space-y-6">
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-4">
                        <div className="text-center">
                            <div className="text-sm text-slate-400 mb-1">К оплате</div>
                            <div className="text-3xl font-bold text-white text-green-400">
                                ${amount || customAmount}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{method.name}</div>
                        </div>

                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 break-all relative group">
                            <div className="text-xs text-slate-500 mb-1">Кошелек / Реквизиты:</div>
                            <div className="text-sm text-white font-mono">{method.wallet}</div>
                            <button
                                onClick={handleCopy}
                                className={`absolute top-2 right-2 p-1.5 rounded transition-all flex items-center gap-1 ${copied ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                            >
                                {copied ? <CheckCircle size={14} /> : <Copy size={16} />}
                                {copied && <span className="text-[10px] font-bold">Скопировано</span>}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-white font-bold">Прикрепите скриншот</h3>
                        <label className="block w-full h-32 border-2 border-dashed border-slate-600 rounded-xl hover:border-slate-400 transition-colors cursor-pointer relative overflow-hidden group">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            {preview ? (
                                <img src={preview} alt="Proof" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-white">
                                    <Upload className="w-8 h-8 mb-2" />
                                    <span className="text-sm">Нажмите чтобы загрузить</span>
                                </div>
                            )}
                        </label>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 py-4 bg-slate-700 rounded-xl font-bold text-white hover:bg-slate-600"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !preview}
                            className="flex-1 py-4 bg-green-600 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500"
                        >
                            {loading ? 'Отправка...' : 'Отправить'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
