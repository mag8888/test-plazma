'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '../components/TelegramProvider';
import { User, Lock, ArrowRight, Loader2, Send, Eye, EyeOff } from 'lucide-react';
import { getBackendUrl } from '../lib/config';

function HomeContent() {
  const router = useRouter();
  const { user, isReady, webApp } = useTelegram();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [hasAuthParam, setHasAuthParam] = useState(false);

  // Check for auth parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('auth');
    if (authCode) {
      console.log('🔐 Auth parameter detected, waiting for magic login...');
      setHasAuthParam(true);
    }
  }, []);

  useEffect(() => {
    console.log('📍 [page.tsx] isReady:', isReady, 'user:', !!user, 'hasAuthParam:', hasAuthParam);
    if (isReady && user) {
      router.replace('/home');
    }
  }, [user, isReady, router, hasAuthParam]);

  const handleUserLogin = async () => {
    if (!username || !password) {
      setError('Заполните все поля');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const url_base = getBackendUrl();
      const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';

      const res = await fetch(`${url_base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        // Success
        localStorage.setItem('moneo_user_auth', JSON.stringify({
          user: data.user,
          token: data.token
        }));
        localStorage.removeItem('moneo_is_logged_out');

        // Redirect admins to admin panel
        if (data.user?.isAdmin) {
          window.location.href = '/admin';
        } else {
          window.location.reload();
        }
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (e) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[-20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2 drop-shadow-lg">
            MONEO
          </h1>
          <p className="text-slate-400 text-sm">Финансовая стратегия</p>
        </div>

        {isReady && !user && !hasAuthParam ? (
          <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{mode === 'LOGIN' ? 'Вход' : 'Регистрация'}</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Логин</label>
                <input
                  className="w-full bg-slate-950 text-white p-4 rounded-xl border border-slate-800 focus:border-blue-500 outline-none transition"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">Пароль</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-slate-950 text-white p-4 pr-12 rounded-xl border border-slate-800 focus:border-blue-500 outline-none transition"
                    placeholder="••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUserLogin()}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                    type="button"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg">{error}</div>}

              <button
                onClick={handleUserLogin}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'LOGIN' ? 'Войти' : 'Создать аккаунт')}
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                    setError('');
                  }}
                  className="text-xs text-slate-400 hover:text-blue-400 transition"
                >
                  {mode === 'LOGIN' ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">{hasAuthParam ? 'Авторизация...' : 'Загрузка...'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <HomeContent />
    </Suspense>
  );
}
