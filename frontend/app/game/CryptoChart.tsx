import React, { useMemo } from 'react';

interface CryptoChartProps {
    symbol: string;
}

// Mock Data Generators
const generateCandles = (symbol: string, count = 20) => {
    let price = symbol === 'BTC' ? 30000 : 5;
    const volatility = symbol === 'BTC' ? 0.05 : 0.1; // 5% vs 10%

    const candles = [];
    for (let i = 0; i < count; i++) {
        const move = (Math.random() - 0.45) * volatility; // Slight upward bias
        const open = price;
        const close = price * (1 + move);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);

        candles.push({ open, close, high, low, id: i });
        price = close;
    }
    return candles;
};

export const CryptoChart = ({ symbol }: CryptoChartProps) => {
    const data = useMemo(() => generateCandles(symbol), [symbol]);

    // Dimensions
    const width = 300;
    const height = 150;
    const padding = 20;

    // Scaling
    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const priceRange = maxPrice - minPrice;

    const getY = (price: number) => {
        return height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding);
    };

    const candleWidth = (width - 2 * padding) / data.length;

    return (
        <div className="w-full bg-slate-900/50 rounded-xl border border-white/5 p-4 mt-2 mb-2 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{symbol}/USD</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${data[data.length - 1].close > data[0].open ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {data[data.length - 1].close > data[0].open ? '+' : ''}{((data[data.length - 1].close / data[0].open - 1) * 100).toFixed(2)}%
                    </span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">1H</div>
            </div>

            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Grid Lines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />

                {/* Candles */}
                {data.map((d, i) => {
                    const x = padding + i * candleWidth + (candleWidth * 0.2); // slight offset
                    const w = candleWidth * 0.6;

                    const yOpen = getY(d.open);
                    const yClose = getY(d.close);
                    const yHigh = getY(d.high);
                    const yLow = getY(d.low);

                    const isGreen = d.close >= d.open;
                    const color = isGreen ? '#10b981' : '#f43f5e'; // Emerald-500 : Rose-500

                    return (
                        <g key={d.id}>
                            {/* Wick */}
                            <line x1={x + w / 2} y1={yHigh} x2={x + w / 2} y2={yLow} stroke={color} strokeWidth="1" />
                            {/* Body */}
                            <rect
                                x={x}
                                y={Math.min(yOpen, yClose)}
                                width={w}
                                height={Math.max(1, Math.abs(yClose - yOpen))}
                                fill={color}
                                rx="1"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Price Labels */}
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                <span>Low: ${minPrice.toFixed(2)}</span>
                <span>High: ${maxPrice.toFixed(2)}</span>
            </div>
        </div>
    );
};
