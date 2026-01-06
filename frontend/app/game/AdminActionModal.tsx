"use client";

import { useEffect, useState } from 'react';

export type AdminActionType = 'SKIP' | 'KICK' | 'GIFT' | 'FORCE_MOVE' | 'TRANSFER_DEAL' | null;

interface AdminActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: AdminActionType;
    targetPlayer: { id: string; name: string } | null;
    players?: any[]; // For Transfer Deal selection
    onConfirm: (amount?: number, targetId?: string) => void;
}

export const AdminActionModal = ({ isOpen, onClose, type, targetPlayer, players, onConfirm }: AdminActionModalProps) => {
    const [amount, setAmount] = useState<number>(1000);
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');

    // Reset amount when opening
    useEffect(() => {
        if (isOpen) {
            setAmount(1000);
            setSelectedTargetId('');
        }
    }, [isOpen]);

    if (!isOpen || !type || !targetPlayer) return null;

    const getTitle = () => {
        switch (type) {
            case 'SKIP': return 'Пропустить ход?';
            case 'KICK': return 'Выгнать игрока?';
            case 'GIFT': return 'Подарить деньги';
            case 'FORCE_MOVE': return 'Сделать ход за игрока?';
            case 'TRANSFER_DEAL': return 'Передать сделку';
            default: return '';
        }
    };

    const getDescription = () => {
        switch (type) {
            case 'SKIP': return `Вы уверены, что хотите пропустить ход игрока ${targetPlayer.name}?`;
            case 'KICK': return `Вы уверены, что хотите кикнуть игрока ${targetPlayer.name}? Это действие нельзя отменить.`;
            case 'GIFT': return `Введите сумму, которую хотите подарить игроку ${targetPlayer.name}. Деньги будут добавлены к его балансу.`;
            case 'FORCE_MOVE': return `Вы выполните действие (бросок кубика или принятие решения) за игрока ${targetPlayer.name}.`;
            case 'TRANSFER_DEAL': return `Выберите игрока, которому хотите передать текущую активную сделку (карточку) от ${targetPlayer.name}.`;
            default: return '';
        }
    };

    const handleConfirm = () => {
        if (type === 'GIFT') {
            onConfirm(amount);
        } else if (type === 'TRANSFER_DEAL') {
            if (selectedTargetId) onConfirm(undefined, selectedTargetId);
        } else {
            onConfirm();
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-sm p-6 rounded-3xl border border-slate-700 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                <div className="text-center mb-6">
                    <div className="text-4xl mb-4 filter drop-shadow-md">
                        {type === 'SKIP' ? '🚫' : type === 'KICK' ? '👢' : type === 'GIFT' ? '💵' : type === 'FORCE_MOVE' ? '🎲' : '🤝'}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{getTitle()}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{getDescription()}</p>
                </div>

                {type === 'GIFT' && (
                    <div className="mb-6">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all font-mono text-lg text-center"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {type === 'TRANSFER_DEAL' && players && (
                    <div className="mb-6">
                        <select
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all text-sm appearance-none"
                            value={selectedTargetId}
                            onChange={e => setSelectedTargetId(e.target.value)}
                        >
                            <option value="">Выберите игрока</option>
                            {players.filter(p => p.id !== targetPlayer.id).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors uppercase text-xs tracking-wider"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={type === 'TRANSFER_DEAL' && !selectedTargetId}
                        className={`font-bold py-3 rounded-xl transition-all shadow-lg text-white uppercase text-xs tracking-wider flex items-center justify-center gap-2
                            ${type === 'SKIP' || type === 'KICK' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' :
                                type === 'TRANSFER_DEAL' && !selectedTargetId ? 'bg-slate-600 opacity-50 cursor-not-allowed' :
                                    'bg-green-600 hover:bg-green-500 shadow-green-900/20'}
                        `}
                    >
                        {type === 'GIFT' ? 'Подарить' : 'Подтвердить'}
                    </button>
                </div>
            </div>
        </div>
    );
};
