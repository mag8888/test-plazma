import React, { useState } from 'react';

interface MlmSlot {
    status: 'EMPTY' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
    playerId?: string;
    timestamp?: number;
}

interface MlmState {
    cardId: string;
    inviterId: string;
    slots: MlmSlot[];
}

interface Player {
    id: string;
    name: string;
    photo_url?: string;
}

interface MlmNetworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    mlmState?: MlmState;
    players: Player[];
    currentUserId: string;
    onInvite: (targetId: string, slotIndex: number) => void;
    onFinish: () => void;
}

export const MlmNetworkModal: React.FC<MlmNetworkModalProps> = ({ isOpen, onClose, mlmState, players, currentUserId, onInvite, onFinish }) => {
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

    if (!isOpen || !mlmState) return null;

    // Filter available friends (not me, not already in a slot)
    const availablePlayers = players.filter(p =>
        p.id !== currentUserId &&
        !mlmState.slots.some(s => s.playerId === p.id && s.status !== 'DECLINED') // Allow re-inviting declined? Maybe not for now.
    );

    const handleInviteClick = (slotIndex: number) => {
        setSelectedSlot(slotIndex);
    };

    const confirmInvite = (targetId: string) => {
        if (selectedSlot !== null) {
            onInvite(targetId, selectedSlot);
            setSelectedSlot(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#1a1b1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        🌐 <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Моя Сеть</span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-gray-400 text-sm text-center">
                        Пригласите партнеров в свой бизнес. Вы получаете доход за каждого активного партнера.
                    </p>

                    <div className="grid gap-4">
                        {mlmState.slots.map((slot, index) => {
                            const partner = slot.playerId ? players.find(p => p.id === slot.playerId) : null;

                            return (
                                <div key={index} className="relative p-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 
                                            ${slot.status === 'EMPTY' ? 'border-dashed border-gray-600 text-gray-600' : ''}
                                            ${slot.status === 'PENDING' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10 animate-pulse' : ''}
                                            ${slot.status === 'ACCEPTED' ? 'border-green-500 text-green-500 bg-green-500/10' : ''}
                                            ${slot.status === 'DECLINED' ? 'border-red-500 text-red-500 bg-red-500/10' : ''}
                                        `}>
                                            {slot.status === 'EMPTY' ? (index + 1) :
                                                slot.status === 'ACCEPTED' ? '✓' :
                                                    slot.status === 'DECLINED' ? '✕' : '⏳'}
                                        </div>

                                        <div>
                                            <div className="font-semibold text-white">
                                                {slot.status === 'EMPTY' ? 'Свободное место' :
                                                    partner ? partner.name : 'Неизвестный'}
                                            </div>
                                            <div className="text-xs text-gray-500 status-text">
                                                {slot.status === 'EMPTY' ? 'Пригласить партнера' :
                                                    slot.status === 'PENDING' ? 'Ожидание ответа...' :
                                                        slot.status === 'ACCEPTED' ? 'Активный партнер' :
                                                            'Отклонено'}
                                            </div>
                                        </div>
                                    </div>

                                    {slot.status === 'EMPTY' && (
                                        <button
                                            onClick={() => handleInviteClick(index)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-blue-300 text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Пригласить
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={onFinish}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl text-lg uppercase tracking-wider shadow-lg transition-transform active:scale-[0.98] mt-4"
                    >
                        ✅ Завершить и Купить
                    </button>
                </div>

                {/* Player Select Overlay */}
                {selectedSlot !== null && (
                    <div className="absolute inset-0 bg-[#1a1b1e] z-10 flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="p-4 border-b border-white/10 flex items-center gap-2">
                            <button onClick={() => setSelectedSlot(null)} className="text-gray-400 hover:text-white mr-2">←</button>
                            <h3 className="font-bold text-white">Выберите партнера</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {availablePlayers.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">Нет доступных игроков для приглашения</div>
                            ) : (
                                availablePlayers.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => confirmInvite(p.id)}
                                        className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3 transition-all text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {p.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-white font-medium">{p.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
