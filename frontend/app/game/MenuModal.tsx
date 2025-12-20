import React from 'react';

interface MenuModalProps {
    onClose: () => void;
    onExit: () => void;
    onEndGame: () => void;
    onShowRules: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    volume: number;
    setVolume: (val: number) => void;
    zoom: number;
    setZoom: (val: number) => void;
    isHost: boolean;
    hasWinner: boolean;
}

export const MenuModal = ({
    onClose,
    onExit,
    onEndGame,
    onShowRules,
    isMuted,
    toggleMute,
    volume,
    setVolume,
    zoom,
    setZoom,
    isHost,
    hasWinner
}: MenuModalProps) => {
    return (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>

                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                    ✕
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>⚙️</span> Настройки
                </h2>

                {/* Sound Settings */}
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase tracking-wider">
                        <span>Звук эффектов</span>
                        <button onClick={toggleMute} className={`text-xs px-2 py-1 rounded ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {isMuted ? 'Выключен' : 'Включен'}
                        </button>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                {/* Zoom Settings */}
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase tracking-wider">
                        <span>Масштаб текста</span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                            {(zoom * 100).toFixed(0)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.8"
                        max="2.0"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                </div>

                {/* Links */}
                <div className="space-y-3 mb-8">
                    <button
                        onClick={() => {
                            onClose();
                            onShowRules();
                        }}
                        className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center gap-3 transition-colors border border-slate-700/50"
                    >
                        <span className="text-xl">📜</span> Правила Игры
                    </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-auto space-y-3">
                    <button
                        onClick={onExit}
                        className="w-full py-4 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
                    >
                        <span className="text-lg">🚪</span> Покинуть Комнату
                    </button>

                    {/* HOST: End Game Button */}
                    {isHost && hasWinner && (
                        <button
                            onClick={onEndGame}
                            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                        >
                            <span className="text-lg">🛑</span> ЗАВЕРШИТЬ ИГРУ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
