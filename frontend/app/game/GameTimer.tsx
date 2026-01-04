
import React, { useEffect, useState } from 'react';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const GameTimer = ({ expiresAt, currentTurnTime, className, style }: { expiresAt?: number, currentTurnTime?: number, className?: string, style?: any }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const updateTimer = () => {
            if (expiresAt) {
                const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
                setTimeLeft(diff);
            } else if (currentTurnTime) {
                setTimeLeft(currentTurnTime);
            } else {
                setTimeLeft(0);
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [expiresAt, currentTurnTime]);

    if (className?.includes('render-text-only')) {
        // Just return text, maybe for custom styling parent
        return <>{formatTime(timeLeft)}</>;
    }

    return (
        <span className={className} style={style}>
            {formatTime(timeLeft)}
            {/* Optional: Add icon/styles here if we want self-contained component, but for now we reuse usage classes */}
        </span>
    );
};
