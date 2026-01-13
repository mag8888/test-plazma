import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface WinnerModalProps {
    onContinue: () => void;
    rank: number;
    reason: string;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ onContinue, rank, reason }) => {

    useEffect(() => {
        // Fireworks on mount
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="relative bg-[#0F172A] border-2 border-amber-500/50 rounded-3xl p-8 max-w-md w-full text-center shadow-[0_0_100px_rgba(245,158,11,0.3)] animate-in zoom-in-95 duration-300">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-8xl drop-shadow-[0_0_30px_rgba(245,158,11,0.8)] filter">
                    🏆
                </div>

                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 mt-12 mb-2 uppercase tracking-tight">
                    ПОБЕДА!
                </h2>

                <div className="text-xl font-bold text-amber-200 mb-6 uppercase tracking-widest bg-amber-500/10 py-1 px-4 rounded-full inline-block border border-amber-500/20">
                    {rank}-е место
                </div>

                <p className="text-slate-300 mb-8 leading-relaxed font-medium">
                    Поздравляем! Вы достигли цели:
                    <br />
                    <span className="text-white font-bold">{reason}</span>
                </p>

                <button
                    onClick={onContinue}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    ПРОДОЛЖИТЬ ИГРУ
                </button>

                <p className="mt-4 text-xs text-slate-500 font-mono">
                    Вы можете остаться наблюдать или продолжить игру в "песочнице"
                </p>
            </div>
        </div>
    );
};
