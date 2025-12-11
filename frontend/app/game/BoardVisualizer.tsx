import React from 'react';

export const BoardVisualizer = ({ board, players, animatingPos, currentPlayerId }: any) => {
    // 13x13 Grid Layout
    // Outer Ring (Fast Track): 1-13
    // Inner Ring (Rat Race): 4-10
    // Center: 5-9

    const getPos = (index: number, isFastTrack: boolean) => {
        if (!isFastTrack) {
            // RAT RACE (Indices 0-23)
            // Occupies rows/cols 4-10 (7x7 square)

            // Bottom Row: 0-6 -> (10, 10) to (10, 4)
            if (index <= 6) return { r: 10, c: 10 - index };

            // Left Column: 7-11 -> (9, 4) to (5, 4)
            if (index <= 11) return { r: 10 - (index - 6), c: 4 }; // index 7 -> r9, index 11 -> r5

            // Top Row: 12-18 -> (4, 4) to (4, 10)
            if (index <= 18) return { r: 4, c: 4 + (index - 12) };

            // Right Column: 19-23 -> (5, 10) to (9, 10)
            return { r: 4 + (index - 18), c: 10 };
        } else {
            // FAST TRACK (Indices 0-47 relative to start of FT) or 24-71 absolute?
            // Assuming Fast Track squares are stored in `board` array from index 24 to 71.
            // Let's normalize index:
            const ftIndex = index >= 24 ? index - 24 : index;

            // 48 Squares total
            // Grid 1-13 (13x13)
            // Bottom: 13 squares (0-12) -> (13, 13) to (13, 1)
            if (ftIndex <= 12) return { r: 13, c: 13 - ftIndex };

            // Left: 11 squares (13-23) -> (12, 1) to (2, 1)
            if (ftIndex <= 23) return { r: 13 - (ftIndex - 12), c: 1 };

            // Top: 13 squares (24-36) -> (1, 1) to (1, 13)
            if (ftIndex <= 36) return { r: 1, c: 1 + (ftIndex - 24) };

            // Right: 11 squares (37-47) -> (2, 13) to (12, 13)
            return { r: 2 + (ftIndex - 37), c: 13 };
        }
    };

    const isFastTrackSquare = (index: number) => index >= 24;

    return (
        <div className="w-full h-full grid grid-cols-13 grid-rows-13 gap-1 p-2">
            {/* Draw Path Squares */}
            {board.map((sq: any) => {
                const isFT = isFastTrackSquare(sq.index);
                const { r, c } = getPos(sq.index, isFT);

                // Color Logic
                let bgColor = 'bg-slate-800';
                let borderColor = 'border-slate-600';

                if (isFT) {
                    bgColor = 'bg-slate-900';
                    borderColor = 'border-amber-900/50';
                    if (sq.type === 'CASHFLOW') { bgColor = 'bg-emerald-900/40'; borderColor = 'border-emerald-600'; }
                    if (sq.type === 'Opportunity') { bgColor = 'bg-blue-900/40'; borderColor = 'border-blue-600'; }
                } else {
                    if (sq.type === 'PAYDAY') { bgColor = 'bg-yellow-900/60'; borderColor = 'border-yellow-500'; }
                    if (sq.type === 'OOW') { bgColor = 'bg-red-900/60'; borderColor = 'border-red-500'; }
                    if (sq.type === 'BABY') { bgColor = 'bg-pink-900/60'; borderColor = 'border-pink-500'; }
                    if (sq.type === 'OPPORTUNITY') { bgColor = 'bg-green-900/20'; borderColor = 'border-green-600/50'; }
                }

                // Highlight mechanism can be added if we pass target square index
                const isTarget = false;

                if (isTarget) {
                    // Highlight logic placeholder
                }

                return (
                    <div
                        key={sq.index}
                        className={`
                            relative border rounded flex items-center justify-center text-center transition-all hover:bg-slate-700
                            ${bgColor} ${borderColor}
                            ${isFT ? 'text-[9px]' : 'text-[10px]'}
                        `}
                        style={{
                            gridRow: r,
                            gridColumn: c,
                        }}
                        title={sq.name}
                    >
                        {/* Name/Icon */}
                        <div className="z-10 px-0.5 overflow-hidden flex flex-col items-center leading-none">
                            <span className={`font-bold ${isFT ? 'text-amber-500/70' : 'text-slate-400'}`}>
                                {sq.type === 'PAYDAY' ? '💰' : ''}
                                {sq.type === 'CASHFLOW' ? '🤑' : ''}
                                {sq.type === 'BABY' ? '👶' : ''}
                                {sq.type === 'OOW' ? '📉' : ''}
                            </span>
                            <span className="truncate w-full opacity-80 scale-90">{sq.name}</span>
                        </div>
                        <span className="absolute top-0 right-0.5 text-[6px] text-slate-600 font-mono">{sq.index}</span>
                    </div>
                );
            })}

            {/* Players Tokens */}
            {players.map((p: any, idx: number) => {
                const posIndex = animatingPos[p.id] ?? p.position;
                const { r, c } = getPos(posIndex, p.isFastTrack);

                return (
                    <div
                        key={p.id}
                        className="absolute w-6 h-6 flex items-center justify-center text-lg z-50 drop-shadow-md transition-all duration-300 pointer-events-none"
                        style={{
                            gridRow: r,
                            gridColumn: c,
                            justifySelf: 'center',
                            alignSelf: 'center',
                            transform: `translate(${(idx % 2 === 0 ? -2 : 2) * (players.length > 1 ? 1 : 0)}px, ${(idx > 1 ? 2 : -2) * (players.length > 2 ? 1 : 0)}px)`
                        }}
                    >
                        {p.token || '🔴'}
                    </div>
                );
            })}

            {/* Center Logo Area */}
            <div className="row-start-5 row-end-10 col-start-5 col-end-10 flex items-center justify-center p-4">
                <div className="w-full h-full rounded-full border-4 border-slate-800/50 flex flex-col items-center justify-center bg-radial-gradient from-slate-900 to-black shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent z-10 animate-pulse">MONEO</h1>
                    <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mt-2 z-10 font-bold">Energy of Money</p>
                </div>
            </div>
        </div>
    );
};
