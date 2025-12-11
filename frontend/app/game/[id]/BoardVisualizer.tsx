import React from 'react';

export const BoardVisualizer = ({ board, players, animatingPos, currentPlayerId }: any) => {
    // 24 Steps Rat Race - Rectangular Path
    // 9x9 Grid: 0-8 indices
    // Inner Loop: (2,2) to (6,6) approx

    // Mapping 0-23 to Grid Coordinates (row, col)
    const getPos = (index: number) => {
        // Bottom Row: 0-6 -> (7, 7) to (7, 1) [Right to Left]
        if (index <= 6) return { r: 7, c: 7 - index };
        // Left Column: 7-11 -> (6, 1) to (2, 1) [Bottom to Top]
        if (index <= 11) return { r: 7 - (index - 6), c: 1 };
        // Top Row: 12-18 -> (1, 1) to (1, 7) [Left to Right]
        if (index <= 18) return { r: 1, c: 1 + (index - 12) };
        // Right Column: 19-23 -> (2, 7) to (6, 7) [Top to Bottom]
        return { r: 1 + (index - 18), c: 7 };
    };

    return (
        <>
            {/* Draw Path Squares */}
            {board.slice(0, 24).map((sq: any) => {
                const { r, c } = getPos(sq.index);
                return (
                    <div
                        key={sq.index}
                        className={`
                            border border-slate-600 rounded-lg flex items-center justify-center text-xs text-center relative
                            ${sq.type === 'PAYDAY' ? 'bg-yellow-900/50 border-yellow-500' : 'bg-slate-800'}
                            ${sq.type === 'OOW' ? 'bg-red-900/50 border-red-500' : ''}
                            ${sq.type === 'BABY' ? 'bg-pink-900/50 border-pink-500' : ''}
                        `}
                        style={{
                            gridRow: r,
                            gridColumn: c,
                        }}
                    >
                        <span className="z-10 text-[10px] uppercase font-bold text-slate-400">{sq.name}</span>
                        <span className="absolute top-0.5 right-1 text-[8px] text-slate-600">{sq.index}</span>

                        {/* Icon based on Type */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-3xl">
                            {sq.type === 'MARKET' && '📈'}
                            {sq.type === 'DEAL' && '🤝'}
                            {sq.type === 'EXPENSE' && '💸'}
                            {sq.type === 'BABY' && '👶'}
                            {sq.type === 'PAYDAY' && '💰'}
                        </div>
                    </div>
                );
            })}

            {/* Players Tokens */}
            {players.map((p: any) => {
                if (p.isFastTrack) return null; // Logic for Fast Track separate
                const posIndex = animatingPos[p.id] ?? p.position;
                const { r, c } = getPos(posIndex);

                return (
                    <div
                        key={p.id}
                        className="absolute w-8 h-8 flex items-center justify-center text-xl transition-all duration-300 z-50 drop-shadow-lg"
                        style={{
                            // Convert Grid Row/Col to pixels roughly or use grid alignment if parent relative
                            // Using direct grid placement for the token div if container is grid
                            gridRow: r,
                            gridColumn: c,
                            justifySelf: 'center',
                            alignSelf: 'center',
                            marginTop: (players.findIndex((pl: any) => pl.id === p.id) * 4) - 2 // Offset for overlaps
                        }}
                    >
                        {p.token || '🔴'}
                    </div>
                );
            })}

            {/* Center Logo */}
            <div className="row-start-3 row-end-6 col-start-3 col-end-6 bg-slate-950 rounded-full border-4 border-slate-700 flex items-center justify-center shadow-inner">
                <div className="text-center">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-500 to-amber-700 bg-clip-text text-transparent">MONEO</h1>
                    <p className="text-slate-500 text-xs tracking-widest mt-2">ENERGY OF MONEY</p>
                </div>
            </div>
        </>
    );
};
