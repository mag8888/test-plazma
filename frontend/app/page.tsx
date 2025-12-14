"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authCode = searchParams.get('auth');
    if (authCode) {
      handleMagicLogin(authCode);
    }
  }, [searchParams]);

  const handleMagicLogin = async (code: string) => {
    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/magic-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace('/lobby');
    } catch (e) {
      console.error("Magic login failed", e);
      setError("Auto-login failed. Please try again.");
      setLoading(false);
    }
  };

  const getApiUrl = () => {
    let url = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    // Remove surrounding quotes if present
    url = url.replace(/^["']|["']$/g, '');

    // If in browser, fallback to relative path (empty string implies relative for fetch)
    // OR return window.location.origin
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (!process.env.NEXT_PUBLIC_API_URL && origin && !origin.includes('localhost')) {
        return origin;
      }
    }

    // Default to localhost for local dev if no env var
    return 'http://localhost:3001';
  };

  const handleAuth = async (type: 'login' | 'register') => {
    try {
      const apiUrl = getApiUrl();
      console.log('Attempting auth to:', apiUrl);

      const res = await fetch(`${apiUrl}/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Auth server error:', data);
        throw new Error(data.error || `Auth failed: ${res.status}`);
      }

      // Save to localStorage (simple persist)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/lobby');
    } catch (err: any) {
      console.error('Auth execution error:', err);
      setError(err.message + (err.message.includes('fetch') ? ' (Check API Connection)' : ''));
    }
  };

  const loginAs = (u: string) => {
    setUsername(u);
    setPassword('123'); // Default password
    setTimeout(() => authDirect(u, '123'), 100);
  };

  const authDirect = async (u: string, p: string) => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/lobby');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">

        <div className="text-center">
          <h1 className="text-6xl font-black bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl mb-4 tracking-tighter">
            MONEO
          </h1>
          <p className="text-slate-400">Вход в систему</p>
        </div>

        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm text-center">{error}</div>}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Имя пользователя"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Пароль"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAuth('login')}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
          >
            Войти
          </button>
          <button
            onClick={() => handleAuth('register')}
            className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors border border-slate-600"
          >
            Регистрация
          </button>
        </div>

        <div className="relative border-t border-slate-700 pt-6 mt-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 px-2 text-slate-500 text-xs uppercase tracking-wider">
            Тестовые игроки
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Masha', 'Pttia', 'Sasha'].map(u => (
              <button
                key={u}
                onClick={() => loginAs(u)}
                className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-yellow-500/50 py-2 rounded-lg text-sm transition-all"
              >
                {u}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
