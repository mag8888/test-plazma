import React, { useState } from 'react';

interface CongratulateModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetPlayerName: string;
    targetPlayerId: string; // Socket ID
    me: any; // Use any to avoid import issues or define subset { cash: number }
    roomId: string;
    socket: any;
}

const CongratulateModal = ({ isOpen, onClose, targetPlayerName, targetPlayerId, me, roomId, socket }: CongratulateModalProps) => {
    const [amount, setAmount] = useState<number>(0);

    if (!isOpen) return null;

    const maxGift = me.cash;

    const handleGift = () => {
        if (amount <= 0 || amount > maxGift) return;
        socket.emit('player_give_cash', { roomId, toPlayerId: targetPlayerId, amount });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleIn relative">
                {/* Header with Confetti Visual */}
                <div className="relative bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-center">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/effects/confetti.png')] opacity-20 btn-background-animate"></div>
                    <div className="relative z-10 text-5xl mb-2 animate-bounce">👶</div>
                    <h2 className="relative z-10 text-xl font-bold text-white">У {targetPlayerName} родился ребенок!</h2>
                    <p className="relative z-10 text-white/80 text-xs mt-1">Поздравьте игрока с этим событием</p>
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-white/50 hover:text-white p-2"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-slate-400 text-xs uppercase font-bold mb-2">
                            Сумма подарка (Макс: ${maxGift.toLocaleString()})
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                            < input
                                type="number"
                                value={amount === 0 ? '' : amount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setAmount(Math.min(val, maxGift));
                                }}
                                className="w-full bg-slate-800 text-white font-mono text-lg py-3 pl-8 pr-4 rounded-xl border border-slate-700 focus:border-purple-500 outline-none transition-colors"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm uppercase transition-colors"
                        >
                            Пропустить
                        </button>
                        <button
                            onClick={handleGift}
                            disabled={amount <= 0 || amount > maxGift}
                            className="flex-3 w-3/5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm uppercase shadow-lg active:scale-95 transition-all"
                        >
                            🎁 Подарить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CongratulateModal;
