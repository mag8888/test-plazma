import React from 'react';

interface TutorialTipProps {
    text: string;
    position?: string;
    arrow?: string;
    colorClass?: string;
    arrowColorClass?: string;
}

export const TutorialTip: React.FC<TutorialTipProps> = ({
    text,
    position = "top-full mt-4",
    arrow = "top-[-6px] border-b-emerald-500 border-t-0",
    colorClass = "bg-emerald-500 text-white",
    arrowColorClass = ""
}) => (
    <div className={`absolute ${position} z-50 animate-bounce-subtle pointer-events-none w-max max-w-[200px]`}>
        <div className={`relative ${colorClass} text-xs font-bold px-3 py-2 rounded-xl shadow-xl border border-white/10`}>
            {text}
            <div className={`absolute w-3 h-3 transform rotate-45 ${arrowColorClass || colorClass.split(' ')[0]} ${arrow.includes('border') ? '' : 'border border-white/10'} left-1/2 -translate-x-1/2 ${arrow}`}></div>
        </div>
    </div>
);
