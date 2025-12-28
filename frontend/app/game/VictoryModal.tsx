"use client";

import { useEffect } from 'react';
import { sfx } from './SoundManager';

interface VictoryModalProps {
    player: any;
    onClose: () => void;
}

export const VictoryModal = ({ player, onClose }: VictoryModalProps) => {
    useEffect(() => {
        // Play victory sound
        sfx.play('victory');
    }, []);

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-in fade-in zoom-in duration-500">
            <div className="bg-gradient-to-br from-yellow-900/50 via-amber-900/50 to-orange-900/50 w-full max-w-2xl p-12 rounded-3xl border-4 border-yellow-400/50 shadow-[0_0_80px_rgba(251,191,36,0.5)] relative text-center animate-in slide-in-from-bottom duration-700">

                {/* Confetti Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                animation: `fall ${2 + Math.random() * 3}s linear infinite`,
                                animationDelay: `${Math.random() * 2}s`,
                                opacity: Math.random()
                            }}
                        />
                    ))}
                </div>

                {/* Trophy Icon */}
                <div className="text-9xl mb-6 filter drop-shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-bounce">
                    🏆
                </div>

                {/* Victory Text */}
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 mb-4 uppercase tracking-wider animate-pulse">
                    ПОБЕДА!
                </h1>

                <div className="text-3xl font-bold text-white mb-8 drop-shadow-lg">
                    🎉 ПОЗДРАВЛЯЕМ! 🎉
                </div>

                {/* Winner Info */}
                <div className="bg-black/30 p-6 rounded-2xl border border-yellow-400/30 mb-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        {(player.avatar || player.photo_url) ? (
                            <img
                                src={player.avatar || player.photo_url}
                                alt={player.name}
                                className="w-20 h-20 rounded-full border-4 border-yellow-400 shadow-lg"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-600 to-amber-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                                {player.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <div className="text-left">
                            <div className="text-yellow-400 text-sm font-bold uppercase tracking-wider">Победитель</div>
                            <div className="text-white text-2xl font-black">{player.name}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="bg-green-900/30 p-3 rounded-xl border border-green-500/30">
                            <div className="text-green-400 text-xs font-bold uppercase">Денежный Поток</div>
                            <div className="text-white text-xl font-black font-mono">${player.passiveIncome?.toLocaleString()}</div>
                        </div>
                        <div className="bg-blue-900/30 p-3 rounded-xl border border-blue-500/30">
                            <div className="text-blue-400 text-xs font-bold uppercase">Наличные</div>
                            <div className="text-white text-xl font-black font-mono">${player.cash?.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <p className="text-yellow-200 text-lg mb-8 italic">
                    "Вы достигли финансовой свободы и осуществили свою мечту!"
                </p>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:via-amber-400 hover:to-yellow-500 text-black font-bold py-5 px-16 rounded-full shadow-2xl transform hover:scale-110 transition-all uppercase tracking-widest text-lg border-2 border-yellow-300"
                >
                    Продолжить игру
                </button>

                <style jsx>{`
                    @keyframes fall {
                        to {
                            transform: translateY(100vh) rotate(360deg);
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};
