import React from 'react';

// Sticker Mapping
const getSticker = (type: string, name: string) => {
    if (type === 'PAYDAY') return '💰';
    if (type === 'CASHFLOW') return '💸';
    if (type === 'OPPORTUNITY') return '⚡';
    if (type === 'MARKET') return '🏠';
    if (type === 'DOODAD') return '🛍️';
    if (type === 'CHARITY') return '❤️';
    if (type === 'BABY') return '👶';
    if (type === 'DOWNSIZED') return '📉';
    return '⬜';
};

const getGradient = (type: string, isFT: boolean) => {
    if (isFT) {
        if (type === 'CASHFLOW') return 'bg-gradient-to-br from-emerald-900 to-emerald-950 border-emerald-600/50';
        return 'bg-gradient-to-br from-slate-900 to-slate-950 border-amber-900/30';
    }
    if (type === 'PAYDAY') return 'bg-gradient-to-br from-yellow-900/80 to-yellow-950 border-yellow-500/50';
    if (type === 'OPPORTUNITY') return 'bg-gradient-to-br from-green-900/40 to-green-950 border-green-500/30';
    if (type === 'MARKET') return 'bg-gradient-to-br from-blue-900/40 to-blue-950 border-blue-500/30';
    if (type === 'DOODAD') return 'bg-gradient-to-br from-red-900/40 to-red-950 border-red-500/30';
    if (type === 'BABY') return 'bg-gradient-to-br from-pink-900/40 to-pink-950 border-pink-500/30';
    if (type === 'DOWNSIZED') return 'bg-gradient-to-br from-purple-900/40 to-purple-950 border-purple-500/50';
    return 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700';
};

