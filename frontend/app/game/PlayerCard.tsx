import React from 'react';

interface PlayerCardProps {
    player: any;
    isCurrentTurn: boolean;
    index: number;
}

export const PlayerCard = ({ player, isCurrentTurn, index }: PlayerCardProps) => {
    const getAvatarColor = (idx: number) => {
        const colors = [
            'from-red-500 to-orange-500',
            'from-orange-500 to-amber-500',
            'from-amber-500 to-yellow-500',
            'from-green-500 to-emerald-500',
            'from-teal-500 to-cyan-500',
            'from-blue-500 to-indigo-500',
            'from-purple-500 to-pink-500',
            'from-pink-500 to-rose-500',
            'from-slate-500 to-gray-500'
        ];
        return colors[idx % colors.length];
    };

    return (
        <div className={`relative bg-[#1e293b]/80 backdrop-blur-sm rounded-xl p-3 border transition-all ${isCurrentTurn
            ? 'border-green-500/60 shadow-lg shadow-green-500/20 ring-2 ring-green-500/30'
            : 'border-slate-700/50'
            }`}>
            {/* Turn Indicator */}
            {isCurrentTurn && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-[#1e293b]"></div>
            )}

            {/* Avatar */}
            <div className="flex items-center gap-2 mb-2">
                {player.photo_url ? (
                    <img
                        src={player.photo_url}
                        alt={player.name}
                        className="w-10 h-10 rounded-full border-2 border-slate-600"
                    />
                ) : (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center text-white font-bold text-sm border-2 border-slate-600`}>
                        {player.token || player.name?.[0] || '?'}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{player.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{player.professionName || 'Игрок'}</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-1 text-[9px]">
                <div className="bg-[#0f172a]/60 rounded px-1.5 py-1">
                    <div className="text-slate-500 uppercase font-bold">Нал</div>
                    <div className="text-green-400 font-mono font-bold">${(player.cash || 0).toLocaleString()}</div>
                </div>
                <div className="bg-[#0f172a]/60 rounded px-1.5 py-1">
                    <div className="text-slate-500 uppercase font-bold">ДП</div>
                    <div className={`${(player.cashflow || 0) < 0 ? 'text-red-400' : 'text-blue-400'} font-mono font-bold`}>
                        {(player.cashflow || 0) > 0 ? '+' : ''}${(player.cashflow || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Position Badge */}
            {player.isFastTrack && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-amber-500 text-[#0f172a] text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">
                    FT
                </div>
            )}

            {/* Bankruptcy Badge */}
            {player.isBankrupted && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                    <span className="text-red-500 font-bold text-xs">РАЗОРЕН</span>
                </div>
            )}
        </div>
    );
};
