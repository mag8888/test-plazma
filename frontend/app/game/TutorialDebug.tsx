
import React, { useEffect, useRef } from 'react';

export const TutorialDebug = ({ step, isTutorial }: { step: number, isTutorial: boolean }) => {
    useEffect(() => {
        console.log(`[TutorialDebug] Step: ${step}, IsTutorial: ${isTutorial}`);
    }, [step, isTutorial]);
    return (
        <div className="fixed top-0 left-0 bg-black/50 text-white z-[9999] text-xs p-1 pointer-events-none">
            Step: {step} | Tut: {isTutorial ? 'Y' : 'N'}
        </div>
    );
};
