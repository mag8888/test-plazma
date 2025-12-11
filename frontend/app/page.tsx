"use client";

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-3xl filter opacity-50 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl filter opacity-50 animate-pulse delay-1000"></div>
        </div>

        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-lg">
          ENERGY OF MONEY
        </h1>

        <p className="text-xl text-slate-300">
          Образовательная игра-стратегия на основе CashFlow в квантовом поле.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-yellow-500 transition-all cursor-pointer group" onClick={() => router.push('/lobby')}>
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎲</div>
            <h2 className="text-2xl font-bold mb-2">Играть</h2>
            <p className="text-slate-400 text-sm">Присоединиться к комнате или создать новую</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500 transition-all cursor-pointer group" onClick={() => window.open('https://t.me/energy_m_bot', '_blank')}>
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🤖</div>
            <h2 className="text-2xl font-bold mb-2">Telegram Бот</h2>
            <p className="text-slate-400 text-sm">Обучение, сообщество и заработок</p>
          </div>
        </div>

        <footer className="mt-16 text-slate-500 text-sm">
          &copy; 2025 Energy of Money. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
