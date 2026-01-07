import React, { useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export const TutorialTip: React.FC<{ text: string, position?: string, arrow?: string }> = ({ text, position = "top-full mt-4", arrow = "top-[-6px] border-b-emerald-500 border-t-0" }) => (
    <div className={`absolute ${position} left-1/2 -translate-x-1/2 z-[100] w-max max-w-[200px] pointer-events-none`}>
        <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl animate-bounce shadow-lg shadow-emerald-900/40 relative text-center">
            {text}
            <div className={`absolute ${arrow} left-1/2 -translate-x-1/2 border-8 border-transparent`}></div>
        </div>
    </div>
);

export const PortalTutorialTip: React.FC<{
    text: string;
    targetRef: React.RefObject<HTMLElement | null>;
    position?: 'top' | 'bottom' | 'left' | 'right';
    offset?: number;
}> = ({ text, targetRef, position = 'bottom', offset = 12 }) => {
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    const updatePosition = () => {
        if (!targetRef.current) return;
        const rect = targetRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // Center relative to target
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        switch (position) {
            case 'top':
                top = rect.top - offset;
                left = centerX;
                break;
            case 'bottom':
                top = rect.bottom + offset;
                left = centerX;
                break;
            case 'left':
                top = centerY;
                left = rect.left - offset;
                break;
            case 'right':
                top = centerY;
                left = rect.right + offset;
                break;
        }
        setCoords({ top, left });
    };

    useLayoutEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [targetRef, position, offset]);

    if (!coords) return null;

    // Determine arrow style based on position
    let arrowStyle = "";
    let boxStyle = "transform -translate-x-1/2";

    if (position === 'top') {
        arrowStyle = "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-emerald-500 border-b-0";
        boxStyle = "-translate-x-1/2 -translate-y-full";
    } else if (position === 'bottom') {
        arrowStyle = "top-[-6px] left-1/2 -translate-x-1/2 border-b-emerald-500 border-t-0";
        boxStyle = "-translate-x-1/2";
    } else if (position === 'left') {
        arrowStyle = "right-[-6px] top-1/2 -translate-y-1/2 border-l-emerald-500 border-r-0";
        boxStyle = "-translate-x-full -translate-y-1/2";
    } else if (position === 'right') {
        arrowStyle = "left-[-6px] top-1/2 -translate-y-1/2 border-r-emerald-500 border-l-0";
        boxStyle = "-translate-y-1/2";
    }

    return createPortal(
        <div style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 99999 }} className={`pointer-events-none transition-all duration-200 ${boxStyle}`}>
            <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] relative text-center w-max max-w-[200px] animate-in fade-in zoom-in duration-300">
                {text}
                <div className={`absolute ${arrowStyle} border-8 border-transparent`}></div>
            </div>
        </div>,
        document.body
    );
};