export const BoardVisualizer = ({ board, players, animatingPos, currentPlayerId }: any) => {

    // Helper: Is Fast Track?
    const isFastTrackSquare = (index: number) => index >= 24;

    // Helper: Position Logic
    const getPosStyle = (index: number, isFastTrack: boolean) => {
        if (!isFastTrack) {
            // RAT RACE: CIRCULAR
            const totalSteps = 24;
            const angleOffset = 90;
            const angleDeg = (index * (360 / totalSteps)) + angleOffset;
            const angleRad = angleDeg * (Math.PI / 180);

            const radius = 32; // % of container width
            const x = 50 + radius * Math.cos(angleRad);
            const y = 50 + radius * Math.sin(angleRad);

            return {
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                position: 'absolute' as 'absolute'
            };

        } else {
            // FAST TRACK: GRID
            const ftIndex = index >= 24 ? index - 24 : index;
            let r = 0, c = 0;

            if (ftIndex <= 12) { r = 13; c = 13 - ftIndex; }
            else if (ftIndex <= 23) { r = 13 - (ftIndex - 12); c = 1; }
            else if (ftIndex <= 36) { r = 1; c = 1 + (ftIndex - 24); }
            else { r = 2 + (ftIndex - 37); c = 13; }

            return {
                gridRow: r,
                gridColumn: c,
                position: 'relative' as 'relative'
            };
        }
    };

    return (
        <div className="w-full h-full relative p-4 flex items-center justify-center">

            {/* STICT SQUARE CONTAINER */}
            <div className="relative w-full aspect-square max-w-[85vh] max-h-[85vh]">

                {/* 1. OUTER TRACK (GRID) */}
                <div className="absolute inset-0 grid grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-[repeat(13,minmax(0,1fr))] gap-1 pointer-events-none">
                    {board.filter((sq: any) => isFastTrackSquare(sq.index)).map((sq: any) => {
                        const style = getPosStyle(sq.index, true);
                        const gradient = getGradient(sq.type, true);
                        return (
                            <div
                                key={sq.index}
                                className={`
                                    ${gradient} border backdrop-blur-sm rounded-sm
                                    flex items-center justify-center text-[8px]
                                    opacity-90 shadow-lg pointer-events-auto transition-all hover:scale-110 hover:z-20
                                `}
                                style={style}
                                title={sq.name}
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-lg leading-none filter drop-shadow-md">{getSticker(sq.type, sq.name)}</span>
                                    {sq.type === 'CASHFLOW' && <span className="text-emerald-400 font-bold tracking-tighter">Day</span>}
                                </div>
                                <span className="absolute top-0 right-0.5 text-[5px] text-slate-500 opacity-50">{sq.index}</span>
                            </div>
                        );
                    })}

                    {/* CENTER HUB (Inside Grid Layer) */}
                    <div className="col-start-4 col-end-11 row-start-4 row-end-11 relative rounded-full bg-slate-950 border-4 border-slate-800/80 shadow-2xl flex flex-col items-center justify-center z-10 overflow-hidden pointer-events-auto">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black animate-pulse"></div>
                        <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent transform -skew-x-6">MONEO</h1>
                        <span className="text-[8px] text-slate-500 tracking-[0.4em] uppercase font-bold mt-1">Energy of Money</span>
                    </div>

                </div>

                {/* 2. INNER TRACK (ABSOLUTE) */}
                <div className="absolute inset-[15%] rounded-full border border-slate-800/30 pointer-events-none">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-700/20 animate-spin-slow-reverse opacity-30"></div>
                    {board.filter((sq: any) => !isFastTrackSquare(sq.index)).map((sq: any) => {
                        const style = getPosStyle(sq.index, false);
                        const gradient = getGradient(sq.type, false);
                        return (
                            <div
                                key={sq.index}
                                className={`
                                    w-[14%] h-[14%] rounded-xl shadow-xl border
                                    flex items-center justify-center pointer-events-auto
                                    transition-all hover:scale-125 hover:z-50 duration-300
                                    ${gradient}
                                `}
                                style={style as React.CSSProperties}
                                title={sq.name}
                            >
                                <div className="flex flex-col items-center justify-center transform hover:rotate-0 transition-transform">
                                    <span className="text-xl lg:text-2xl filter drop-shadow-lg">{getSticker(sq.type, sq.name)}</span>
                                    <span className="text-[6px] font-bold text-slate-400 uppercase tracking-tight mt-[-2px] bg-black/40 px-1 rounded-full backdrop-blur-sm hidden lg:block">
                                        {sq.type === 'OPPORTUNITY' ? (sq.name.includes('Big') ? 'Big' : 'Small') : sq.type}
                                    </span>
                                </div>
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-[6px] text-slate-500">{sq.index}</span>
                            </div>
                        );
                    })}
                </div>

                {/* 3. PLAYER TOKENS (ABSOLUTE OVERLAY) */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* For Grid tokens, we need to replicate grid positioning or map to % */}
                    {/* Let's use the same logic but mapped to % */}
                    {players.map((p: any) => {
                        const posIndex = animatingPos[p.id] ?? p.position;
                        const isFT = p.isFastTrack;

                        let style: any = {};

                        if (isFT) {
                            // Map Grid Coords to %
                            const ftIndex = posIndex >= 24 ? posIndex - 24 : posIndex;
                            let r = 0, c = 0;
                            if (ftIndex <= 12) { r = 13; c = 13 - ftIndex; }
                            else if (ftIndex <= 23) { r = 13 - (ftIndex - 12); c = 1; }
                            else if (ftIndex <= 36) { r = 1; c = 1 + (ftIndex - 24); }
                            else { r = 2 + (ftIndex - 37); c = 13; }

                            // Grid is 13x13. Cell center is roughly (Index - 0.5) / 13 * 100%
                            const colPerc = ((c - 0.5) / 13) * 100;
                            const rowPerc = ((r - 0.5) / 13) * 100;

                            style = {
                                left: `${colPerc}%`,
                                top: `${rowPerc}%`,
                                transform: 'translate(-50%, -50%)',
                                position: 'absolute'
                            };

                        } else {
                            // Circular Logic Reuse
                            const totalSteps = 24;
                            const angleOffset = 90;
                            const angleDeg = (posIndex * (360 / totalSteps)) + angleOffset;
                            const angleRad = angleDeg * (Math.PI / 180);
                            const radius = 42;
                            const x = 50 + radius * Math.cos(angleRad);
                            const y = 50 + radius * Math.sin(angleRad);
                            style = {
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: 'translate(-50%, -50%)',
                                position: 'absolute'
                            };
                        }

                        return (
                            <div
                                key={p.id}
                                className={`absolute w-10 h-10 z-50 flex items-center justify-center transition-all duration-300 ease-in-out`}
                                style={style}
                            >
                                <div className={`
                                    w-8 h-8 rounded-full bg-slate-900 border-2 ${p.id === currentPlayerId ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)] scale-110' : 'border-slate-600 shadow-md'}
                                    flex items-center justify-center text-lg relative
                                `}>
                                    {p.token}
                                    <div className="absolute -top-4 bg-slate-900/80 text-white text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                                        {p.name}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};
