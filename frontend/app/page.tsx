"use client";

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '../components/TelegramProvider';

function HomeContent() {
  const router = useRouter();
  const { user, isReady } = useTelegram();

  useEffect(() => {
    if (isReady) {
      if (user) {
        // Authenticated -> Go to Home
        router.replace('/home');
      } else {
        // Not authenticated or not in Telegram
        // For now, redirect to Home anyway as Guest or show a simple "Enter" button?
        // User said "auto registration", so we assume TelegramProvider handles it.
        // If failed, we might want to guide them to open in Telegram.
        // But for Dev, let's allow entering.
        // router.replace('/home'); // Force home for now
      }
    }
  }, [user, isReady, router]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="text-center animate-pulse">
        <h1 className="text-6xl font-black bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl mb-4 tracking-tighter">
          MONEO
        </h1>
        <p className="text-slate-400">Загрузка...</p>
      </div>

      {/* Dev Bypass if stuck */}
      {isReady && !user && (
        <div className="mt-8">
          <button onClick={() => router.push('/home')} className="text-slate-600 text-xs hover:text-white transition-colors">
            Dev: Force Enter
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
