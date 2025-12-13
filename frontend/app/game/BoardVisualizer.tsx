import React from 'react';

// Sticker Mapping
const getSticker = (type: string, name: string) => {
    if (type === 'STOCK_EXCHANGE') return '📈';
    if (type === 'PAYDAY') return '💰';
    if (type === 'CASHFLOW') return '💸';
    if (type === 'DEAL' || type === 'OPPORTUNITY') return '💼';
    if (type === 'MARKET') return '🏪';
    if (type === 'EXPENSE' || type === 'DOODAD') return '🛍️';
    if (type === 'CHARITY') return '❤️';
    if (type === 'BABY') return '👶';

    // Detailed Loss Mapping
    if (type === 'LOSS') {
        if (name.includes('Аудит')) return '👮';
        if (name.includes('Кража')) return '🕵️';
        if (name.includes('Развод')) return '💔';
        if (name.includes('Пожар')) return '🔥';
        if (name.includes('Рейдер')) return '🏴‍☠️';
        return '📉';
    }

    if (type === 'DOWNSIZED') return '📉';
    if (type === 'BUSINESS') return '🏢';
    if (type === 'DREAM') return '✨';
    if (type === 'LOTTERY') return '🎰';
    return '⬜';
};

const getGradient = (type: string, isFT: boolean) => {
    if (isFT) {
        if (type === 'CASHFLOW' || type === 'PAYDAY') return 'bg-gradient-to-br from-emerald-900 to-emerald-950 border-emerald-600/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
        if (type === 'BUSINESS') return 'bg-gradient-to-br from-blue-900 to-blue-950 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
        if (type === 'DREAM') return 'bg-gradient-to-br from-fuchsia-900 to-purple-950 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]';
        if (type === 'LOSS') return 'bg-gradient-to-br from-red-900 to-red-950 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
        if (type === 'STOCK_EXCHANGE') return 'bg-gradient-to-br from-indigo-900 to-indigo-950 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]';
        if (type === 'LOTTERY') return 'bg-gradient-to-br from-yellow-700 to-amber-900 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
        return 'bg-gradient-to-br from-slate-900 to-slate-950 border-amber-900/30';
    }
    // RAT RACE COLORS
    if (type === 'PAYDAY') return 'bg-gradient-to-br from-yellow-600/20 to-yellow-900/80 border-yellow-500/50'; // Yellow
    if (type === 'DEAL' || type === 'OPPORTUNITY') return 'bg-gradient-to-br from-green-600/20 to-green-900/80 border-green-500/50'; // Green
    if (type === 'MARKET') return 'bg-gradient-to-br from-blue-600/20 to-blue-900/80 border-blue-500/50'; // Blue
    if (type === 'EXPENSE' || type === 'DOODAD') return 'bg-gradient-to-br from-pink-600/20 to-pink-900/80 border-pink-500/50'; // Pink
    if (type === 'BABY') return 'bg-gradient-to-br from-purple-600/20 to-purple-900/80 border-purple-500/50'; // Purple/Violet
    if (type === 'CHARITY') return 'bg-gradient-to-br from-orange-600/20 to-orange-900/80 border-orange-500/50'; // Orange
    if (type === 'DOWNSIZED') return 'bg-gradient-to-br from-slate-950 to-black border-slate-600'; // Black

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
            const angleDegCorrected = angleDeg; // removed offset logic if redundant, but keeping for rotation
            const angleRad = angleDeg * (Math.PI / 180);

            const radius = 46; // Maximized radius
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
        <div className="w-full h-full relative p-2 flex items-center justify-center">

            {/* STICT SQUARE CONTAINER */}
            <div className="relative aspect-square h-full max-h-full max-w-full">

                {/* 1. OUTER TRACK (GRID) */}
                <div className="absolute inset-0 grid grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-[repeat(13,minmax(0,1fr))] pointer-events-none">
                    {board.filter((sq: any) => isFastTrackSquare(sq.index)).map((sq: any) => {
                        const style = getPosStyle(sq.index, true);
                        const gradient = getGradient(sq.type, true);
                        return (
                            <div
                                key={sq.index}
                                className={`
                                    ${gradient} border border-slate-800/50 backdrop-blur-sm rounded-sm
                                    flex items-center justify-center text-[10px]
                                    opacity-90 shadow-lg pointer-events-auto transition-all hover:scale-110 hover:z-20
                                `}
                                style={style}
                                title={sq.name}
                            >
                                <div className="flex flex-col items-center justify-between h-full py-1 w-full overflow-hidden">
                                    <span className="text-[6px] xs:text-[7px] leading-tight text-center px-0.5 text-slate-200 font-medium line-clamp-2 h-6 flex items-center">{sq.name}</span>
                                    <span className="text-lg leading-none filter drop-shadow-md my-0.5">{getSticker(sq.type, sq.name)}</span>

                                    <div className="flex flex-col items-center leading-none space-y-0.5">
                                        {sq.cost && <span className="text-[6px] text-red-300 font-mono">-${(sq.cost / 1000).toFixed(0)}k</span>}
                                        {sq.cashflow && <span className="text-[6px] text-green-300 font-bold font-mono">+${(sq.cashflow / 1000).toFixed(0)}k</span>}
                                        {sq.type === 'CASHFLOW' && <span className="text-emerald-400 font-bold tracking-tighter text-[6px]">Day</span>}
                                    </div>
                                </div>
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-[8px] text-slate-500 z-10">{sq.index}</span>
                            </div>
                        );
                    })}

                    {/* CENTER HUB (Inside Grid Layer) */}
                    <div className="col-start-4 col-end-11 row-start-4 row-end-11 relative rounded-full bg-slate-950 border-4 border-slate-800/80 shadow-2xl flex flex-col items-center justify-center z-10 overflow-hidden pointer-events-auto">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black animate-pulse"></div>
                        <h1 className="text-3xl lg:text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent transform -skew-x-6 drop-shadow-2xl">MONEO</h1>
                        <span className="text-[10px] text-slate-500 tracking-[0.4em] uppercase font-bold mt-1">Energy of Money</span>
                    </div>

                </div>

                {/* Reduced inset to maximize size (15% -> 4% -> 12% to fix overlap) */}
                <div className="absolute inset-[12%] rounded-full border border-slate-800/30 pointer-events-none">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-700/20 animate-spin-slow-reverse opacity-30"></div>
                    {board.filter((sq: any) => !isFastTrackSquare(sq.index)).map((sq: any) => {
                        const style = getPosStyle(sq.index, false);
                        const gradient = getGradient(sq.type, false);
                        return (
                            <div
                                key={sq.index}
                                className={`
                                    w-[13%] h-[13%] rounded-xl shadow-xl border
                                    flex items-center justify-center pointer-events-auto
                                    transition-all hover:scale-125 hover:z-50 duration-300
                                    ${gradient}
                                `}
                                style={style as React.CSSProperties}
                                title={sq.name}
                            >
                                <div className="flex flex-col items-center justify-center transform hover:rotate-0 transition-transform">
                                    <span className="text-xl lg:text-3xl filter drop-shadow-lg">{getSticker(sq.type, sq.name)}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-[-2px] bg-black/40 px-1.5 rounded-full backdrop-blur-sm hidden lg:block scale-75">
                                        {sq.type === 'OPPORTUNITY' ? (sq.name.includes('Big') ? 'Big' : 'Small') : sq.type}
                                    </span>
                                </div>
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-[8px] text-slate-500">{sq.index}</span>
                            </div>
                        );
                    })}
                </div>

                {/* 3. PLAYER TOKENS (ABSOLUTE OVERLAY) */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Used same inset as Inner Track to align coordinate systems */}
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

                            // Grid is 13x13.
                            // However, we are inside a container that might be inset differently?
                            // Wait, the outer grid is inset-0. The Players container needs to be inset-0 for Fast Track.
                            // BUT, for Rat Race, we need inset-[4%].
                            // This is conflicting. We should split the container or just use logic.

                            // Let's use inset-0 for this container and adjusting Rat Race logic.
                            // Actually, I put inset-[4%] on this container. This breaks Fast Track tokens.
                            // I need to reset this container to inset-0 and handle Rat Race radius manually or use sub-containers.
                            // To be safe, I will use inset-0 for the Player Container and match the Math.
                        }

                        // RE-CALCULATING STYLE IN RENDER block to be cleaner (Logic moved above in full file replacement if needed, but here simple inline fix)
                        if (isFT) {
                            // Fast Track (Grid) - Needs to be relative to WHOLE BOARD (inset-0)
                            const ftIndex = posIndex >= 24 ? posIndex - 24 : posIndex;
                            let r = 0, c = 0;
                            if (ftIndex <= 12) { r = 13; c = 13 - ftIndex; }
                            else if (ftIndex <= 23) { r = 13 - (ftIndex - 12); c = 1; }
                            else if (ftIndex <= 36) { r = 1; c = 1 + (ftIndex - 24); }
                            else { r = 2 + (ftIndex - 37); c = 13; }

                            const colPerc = ((c - 0.5) / 13) * 100;
                            const rowPerc = ((r - 0.5) / 13) * 100;

                            // Since the player container is inset-[4%], the 0-100% is smaller than the grid.
                            // WE MUST REMOVE inset-[4%] from player container if we want to support Fast Track.
                            // But Rat Race depends on radius. Radius 46 is relative to... what?
                            // In getPosStyle, radius 46 is relative to the container.
                            // If I use inset-0 for player container:
                            // Rat Race: Radius 46 (relative to full board).
                            // Inner Track container: inset-[4%]. 
                            // If Inner Track container is inset 4%, its width is 92%.
                            // A radius of 46% of 92% is ~42% of full board.
                            // I want radius 46% of FULL BOARD.
                            // So: Player Container -> inset-0.
                            //     Rat Race Tokens -> Radius 46 (matches Full Board).
                            //     Inner Track Squares -> Must be positioned relative to Full Board OR adjusted.
                            //     Actually, the Inner Track SQUARES loops use `getPosStyle`.
                            //     If I put Inner Track SQUARES in `inset-0` instead of `inset-[4%]`, then `Radius 46` places them correctly relative to full board.
                            //     The border/dashed rings might need separate div.

                            style = {
                                left: `${colPerc}%`,
                                top: `${rowPerc}%`,
                                transform: 'translate(-50%, -50%)',
                                position: 'absolute'
                            };
                        } else {
                            // Rat Race (Circular)
                            // Radius 46 relative to inset-0 container
                            const totalSteps = 24;
                            const angleOffset = 90;
                            const angleDeg = (posIndex * (360 / totalSteps)) + angleOffset;
                            const angleRad = angleDeg * (Math.PI / 180);
                            const radius = 35; // Adjusted for inset-0 container (46 * 0.76)
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
