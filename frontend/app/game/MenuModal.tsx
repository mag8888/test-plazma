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
    onSkipTurn?: () => void;
    onKickCurrent?: () => void;
    onToggleOrientation?: () => void; // New Prop
    onCancelGame?: () => void;
    deckCounts?: any; // Pass deck counts
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
    hasWinner,
    onSkipTurn,
    onKickCurrent,
    onToggleOrientation,
    onCancelGame,
    deckCounts
}: MenuModalProps) => {
    return (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#1e293b] w-full max-w-sm md:max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar p-6 rounded-3xl border border-slate-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>

                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10 bg-[#1e293b]/50 rounded-full p-1">
                    ✕
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>⚙️</span> Настройки
                </h2>

                {/* Deck Counts */}
                {deckCounts && (
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 mb-6 text-xs">
                        <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Состояние Колод</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between"><span className="text-emerald-400">Small</span> <span className="font-mono text-white">{deckCounts.small?.remaining}/{deckCounts.small?.total}</span></div>
                            <div className="flex justify-between"><span className="text-purple-400">Big</span> <span className="font-mono text-white">{deckCounts.big?.remaining}/{deckCounts.big?.total}</span></div>
                            <div className="flex justify-between"><span className="text-blue-400">Market</span> <span className="font-mono text-white">{deckCounts.market?.remaining}/{deckCounts.market?.total}</span></div>
                            <div className="flex justify-between"><span className="text-pink-400">Expense</span> <span className="font-mono text-white">{deckCounts.expense?.remaining}/{deckCounts.expense?.total}</span></div>
                        </div>
                    </div>
                )}

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

                {/* Landscape Toggle */}
                {onToggleOrientation && (
                    <div className="mb-8">
                        <button
                            onClick={() => {
                                onToggleOrientation();
                                onClose();
                            }}
                            className="w-full py-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center gap-3 transition-colors uppercase tracking-widest text-xs"
                        >
                            <span className="text-xl">🔄</span> Перевернуть экран
                        </button>
                    </div>
                )}

                {/* Danger Zone */}
                <div className="mt-auto space-y-3">
                    <button
                        onClick={onExit}
                        className="w-full py-4 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
                    >
                        <span className="text-lg">🚪</span> Покинуть Комнату
                    </button>

                    {/* HOST: End Game Button */}
                    {isHost && (
                        <div className="space-y-3 pt-4 border-t border-slate-700/50">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider text-center">Меню Организатора</div>

                            <button
                                onClick={onEndGame}
                                className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                            >
                                <span className="text-lg">🛑</span> ЗАВЕРШИТЬ ИГРУ
                            </button>

                            {/* CANCEL GAME (DELETE ROOM) */}
                            {onCancelGame && (
                                <button
                                    onClick={onCancelGame}
                                    className="w-full py-3 rounded-xl bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                                >
                                    ❌ ОТМЕНИТЬ ИГРУ
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={onSkipTurn}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors"
                                >
                                    Пропустить ход
                                </button>
                                <button
                                    onClick={onKickCurrent}
                                    className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/50 rounded-xl py-3 font-bold text-[10px] uppercase transition-colors"
                                >
                                    Кикнуть
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
