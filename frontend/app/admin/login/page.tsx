'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = () => {
        // Simple password check - in production use proper auth
        const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

        if (password === ADMIN_PASSWORD) {
            // Store in localStorage
            localStorage.setItem('admin_authenticated', 'true');
            localStorage.setItem('admin_secret', password);
            router.push('/admin/');
        } else {
            setError('Неверный пароль');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full space-y-6">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center ring-4 ring-blue-500/10">
                        <Lock size={32} className="text-blue-500" />
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">MONEO Admin</h1>
                    <p className="text-slate-400 text-sm">Введите пароль для доступа</p>
                </div>

                <div className="space-y-4">
                    <input
                        type="password"
                        placeholder="Пароль администратора"
                        className="w-full bg-slate-950 text-white p-4 rounded-xl border border-slate-800 focus:border-blue-500 outline-none transition"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />

                    {error && (
                        <div className="text-red-400 text-sm text-center">{error}</div>
                    )}

                    <button
                        onClick={handleLogin}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition"
                    >
                        Войти
                    </button>
                </div>

                <div className="text-center text-xs text-slate-600">
                    Только для администраторов MONEO
                </div>
            </div>
        </div>
    );
}
