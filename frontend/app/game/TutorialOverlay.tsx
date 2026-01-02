import React, { useState, useEffect } from 'react';

interface TutorialStep {
    id: number;
    targetId: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    actionText?: string;
}

const STEPS: TutorialStep[] = [
    {
        id: 0,
        targetId: 'tutorial-turn-timer',
        title: 'Ход и Время',
        description: 'Здесь отображается чей сейчас ход и сколько времени осталось.',
        position: 'left',
        actionText: 'Далее'
    },
    {
        id: 1,
        targetId: 'tutorial-roll-action',
        title: 'Бросок кубика',
        description: 'Нажмите "БРОСИТЬ", чтобы сделать ход.',
        position: 'left',
        actionText: 'Далее'
    },
    {
        id: 2,
        targetId: 'tutorial-players',
        title: 'Игроки',
        description: 'Нажмите на игрока, чтобы передать деньги или посмотреть профиль.',
        position: 'right',
        actionText: 'Далее'
    },
    {
        id: 3,
        targetId: 'tutorial-balance',
        title: 'Баланс и Кредиты',
        description: 'Ваш текущий баланс. Нажмите, чтобы открыть Банк, взять кредит или посмотреть расходы.',
        position: 'bottom',
        actionText: 'Далее'
    },
    {
        id: 4,
        targetId: 'tutorial-assets',
        title: 'Активы',
        description: 'Здесь ваши бизнесы и недвижимость. В обучении вы можете получить случайный актив бесплатно!',
        position: 'top',
        actionText: 'Понятно'
    },
    {
        id: 5,
        targetId: 'tutorial-menu',
        title: 'Меню',
        description: 'Здесь настройки звука и выход из игры.',
        position: 'top',
        actionText: 'Завершить'
    }
];

interface TutorialOverlayProps {
    isActive: boolean;
    onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isActive, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const updateTarget = () => {
            const step = STEPS[currentStep];
            const element = document.getElementById(step.targetId);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
                // Scroll into view if needed
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // If element not found, maybe skip or just center?
                console.warn(`Tutorial target ${step.targetId} not found`);
                setTargetRect(null);
            }
        };

        // Small delay to allow layout to settle
        const timer = setTimeout(updateTarget, 500);
        window.addEventListener('resize', updateTarget);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateTarget);
        };
    }, [isActive, currentStep]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    if (!isActive) return null;

    const step = STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dark Overlay with Hole */}
            <div className="absolute inset-0 bg-black/70 transition-all duration-300"
                style={{
                    clipPath: targetRect
                        ? `polygon(
                             0% 0%, 
                             0% 100%, 
                             0% ${targetRect.top}px, 
                             ${targetRect.left}px ${targetRect.top}px, 
                             ${targetRect.left}px ${targetRect.bottom}px, 
                             ${targetRect.right}px ${targetRect.bottom}px, 
                             ${targetRect.right}px ${targetRect.top}px, 
                             100% ${targetRect.top}px, 
                             100% 0%, 
                             100% 100%, 
                             100% 0%
                           )`
                        : undefined // fallback
                }}
            ></div>

            {/* Highlighter Border */}
            {targetRect && (
                <div
                    className="absolute border-4 border-yellow-400 rounded-xl animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-300"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8
                    }}
                ></div>
            )}

            {/* Tooltip Card */}
            <div
                className={`absolute pointer-events-auto bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full transition-all duration-300 flex flex-col gap-4
                    ${!targetRect ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
                `}
                style={targetRect ? calculateTooltipPosition(targetRect, step.position) : {}}
            >
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    <span className="text-xs font-mono text-slate-500">{currentStep + 1} / {STEPS.length}</span>
                </div>

                <p className="text-slate-300 leading-relaxed text-sm">
                    {step.description}
                </p>

                <div className="flex justify-between items-center mt-2">
                    <button
                        onClick={onComplete}
                        className="text-slate-500 hover:text-white text-xs underline"
                    >
                        Пропустить
                    </button>
                    <button
                        onClick={handleNext}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-xl transition-transform active:scale-95"
                    >
                        {step.actionText || 'Далее'}
                    </button>
                </div>

                {/* Arrow */}
                <div className="absolute w-4 h-4 bg-slate-900 border-l border-t border-slate-700 transform rotate-45"
                    style={getArrowStyle(step.position)}
                ></div>
            </div>
        </div>
    );
};

// Helpers for positioning
function calculateTooltipPosition(rect: DOMRect, position: string): React.CSSProperties {
    const gap = 20;

    switch (position) {
        case 'left':
            return {
                top: rect.top + rect.height / 2 - 100, // Approximate centering vertically
                left: rect.left - 320 - gap, // 320 is max-w-sm roughly
            };
        case 'right':
            return {
                top: rect.top + rect.height / 2 - 100,
                left: rect.right + gap,
            };
        case 'top':
            return {
                top: rect.top - 200 - gap, // 200 approx height
                left: rect.left + rect.width / 2 - 160,
            };
        case 'bottom':
            return {
                top: rect.bottom + gap,
                left: rect.left + rect.width / 2 - 160,
            };
        default:
            return { top: rect.bottom + gap, left: rect.left };
    }
}

function getArrowStyle(position: string): React.CSSProperties {
    switch (position) {
        case 'left': return { right: -9, top: '40%', borderLeft: 'none', borderTop: 'none', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' };
        case 'right': return { left: -9, top: '40%' };
        case 'top': return { bottom: -9, left: '50%', borderLeft: 'none', borderTop: 'none', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' };
        case 'bottom': return { top: -9, left: '50%' };
        default: return {};
    }
}
