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

    if (type === 'DOWNSIZED') return '🤒';
    if (type === 'BUSINESS') return '🏢';
    if (type === 'DREAM') return '✨';
    if (type === 'LOTTERY') return '🎰';
    return '⬜';
};

const getGradient = (type: string, isFT: boolean) => {
    if (isFT) {
        // FAST TRACK THEME: GOLD / PLATINUM / VIBRANT
        if (type === 'CASHFLOW' || type === 'PAYDAY') return 'bg-gradient-to-br from-yellow-800 to-amber-950 border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
        if (type === 'BUSINESS') return 'bg-gradient-to-br from-emerald-800 to-green-950 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        if (type === 'DREAM') return 'bg-gradient-to-br from-fuchsia-800 to-purple-950 border-fuchsia-500/60 shadow-[0_0_20px_rgba(217,70,239,0.4)]';
        if (type === 'LOSS') return 'bg-gradient-to-br from-red-800 to-rose-950 border-red-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
        if (type === 'STOCK_EXCHANGE') return 'bg-gradient-to-br from-indigo-800 to-blue-950 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.4)]';
        if (type === 'LOTTERY') return 'bg-gradient-to-br from-orange-700 to-amber-900 border-orange-500/60 shadow-[0_0_20px_rgba(245,158,11,0.4)]';
        return 'bg-gradient-to-br from-slate-900 to-slate-950 border-amber-500/30';
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

export const BoardVisualizer = React.memo(({ board, players, animatingPos, currentPlayerId, onSquareClick, zoom = 1, showExitButton, onExitClick }: any) => {

    // Helper: Is Fast Track?
    const isFastTrackSquare = (index: number) => index >= 24;

    // Helper: Position Logic
    const getPosStyle = (index: number, isFastTrack: boolean) => {
        if (!isFastTrack) {
            // RAT RACE: CIRCULAR (Restored)
            const totalSteps = 24;
            const angleOffset = 90;
            const angleDeg = (index * (360 / totalSteps)) + angleOffset;
            const angleRad = angleDeg * (Math.PI / 180);

            // Responsive Radius?
            // On mobile we want it max size.
            // 46% is close to edge (50% is edge).
            const radius = 40;
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

    // Group players to handle overlap
    const positionGroups: { [key: number]: string[] } = {};
    players.forEach((p: any) => {
        const pos = animatingPos[p.id] ?? p.position;
        if (!positionGroups[pos]) positionGroups[pos] = [];
        positionGroups[pos].push(p.id);
    });

    return (
        <div className="w-full h-full relative p-2 flex items-center justify-center">

            {/* STICT SQUARE CONTAINER */}
            <div className="relative aspect-square h-full max-h-full max-w-full" style={{ containerType: 'size' }}>

                {/* 1. OUTER TRACK (GRID) */}
                <div className="absolute inset-0 grid grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-[repeat(13,minmax(0,1fr))] pointer-events-none">
                    {board.filter((sq: any) => isFastTrackSquare(sq.index)).map((sq: any) => {
                        const style = getPosStyle(sq.index, true);
                        const gradient = getGradient(sq.type, true);
                        const dreamers = players.filter((p: any) => p.dream === sq.name && sq.type === 'DREAM');
                        return (
                            <div
                                key={sq.index}
                                onClick={() => onSquareClick && onSquareClick(sq)}
                                className={`
                                    ${gradient} border border-slate-800/50 backdrop-blur-sm rounded-sm
                                    flex items-center justify-center text-[10px]
                                    opacity-90 shadow-lg pointer-events-auto transition-all hover:scale-110 hover:z-20 cursor-pointer
                                    relative
                                `}
                                style={style}
                                title={sq.name}
                            >
                                <div className="absolute inset-x-0.5 top-0.5 bottom-0.5 flex flex-col justify-between items-center overflow-hidden">
                                    {/* Sticker - Centered but slightly lower to allow top text */}
                                    <span style={{ fontSize: `${5 * zoom}cqw` }} className="leading-none filter drop-shadow-lg transform hover:scale-110 transition-transform absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 grayscale-[0.3]">
                                        {getSticker(sq.type, sq.name)}
                                    </span>

                                    {/* NAME - Full Width, Bold, Top */}
                                    <div className="w-full flex items-center justify-center z-10">
                                        <span style={{ fontSize: `${1.4 * zoom}cqw`, lineHeight: '1.1' }} className="w-full text-center font-black text-slate-100 uppercase tracking-tighter drop-shadow-md break-words line-clamp-2">
                                            {sq.name}
                                        </span>
                                    </div>

                                    {/* Cost/Cashflow - Bottom */}
                                    <div className="flex flex-col items-center leading-none space-y-[0.2cqw] z-10 mt-auto">
                                        {sq.cost && <span style={{ fontSize: `${1.0 * zoom}cqw` }} className="text-red-300 font-mono font-bold bg-black/40 px-1 rounded">-${(sq.cost / 1000).toFixed(0)}k</span>}
                                        {sq.cashflow && <span style={{ fontSize: `${1.0 * zoom}cqw` }} className="text-green-300 font-bold font-mono shadow-black drop-shadow-sm bg-black/40 px-1 rounded">+${(sq.cashflow / 1000).toFixed(0)}k</span>}
                                        {sq.type === 'CASHFLOW' && <span style={{ fontSize: `${1.2 * zoom}cqw` }} className="text-emerald-400 font-black tracking-tighter uppercase shadow-black drop-shadow-sm">Day</span>}
                                    </div>
                                </div>

                                <span className="absolute -top-[0.2cqw] -right-[0.2cqw] w-[1.8cqw] h-[1.8cqw] bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-[0.8cqw] text-slate-500 z-10">{sq.index}</span>
                                {
                                    dreamers.length > 0 && (
                                        <div className="absolute -top-2 -left-2 flex -space-x-2 z-30">
                                            {dreamers.map((p: any) => (
                                                <div key={p.id} className="w-6 h-6 bg-slate-900/90 rounded-full border border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] flex items-center justify-center text-xs relative group/dream" title={`Мечта игрока ${p.name}`}>
                                                    <span>{p.token}</span>
                                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-pink-300 font-bold whitespace-nowrap opacity-0 group-hover/dream:opacity-100 transition-opacity bg-black/80 px-1 rounded pointer-events-none">Мечта {p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }
                                {
                                    sq.ownerId && (() => {
                                        const owner = players.find((p: any) => p.id === sq.ownerId);
                                        if (!owner) return null;

                                        if (owner.photo_url) {
                                            return (
                                                <div className="absolute -bottom-[0.4cqw] -right-[0.4cqw] w-[2cqw] h-[2cqw] rounded-full border border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] overflow-hidden z-20 bg-slate-900" title={`Владелец: ${owner.name}`}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={owner.photo_url} alt={owner.token} className="w-full h-full object-cover" />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="absolute -bottom-[0.4cqw] -right-[0.4cqw] w-[2cqw] h-[2cqw] bg-slate-900/90 rounded-full border border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] flex items-center justify-center text-[1.2cqw] z-20" title={`Владелец: ${owner.name}`}>
                                                {owner.token}
                                            </div>
                                        );
                                    })()
                                }
                            </div>
                        );
                    })}

                    {/* CENTER HUB (Inside Grid Layer) */}
                    <div className="col-start-4 col-end-11 row-start-4 row-end-11 relative rounded-full bg-slate-950 border-4 border-slate-800/80 shadow-2xl flex flex-col items-center justify-center z-10 overflow-hidden pointer-events-auto">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black animate-pulse"></div>
                        <h1 className="text-[4cqw] lg:text-[6cqw] font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent transform -skew-x-6 drop-shadow-2xl mb-4">MONEO</h1>


                        {/* EXIT BUTTON Built-in */}
                        {showExitButton && (
                            <button
                                onClick={onExitClick}
                                className={`
                                    absolute bottom-0
                                    w-[60%] h-[30%]
                                    bg-gradient-to-t from-[#be123c] to-[#f43f5e]
                                    rounded-t-full
                                    flex flex-col items-center justify-center
                                    cursor-pointer shadow-[0_-5px_20px_rgba(244,63,94,0.5)]
                                    border-t-4 border-x-4 border-slate-900
                                    transition-all transform hover:scale-105 active:scale-95 group z-20
                                    hover:pb-2
                                `}
                            >
                                <span className="text-[2cqw] filter drop-shadow-md group-hover:-translate-y-1 transition-transform">🚀</span>
                                <span className="text-white font-black text-[1cqw] uppercase tracking-[0.2em] drop-shadow-md mt-1">FAST TRACK</span>
                            </button>
                        )}

                        {/* VICTORY INFO BUTTON (Fast Track) */}
                        {!showExitButton && (
                            <button
                                onClick={onExitClick} // Reusing prop name or pass new one? Let's assume onExitClick handles both or we pass a new prop.
                                // Wait, board.tsx will pass the correct handler.
                                className={`
                                    absolute bottom-0
                                    w-[60%] h-[30%]
                                    bg-gradient-to-t from-yellow-700 to-amber-500
                                    rounded-t-full
                                    flex flex-col items-center justify-center
                                    cursor-pointer shadow-[0_-5px_20px_rgba(245,158,11,0.5)]
                                    border-t-4 border-x-4 border-slate-900
                                    transition-all transform hover:scale-105 active:scale-95 group z-20
                                    hover:pb-2
                                `}
                            >
                                <span className="text-[2cqw] filter drop-shadow-md group-hover:-translate-y-1 transition-transform">🏆</span>
                                <span className="text-white font-black text-[1cqw] uppercase tracking-[0.2em] drop-shadow-md mt-1">WIN</span>
                            </button>
                        )}
                    </div>

                </div>

                {/* Reduced inset to maximize size (15% -> 4% -> 12% to fix overlap) */}
                <div className="absolute inset-[12%] rounded-full border border-slate-800/30 pointer-events-none">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-700/20 animate-spin-slow-reverse opacity-30"></div>
                    {board.filter((sq: any) => !isFastTrackSquare(sq.index)).map((sq: any) => {
                        const style = getPosStyle(sq.index, false);
                        const gradient = getGradient(sq.type, false);
                        const isPayday = sq.type === 'PAYDAY';

                        // Payday Logic: Check if current player is here
                        const playerHere = players.find((p: any) => p.id === currentPlayerId && p.position === sq.index);
                        const showPaydaySum = isPayday && playerHere;

                        return (
                            <div
                                key={sq.index}
                                onClick={() => onSquareClick && onSquareClick(sq)}
                                className={`
                                    w-[13%] h-[13%] rounded-xl shadow-xl border
                                    flex items-center justify-center pointer-events-auto
                                    transition-all hover:scale-125 hover:z-50 duration-300 cursor-pointer
                                    ${gradient}
                                    relative
                                `}
                                style={style as React.CSSProperties}
                                title={sq.name}
                            >
                                <div className="absolute inset-1 flex flex-col items-center justify-center overflow-hidden">
                                    {/* Sticker - Faded Background */}
                                    <span style={{ fontSize: `${4 * zoom}cqw` }} className="absolute opacity-40 grayscale-[0.3] filter drop-shadow-lg pointer-events-none">{getSticker(sq.type, sq.name)}</span>

                                    {/* Text - Foreground, Large */}
                                    <span style={{ fontSize: `${1.1 * zoom}cqw`, lineHeight: '1' }} className="relative z-10 text-center font-black text-slate-100 uppercase tracking-tight drop-shadow-md break-words line-clamp-2 w-full">
                                        {sq.type === 'OPPORTUNITY' ? (sq.name.includes('Big') ? 'Big Deal' : 'Small Deal') : sq.name}
                                    </span>
                                </div>

                                <span className="absolute -top-[0.2cqw] -right-[0.2cqw] w-[1.8cqw] h-[1.8cqw] bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-[0.8cqw] text-slate-500">{sq.index}</span>

                                {/* PAYDAY POPUP */}
                                {showPaydaySum && (
                                    <div className="absolute -top-[6cqw] left-1/2 -translate-x-1/2 z-[60] animate-bounce-in">
                                        <div className="bg-emerald-500 text-white font-black text-[1.5cqw] px-[1cqw] py-[0.5cqw] rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center gap-1 border-2 border-emerald-400 whitespace-nowrap">
                                            <span>💰</span>
                                            <span>+${playerHere.monthlyCashflow?.toLocaleString()}</span>
                                        </div>
                                        {/* Triangle pointer */}
                                        <div className="w-0 h-0 border-l-[0.6cqw] border-l-transparent border-r-[0.6cqw] border-r-transparent border-t-[0.8cqw] border-t-emerald-500 absolute -bottom-[0.6cqw] left-1/2 -translate-x-1/2"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 3. PLAYER TOKENS (ABSOLUTE OVERLAY) */}
                <div className="absolute inset-0 pointer-events-none">
                    {players.map((p: any) => {
                        const posIndex = animatingPos[p.id] ?? p.position;
                        const isFT = p.isFastTrack;

                        // Calculate Offset for Overlap
                        let offsetX = 0;
                        let offsetY = 0;
                        const group = positionGroups[posIndex] || [];
                        if (group.length > 1) {
                            const idx = group.indexOf(p.id);
                            const spread = 3.0;
                            const angle = (idx / group.length) * 2 * Math.PI - Math.PI / 2;
                            offsetX = spread * Math.cos(angle);
                            offsetY = spread * Math.sin(angle);
                        }

                        let style: any = {};

                        if (isFT) {
                            // Fast Track Positioning
                            const ftIndex = posIndex;
                            let r = 0, c = 0;
                            if (ftIndex <= 12) { r = 13; c = 13 - ftIndex; }
                            else if (ftIndex <= 23) { r = 13 - (ftIndex - 12); c = 1; }
                            else if (ftIndex <= 36) { r = 1; c = 1 + (ftIndex - 24); }
                            else { r = 2 + (ftIndex - 37); c = 13; }

                            const colPerc = ((c - 0.5) / 13) * 100;
                            const rowPerc = ((r - 0.5) / 13) * 100;

                            style = {
                                left: `${colPerc + offsetX}%`,
                                top: `${rowPerc + offsetY}%`,
                                transform: 'translate(-50%, -50%)',
                                position: 'absolute'
                            };
                        } else {
                            // Rat Race Positioning
                            const totalSteps = 24;
                            const angleOffset = 90;
                            const angleDeg = (posIndex * (360 / totalSteps)) + angleOffset;
                            const angleRad = angleDeg * (Math.PI / 180);
                            const radius = 31.92;
                            const x = 50 + radius * Math.cos(angleRad);
                            const y = 50 + radius * Math.sin(angleRad);
                            style = {
                                left: `${x + offsetX}%`,
                                top: `${y + offsetY}%`,
                                transform: 'translate(-50%, -50%)',
                                position: 'absolute'
                            };
                        }

                        return (
                            <div
                                key={p.id}
                                className={`absolute w-12 h-12 z-50 flex items-center justify-center transition-all duration-300 ease-in-out`}
                                style={style}
                            >
                                <div className={`
                                    w-[5cqw] h-[5cqw] rounded-full bg-slate-900 border-2 ${p.id === currentPlayerId ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)] scale-110' : 'border-slate-600 shadow-md'}
                                    flex items-center justify-center relative overflow-hidden
                                `}>
                                    {p.photo_url ? (
                                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[3.0cqw]">{p.token}</span>
                                    )}

                                    {/* Name Badge */}
                                    <div className="absolute -top-[1.5cqw] bg-slate-900/80 text-white text-[0.6cqw] px-[0.5cqw] py-[0.1cqw] rounded-full whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
                                        {p.name}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div >
    );
});
