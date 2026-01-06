import React from 'react';

export const TutorialTip: React.FC<{ text: string, position?: string, arrow?: string }> = ({ text, position = "top-full mt-4", arrow = "top-[-6px] border-b-emerald-500 border-t-0" }) => (
    <div className={`absolute ${position} left-1/2 -translate-x-1/2 z-[100] w-max max-w-[200px] pointer-events-none`}>
        <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl animate-bounce shadow-lg shadow-emerald-900/40 relative text-center">
            {text}
            <div className={`absolute ${arrow} left-1/2 -translate-x-1/2 border-8 border-transparent`}></div>
        </div>
    </div>
);
