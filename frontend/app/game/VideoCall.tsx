import React, { useState, useEffect } from 'react';

export const VideoCall = ({ className = "" }: { className?: string }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [transcript, setTranscript] = useState<string[]>([
        "System: Recording started for analysis...",
    ]);

    // Request Camera Access on Mount
    useEffect(() => {
        let localStream: MediaStream | null = null;

        const startCamera = async () => {
            if (isVideoOff) return; // Don't start if toggle is off
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(localStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = localStream;
                }
            } catch (err) {
                console.error("Camera access denied or failed:", err);
                setIsVideoOff(true); // Fallback to "Off" state
            }
        };

        if (!isVideoOff) {
            startCamera();
        } else {
            // Stop stream if toggled off
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isVideoOff]);

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

    const toggleVideo = () => {
        setIsVideoOff(prev => !prev);
    };

    return (
        <div className={`flex flex-col bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-md ${className}`}>
            {/* Video Area */}
            <div className="flex-1 min-h-[120px] bg-slate-950 relative flex items-center justify-center group overflow-hidden">
                {!isVideoOff ? (
                    <div className="w-full h-full relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-lg backdrop-blur-sm border border-white/10">
                            <span className="text-[10px] text-white font-medium">You</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                        <span className="text-3xl">🚫</span>
                        <span className="text-xs">Camera Off</span>
                    </div>
                )}

                {/* Rec Indicator */}
                <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-1 bg-red-900/60 rounded-full border border-red-500/30 backdrop-blur-sm z-10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[10px] text-red-200 font-mono tracking-wider font-bold">REC</span>
                </div>

                {/* Hover Controls */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-y-2 group-hover:translate-y-0">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2.5 rounded-full backdrop-blur-md border ${isMuted ? 'bg-red-500/80 border-red-400 text-white' : 'bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700'} transition-all`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>
                    <button
                        onClick={toggleVideo}
                        className={`p-2.5 rounded-full backdrop-blur-md border ${isVideoOff ? 'bg-red-500/80 border-red-400 text-white' : 'bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700'} transition-all`}
                        title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
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
