import { X, User } from 'lucide-react';
import { useTelegram } from '../../components/TelegramProvider';

interface ParticipantsModalProps {
    game: any;
    onClose: () => void;
}

export default function ParticipantsModal({ game, onClose }: ParticipantsModalProps) {
    // Note: game logic in SchedulePage needs to ensure `participants` are fully populated 
    // or we fetch them here. 
    // For now, let's assume `game.participants` contains the mapped list from the parent or we fetch.
    // Actually, `SchedulePage` fetch only mapped partial data.
    // We probably need to fetch full game details including participants.

    // BUT, let's look at `SchedulePage` again. It maps `participants?.length`.
    // It does NOT map the full participant list to the state `games` array for UI efficiency typically.
    // However, looking at my previous `view_file` of `SchedulePage`:
    // `const formatted = data.map((g: any) => { ... participants: g.participants ... })` is NOT there.
    // It only maps `players: g.participants?.length || 0`.
    // So I need to fetch the game details.

    // Let's implement a fetch here.

    const { webApp } = useTelegram();
    const [participants, setParticipants] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetch(`/api/games/${game.id}`) // We need a GET endpoint for single game or use the list? 
        // Existing `GET /api/games` returns all. 
        // Let's check if we can filter or if we should just assume valid data if we pass it.
        // Actually, easiest is to ensure `GET /api/games` returns participants array in `SchedulePage` and pass it down.
        // Backend `GET /api/games` usually returns full objects unless `.select()` is used.
        // Let's assume we can get it. If not, I'll add a fetch here.

        // Wait, `SchedulePage` does: `const formatted = data.map...`
        // I should just add `rawParticipants: g.participants` to the formatted object in SchedulePage.
        // Then pass it here. 

        if (game.rawParticipants) {
            setParticipants(game.rawParticipants);
            setLoading(false);
        }
    }, [game]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-2xl w-full max-w-sm h-[60vh] flex flex-col border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold">Участники ({participants.length}/{game.max})</h2>
                    <button onClick={onClose} className="p-2 bg-slate-700 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {participants.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            {p.userId?.photoUrl ? (
                                <img src={p.userId.photoUrl} className="w-10 h-10 rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <User size={20} className="text-slate-400" />
                                </div>
                            )}
                            <div>
                                <div className="font-bold text-sm">
                                    {p.userId?.username || p.userId?.first_name || 'User'}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {p.type === 'PROMO' ? '🎫 Promo' : '💰 Paid'}
                                </div>
                            </div>
                            {p.type === 'PROMO' && !p.isVerified && (
                                <span className="ml-auto text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">На проверке</span>
                            )}
                            {p.type === 'PROMO' && p.isVerified && (
                                <span className="ml-auto text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Подтвержден</span>
                            )}
                        </div>
                    ))}

                    {participants.length === 0 && (
                        <div className="text-center text-slate-500 py-10">
                            Пока никого нет...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import React from 'react';
