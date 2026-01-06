import React, { useState, useEffect, useRef } from 'react';

export const CashChangeIndicator = ({ currentCash }: { currentCash: number }) => {
    const [diff, setDiff] = useState<number | null>(null);
    const [visible, setVisible] = useState(false);
    const prevCash = useRef(currentCash);

    useEffect(() => {
        if (prevCash.current !== currentCash) {
            const difference = currentCash - prevCash.current;
            setDiff(difference);
            setVisible(true);
            prevCash.current = currentCash;

            const timer = setTimeout(() => setVisible(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentCash]);

    if (!visible || !diff) return null;

    return (
        <div className={`absolute top-0 right-0 transform -translate-y-full font-bold text-lg animate-out fade-out slide-out-to-top-4 duration-2000 pointer-events-none whitespace-nowrap z-50
            ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {diff > 0 ? '+' : ''}${Math.abs(diff).toLocaleString()}
        </div>
    );
};
