import React from 'react';
import { useRouter } from 'next/navigation';

interface Ranking {
    name: string;
    place: number;
    reason: string;
}

interface RankingsModalProps {
    rankings: Ranking[];
    onClose: () => void;
    isOpen?: boolean;
}

export const RankingsModal = ({ rankings, onClose }: RankingsModalProps) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500"></div>

                <h2 className="text-3xl font-bold text-center text-white mb-2">Game Over!</h2>
                <p className="text-slate-400 text-center mb-6">Final Standings</p>

                <div className="space-y-3 mb-8">
                    {rankings.map((player) => (
                        <div
                            key={player.name}
                            className={`flex items-center justify-between p-4 rounded-lg border ${player.place === 1
                                ? 'bg-yellow-500/10 border-yellow-500/50'
                                : 'bg-slate-800 border-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${player.place === 1 ? 'bg-yellow-500 text-black' :
                                    player.place === 2 ? 'bg-slate-400 text-black' :
                                        player.place === 3 ? 'bg-orange-700 text-white' :
                                            'bg-slate-700 text-slate-300'
                                    }`}>
                                    {player.place}
                                </div>
                                <div>
                                    <div className={`font-bold text-lg ${player.place === 1 ? 'text-yellow-400' : 'text-white'}`}>
                                        {player.name}
                                    </div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">
                                        {player.reason}
                                    </div>
                                </div>
                            </div>
                            {player.place === 1 && (
                                <div className="text-2xl">🏆</div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                    Back to Lobby
                </button>
            </div>
        </div>
    );
};
