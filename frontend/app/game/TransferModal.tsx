"use client";

import { useState } from 'react';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: any;
    players: any[];
    myId: string;
    onTransfer: (toId: string) => void;
}

export const TransferModal = ({ isOpen, onClose, asset, players, myId, onTransfer }: TransferModalProps) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState('');

    if (!isOpen || !asset) return null;

    const availablePlayers = players.filter(p => p.id !== myId);

    const handleConfirm = () => {
        if (selectedPlayerId) {
            onTransfer(selectedPlayerId);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                <h2 className="text-xl font-bold text-white mb-2">Передача Актива</h2>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 mb-6">
                    <div className="text-sm text-slate-400 mb-1">Актив:</div>
                    <div className="font-bold text-lg text-white">{asset.title}</div>
                    <div className="font-mono text-green-400 text-sm mt-1">+${asset.cashflow} / мес</div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="text-sm text-slate-400 uppercase tracking-wider font-bold">Кому передать?</div>

                    {availablePlayers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {availablePlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPlayerId(p.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group
                                        ${selectedPlayerId === p.id
                                            ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40'
                                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-500'}`}
                                >
                                    <div className="text-xl bg-slate-950 w-10 h-10 flex items-center justify-center rounded-lg border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                                        {p.token}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold ${selectedPlayerId === p.id ? 'text-white' : 'text-slate-200'}`}>{p.name}</div>
                                    </div>
                                    {selectedPlayerId === p.id && <span className="text-white text-lg">✓</span>}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-4 italic">Нет других игроков</div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedPlayerId}
                        className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Передать
                    </button>
                </div>
            </div>
        </div>
    );
};
