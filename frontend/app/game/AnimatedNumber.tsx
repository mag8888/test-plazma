import React, { useState, useEffect, useRef } from 'react';
// import { sfx } from './SoundManager'; // Assuming SoundManager is accessible or passed as prop if needed, 
// but local version used global sfx. 
// Let's keep it simple. If sfx is needed, import it.
// The original code commented out sfx.play in one place.

export const AnimatedNumber = ({ value, className = '' }: { value: number, className?: string }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (value !== displayValue) {
            const diff = value - displayValue;
            const isIncrease = diff > 0;

            if (isIncrease) {
                setIsAnimating(true);
            }

            const steps = 20;
            const duration = 1000; // 1s
            const increment = diff / steps;
            let currentStep = 0;

            const animate = () => {
                currentStep++;
                if (currentStep <= steps) {
                    setDisplayValue(prev => Math.floor(prev + increment));
                    timeoutRef.current = setTimeout(animate, duration / steps);
                } else {
                    setDisplayValue(value);
                    setIsAnimating(false);
                }
            };

            animate();
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [value]);

    return (
        <span className={`${className} ${isAnimating ? 'text-emerald-300 scale-110 transition-transform duration-200' : ''} inline-block`}>
            ${displayValue.toLocaleString()}
        </span>
    );
};
