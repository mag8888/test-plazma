"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MatrixOpenerProps {
    status: 'LOCKED' | 'CHALLENGE' | 'OPENING' | 'SUCCESS' | 'FAILED';
    riddle?: { question: string; id: string };
    onAnswerSubmit: (ans: number) => void;
    onClose: () => void;
    reward?: any;
    error?: string;
}

const MatrixRain = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops: number[] = [];

        for (let x = 0; x < columns; x++) drops[x] = 1;

        const draw = () => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height); // Fade trail

            ctx.fillStyle = "#0F0"; // Green text
            ctx.font = fontSize + "px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = letters.charAt(Math.floor(Math.random() * letters.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 33);
        return () => clearInterval(interval);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-30" />;
};

export const MatrixOpener: React.FC<MatrixOpenerProps> = ({ status, riddle, onAnswerSubmit, onClose, reward, error }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue) return;
        onAnswerSubmit(Number(inputValue));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono overflow-hidden">
            <MatrixRain />

            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 text-green-500 hover:text-white z-20 font-bold p-2 border border-green-900 rounded bg-black/50 backdrop-blur">
                [ ABORT ]
            </button>

            {/* MAIN CUBE AREA */}
            <div className="relative z-10 w-full max-w-md p-6 flex flex-col items-center">

                {/* CUBE ANIMATION */}
                <div className="w-48 h-48 relative mb-12 perspective-1000">
                    <motion.div
                        className={`w-full h-full relative preserve-3d transform-style-3d 
                            ${status === 'OPENING' ? 'animate-[spin_0.5s_linear_infinite]' : 'animate-[spin_10s_linear_infinite]'}`}
                        animate={status === 'SUCCESS' ? { scale: [1, 1.5, 0], opacity: 0 } : {}}
                    >
                        {/* Simple Wireframe Cube using Borders */}
                        <div className="absolute inset-0 border-2 border-green-500/50 bg-green-500/10 translate-z-[96px] shadow-[0_0_30px_#0f0] flex items-center justify-center text-4xl">?</div>
                        <div className="absolute inset-0 border-2 border-green-500/50 bg-green-500/10 -translate-z-[96px]"></div>
                        <div className="absolute inset-0 border-2 border-green-500/50 bg-green-500/10 rotate-y-90 translate-z-[96px]"></div>
                        <div className="absolute inset-0 border-2 border-green-500/50 bg-green-500/10 -rotate-y-90 translate-z-[96px]"></div>
                        <div className="absolute inset-0 border-2 border-green-500/50 bg-green-500/10 rotate-x-90 translate-z-[96px]"></div>
                        <div className="absolute inset-0 border-2 border-green-500/50 bg-green-500/10 -rotate-x-90 translate-z-[96px]"></div>
                    </motion.div>
                </div>

                {/* STATUS TEXT */}
                <div className="text-center mb-6">
                    <p className="text-green-500 text-xs tracking-[0.2em] animate-pulse">SYSTEM STATUS: {status}</p>
                    {error && <p className="text-red-500 font-bold mt-2 glitch-effect">ERROR: {error}</p>}
                </div>

                {/* INTERACTION AREA */}
                <AnimatePresence mode='wait'>
                    {status === 'CHALLENGE' && riddle && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="w-full bg-black/80 border border-green-500 p-6 rounded-lg backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,0,0.2)]"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded bg-green-900/30 border border-green-500 flex items-center justify-center">
                                    <span className="text-2xl">🤖</span>
                                </div>
                                <div className="text-green-400 text-sm">
                                    <span className="block font-bold mb-1">MONEO GUARDIAN</span>
                                    <span className="opacity-80">Security Protocol Initiated. Provide answer to verify access.</span>
                                </div>
                            </div>

                            <div className="text-center py-4 bg-green-500/10 rounded mb-4 border border-green-500/30">
                                <span className="text-3xl font-mono text-white tracking-widest">{riddle.question}</span>
                            </div>

                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    type="number"
                                    autoFocus
                                    className="bg-black border border-green-700 text-green-500 p-3 rounded flex-1 text-center font-bold text-xl focus:border-green-400 focus:outline-none focus:shadow-[0_0_10px_#0f0]"
                                    placeholder="?"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <button type="submit" className="bg-green-700 hover:bg-green-600 text-white px-6 rounded font-bold transition-all">
                                    ENTER
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {status === 'SUCCESS' && reward && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-gradient-to-br from-green-900 to-black border-2 border-green-400 p-8 rounded-2xl text-center shadow-[0_0_50px_#0f0] max-w-sm"
                        >
                            <h2 className="text-3xl font-bold text-white mb-2 text-shadow-glow">ACCESS GRANTED</h2>
                            <div className="my-6">
                                <div className="text-6xl mb-2">🎁</div>
                                <h3 className="text-xl text-green-300 font-bold">{reward.type}</h3>
                                <p className="text-2xl text-white font-black mt-2">{reward.value}</p>
                            </div>
                            <button onClick={onClose} className="w-full py-3 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400">
                                CLAIM REWARD
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style jsx>{`
                .preserve-3d { transform-style: preserve-3d; }
                .text-shadow-glow { text-shadow: 0 0 10px rgba(0,255,0,0.8); }
            `}</style>
        </div>
    );
};
