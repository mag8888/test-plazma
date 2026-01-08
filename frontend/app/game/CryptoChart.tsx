import React, { useMemo } from 'react';

interface CryptoChartProps {
    symbol: string;
    currentPrice?: number;
}

// Mock Data Generators - Generate BACKWARDS from current price
const generateCandles = (symbol: string, currentPrice: number, count = 20) => {
    // Volatility: Stocks/Crypto in this game are volatile.
    // Range typically $1 - $50.
    // If Price is 10, we want history to wander around.

    const volatility = 0.15; // 15% volatility per bar

    const candles = [];
    let price = currentPrice;

    // Generate BACKWARDS
    const history = [];
    for (let i = 0; i < count; i++) {
        // Reverse random walk: prevPrice = price / (1 + move)
        const move = (Math.random() - 0.5) * volatility;

        // For the LAST candle (current), Close IS currentPrice.
        // For others, we simulate.

        // Let's generate a trend. 
        // If Price is high ($30+), maybe bias towards uptrend history (so prev was lower).
        // If Price is low ($5-), bias towards downtrend (so prev was higher).
        // This makes $1 look like a "dip" (bottom of chart) and $40 look like "peak" (top).

        // Bias factor:
        // range [1, 50]. Center 25.
        // If price > 30, value > 0 (Up bias -> Prev was lower).
        // If price < 10, value < 0 (Down bias -> Prev was higher).

        const bias = (price - 20) / 100; // e.g. 10 -> -0.1. 40 -> +0.2.
        // But in REVERSE (generating backwards):
        // If we want Uptrend (Low -> High), Prev needs to be Lower.
        // So price = prev * (1+change). prev = price / (1+change).
        // If bias is positive (High price), we want prev < price. So (1+change) > 1.

        // Let's simplify: Just randomness + slight mean reversion to $20.

        const open = price / (1 + move + (price > 30 ? 0.05 : price < 5 ? -0.05 : 0));
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.05);
        const low = Math.min(open, close) * (1 - Math.random() * 0.05);

        history.unshift({ open, close, high: Math.max(high, low), low: Math.min(high, low), id: count - 1 - i });

        price = open; // Previous Close is roughly Next Open (gaps allowed)
    }

    return history;
};

export const CryptoChart = ({ symbol, currentPrice = 10 }: CryptoChartProps) => {
    // Memoize relative to currentPrice so it updates when price changes
    const data = useMemo(() => generateCandles(symbol, currentPrice), [symbol, currentPrice]);

    // Dimensions
    const width = 300;
    const height = 150;
    const padding = 20;

    // Scaling - Auto Fit to Data
    const minPrice = Math.min(...data.map(d => d.low)) * 0.95; // 5% padding
    const maxPrice = Math.max(...data.map(d => d.high)) * 1.05;
    const priceRange = maxPrice - minPrice || 1; // Prevent div by zero

    const getY = (price: number) => {
        return height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding);
    };

    const candleWidth = (width - 2 * padding) / data.length;

    return (
        <div className="w-full bg-slate-900/50 rounded-xl border border-white/5 p-4 mt-2 mb-2 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{symbol}/USD</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${data[data.length - 1].close >= data[0].open ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {data[data.length - 1].close >= data[0].open ? '+' : ''}{((data[data.length - 1].close / data[0].open - 1) * 100).toFixed(2)}%
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
