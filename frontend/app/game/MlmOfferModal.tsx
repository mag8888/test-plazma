import React from 'react';

interface MlmOfferData {
    targetId: string;
    inviterName: string;
    businessName: string;
    cost: number;
    income: number;
}

interface MlmOfferModalProps {
    data: MlmOfferData | null;
    onAccept: () => void;
    onDecline: () => void;
}

export const MlmOfferModal: React.FC<MlmOfferModalProps> = ({ data, onAccept, onDecline }) => {
    if (!data) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm bg-[#1a1b1e] border border-yellow-500/30 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-300 overflow-hidden">

                {/* Glow Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/20 blur-3xl rounded-full pointer-events-none" />

                <div className="relative z-10">
                    <div className="text-4xl mb-4">🤝</div>

                    <h2 className="text-2xl font-bold text-white mb-2">Бизнес Партнерство!</h2>

                    <div className="text-gray-300 mb-6">
                        <span className="text-yellow-400 font-bold">{data.inviterName}</span> приглашает вас стать партнером в <span className="text-blue-400 font-bold">{data.businessName}</span>.
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3 border border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Стоимость входа:</span>
                            <span className="text-red-400 font-mono font-bold">-${data.cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Пассивный доход:</span>
                            <span className="text-green-400 font-mono font-bold">+${data.income.toLocaleString()}/мес</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onDecline}
                            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-medium transition-colors"
                        >
                            Отказаться
                        </button>
                        <button
                            onClick={onAccept}
                            className="px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-105"
                        >
                            Принять
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
