import React, { useState, useEffect } from 'react';

export const VideoCall = ({
    className = "",
    balance,
    credit,
    turnPlayerName
}: {
    className?: string;
    balance?: number;
    credit?: number;
    turnPlayerName?: string;
}) => {
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

    // Speech Recognition
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        let recognition: any = null;

        if ('webkitSpeechRecognition' in window) {
            recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ru-RU';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
                // Auto-restart if not muted (and simplistic keep-alive)
                if (!isMuted) {
                    setTimeout(() => {
                        try {
                            recognition.start();
                        } catch (e) {
                            // ignore already started
                        }
                    }, 1000);
                }
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => [...prev.slice(-4), `You: ${finalTranscript}`]);
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    // Ignore benign errors
                    return;
                }
                console.warn("Speech recognition warning:", event.error);
            };

            if (!isMuted) {
                try {
                    recognition.start();
                } catch (e) {
                    // Algorithm: handle if already started
                }
            }
        }

        return () => {
            if (recognition) recognition.stop();
        };
    }, [isMuted]);

    // Mock transcript generation (keep for demo if detecting nothing?)
    // Removing Mock or keeping it as "System" updates only?
    // Let's keep System updates but remove Fake Player Text to avoid confusion if real transcription works.
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.8) {
                setTranscript(prev => [...prev.slice(-4), "System: AI analyzing context..."]);
            }
        }, 10000);
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

                {/* OVERLAY STATS (Mobile) */}
                {(balance !== undefined || credit !== undefined) && (
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-20 pointer-events-none">
                        {balance !== undefined && (
                            <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-green-500/20 flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Cash</span>
                                <span className="text-xs font-mono font-bold text-green-400">${balance.toLocaleString()}</span>
                            </div>
                        )}
                        {credit !== undefined && credit > 0 && (
                            <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-red-500/20 flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Debt</span>
                                <span className="text-xs font-mono font-bold text-red-400">${credit.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}

                {turnPlayerName && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 z-20 pointer-events-none">
                        <div className="bg-blue-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/30 shadow-lg">
                            <span className="text-[10px] text-blue-200 uppercase font-bold mr-1">Turn</span>
                            <span className="text-xs font-bold text-white max-w-[100px] truncate">{turnPlayerName}</span>
                        </div>
                    </div>
                )}

                {/* Rec Indicator (Moved to Bottom Left) */}
                <div className="absolute bottom-2 left-2 flex items-center space-x-1.5 px-2 py-1 bg-red-900/40 rounded-full border border-red-500/20 backdrop-blur-sm z-10 scale-90 origin-bottom-left">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[8px] text-red-200 font-mono tracking-wider font-bold">REC</span>
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

            <div className="h-[80px] border-t border-slate-800 bg-slate-900/50 p-2 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Live Transcript</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border transition-colors ${isListening
                        ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20 animate-pulse'
                        : 'text-slate-500 bg-slate-800/20 border-slate-700/50'
                        }`}>
                        {isListening ? '⬤ Listening' : '○ Paused'}
                    </span>
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
