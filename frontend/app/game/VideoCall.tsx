import React, { useState, useEffect } from 'react';

export const VideoCall = ({ className = "" }: { className?: string }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([
        "System: Recording started for analysis...",
    ]);

    // Mock transcript generation
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const phrases = [
                    "Игрок 1: Надо покупать эту сделку!",
                    "Игрок 2: У меня не хватает кэша...",
                    "Игрок 3: Кто хочет благотворительность?",
                    "System: Market trend updated.",
                ];
                const msg = phrases[Math.floor(Math.random() * phrases.length)];
                setTranscript(prev => [...prev.slice(-4), msg]); // Keep last 5 lines
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex flex-col bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-md ${className}`}>
            {/* Video Area */}
            <div className="flex-1 min-h-[120px] bg-slate-950 relative flex items-center justify-center group">
                {!isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                            <span className="text-2xl">👤</span>
                        </div>
                        <div className="absolute bottom-2 right-2 w-24 h-16 bg-slate-900 border border-slate-700 rounded-lg shadow-lg flex items-center justify-center">
                            <span className="text-xs text-slate-500">You</span>
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-500 text-sm">Camera Off</span>
                )}

                {/* Rec Indicator */}
                <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-1 bg-red-900/30 rounded-full border border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[10px] text-red-300 font-mono tracking-wider">REC</span>
                </div>

                {/* Hover Controls */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200'} hover:scale-110 transition-transform`}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>
                    <button
                        onClick={() => setIsVideoOff(!isVideoOff)}
                        className={`p-2 rounded-full ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200'} hover:scale-110 transition-transform`}
                    >
                        {isVideoOff ? '🚫' : '📹'}
                    </button>
                </div>
            </div>

            {/* Transcript / AI Analysis Area */}
            <div className="h-[80px] border-t border-slate-800 bg-slate-900/50 p-2 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Live Transcript</span>
                    <span className="text-[8px] text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-500/20">AI Active</span>
                </div>
                <div className="space-y-1">
                    {transcript.map((line, i) => (
                        <p key={i} className="text-[10px] text-slate-300 leading-tight font-mono">
                            <span className="opacity-50 mr-1">{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                            {line}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
};
