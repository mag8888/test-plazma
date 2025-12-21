"use client";

interface FastTrackInfoModalProps {
    onClose: () => void;
    player: any;
}

export const FastTrackInfoModal = ({ onClose, player }: FastTrackInfoModalProps) => {
    const needed = Math.max(0, 50000 - (player.passiveIncome - (player.fastTrackStartIncome || 0)));

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-[#1e293b] w-full max-w-md p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)] relative text-center" onClick={e => e.stopPropagation()}>

                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                <div className="text-6xl mb-6 filter drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse">🏆</div>

                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 mb-6 uppercase tracking-widest">
                    Как победить?
                </h2>

                <div className="space-y-6 text-left">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4 group hover:border-pink-500/50 transition-colors">
                        <div className="text-4xl group-hover:scale-110 transition-transform">✨</div>
                        <div>
                            <div className="text-pink-400 font-bold uppercase text-xs tracking-wider mb-1">Способ 1</div>
                            <div className="text-white font-bold leading-tight">Купить свою <span className="text-pink-400">МЕЧТУ</span></div>
                            <div className="text-slate-400 text-xs mt-1">Попадите на розовую клетку с вашей мечтой и купите её.</div>
                        </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                        <div className="h-px bg-slate-700 w-full"></div>
                        <span className="absolute bg-[#1e293b] px-3 text-slate-500 text-xs font-bold uppercase">ИЛИ</span>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4 group hover:border-green-500/50 transition-colors">
                        <div className="text-4xl group-hover:scale-110 transition-transform">💰</div>
                        <div>
                            <div className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">Способ 2</div>
                            <div className="text-white font-bold leading-tight">Увеличить Ден.Поток</div>
                            <div className="text-slate-400 text-xs mt-1">
                                Добавьте <span className="text-green-400">+$50,000</span> к вашему стартовому Денежному Потоку.
                                <br />
                                <span className="text-yellow-400 font-bold">Осталось набрать: ${needed.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="mt-8 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-4 px-12 rounded-full shadow-lg transform hover:-translate-y-1 transition-all uppercase tracking-widest text-sm"
                >
                    Все понятно!
                </button>
            </div>
        </div>
    );
};
