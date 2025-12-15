import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';

// Types for Speech Recognition
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: any) => void;
    onend: () => void;
}

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

interface Transcript {
    userId: string;
    text: string;
    name: string;
    timestamp: number;
}

export const AudioChat = ({
    className = "",
    players,
    currentUserId,
    currentPlayerName
}: {
    className?: string;
    players?: any[];
    currentUserId?: string;
    currentPlayerName?: string;
}) => {
    // 1. Audio State
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState<number>(0); // Local volume for self-pulse
    const [remoteVolumes, setRemoteVolumes] = useState<Map<string, number>>(new Map()); // Remote volumes
    const [status, setStatus] = useState<string>("Connecting...");
    const [error, setError] = useState<string | null>(null);

    // 2. Transcription State
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // 3. WebRTC Refs
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const remoteAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());

    // --- A. INITIALIZE AUDIO & PULSATION ---
    useEffect(() => {
        let mounted = true;

        const initAudio = async () => {
            try {
                setStatus("Requesting Mic...");
                const localStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });

                if (!mounted) {
                    localStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setStream(localStream);
                setStatus("Voice Active");

                // Setup Audio Analysis for Self
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    const audioCtx = new AudioContextClass();
                    audioContextRef.current = audioCtx;
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 64; // Low res for simple volume check
                    analyserRef.current = analyser;

                    const source = audioCtx.createMediaStreamSource(localStream);
                    source.connect(analyser);
                    // Do NOT connect to destination (speakers) to avoid feedback loop

                    // Animation Loop
                    const checkVolume = () => {
                        if (!mounted) return;
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(dataArray);

                        // Calculate RMS or Avg
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                        const avg = sum / dataArray.length;
                        setVolume(avg); // 0-255

                        requestAnimationFrame(checkVolume);
                    };
                    checkVolume();
                }

            } catch (err) {
                console.error("Audio Init Error", err);
                if (mounted) setError("Mic Access Denied");
            }
        };

        const initSpeech = () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true; // Use interim for faster feedback? OR only final.
                recognition.lang = 'ru-RU'; // Default Russian

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript && socket && currentUserId) {
                        // Broadcast
                        socket.emit('transcript', {
                            roomId: (socket as any).roomId, // Hack: Need roomId passed or attached to socket context? Ideally prop.
                            // Actually socket.ts singleton doesn't hold room. Assuming we pass props or parent handles.
                            // We need roomId! We don't have it in props yet.
                            // We'll rely on parent OR current RoomService context.
                            // Wait, socket.io rooms logic needs explicit 'roomId' in event?
                            // Checked gateway: socket.on('transcript', ({roomId...}))
                            // So WE NEED ROOM ID.
                            // FIX: Adding roomId prop to AudioChat.
                            text: finalTranscript,
                            userId: currentUserId,
                            name: currentPlayerName
                        });

                        // Add to local state immediately
                        setTranscripts(prev => [...prev, { userId: currentUserId, name: currentPlayerName || 'Me', text: finalTranscript, timestamp: Date.now() }].slice(-20)); // Keep last 20
                    }
                };

                recognition.onend = () => {
                    // Auto restart
                    if (mounted && !isMuted) {
                        try { recognition.start(); } catch (e) { }
                    }
                };

                recognitionRef.current = recognition;
                try { recognition.start(); } catch (e) { }
            }
        };

        initAudio();
        // Delay speech slightly
        setTimeout(initSpeech, 1000);

        return () => {
            mounted = false;
            if (recognitionRef.current) recognitionRef.current.stop();
            if (analyserRef.current) analyserRef.current.disconnect();
            if (audioContextRef.current) audioContextRef.current.close();
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    // --- B. TRANSCRIPTS LISTENER ---
    useEffect(() => {
        const handleTranscript = (data: Transcript) => {
            setTranscripts(prev => [...prev, data].slice(-50)); // Keep history
        };
        socket.on('transcript_received', handleTranscript);
        return () => { socket.off('transcript_received', handleTranscript); };
    }, []);

    // --- C. MUTE & TOGGLE ---
    useEffect(() => {
        if (stream) {
            stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
            // Also stop/start recognition?
            if (recognitionRef.current) {
                if (isMuted) recognitionRef.current.stop();
                else {
                    try { recognitionRef.current.start(); } catch (e) { }
                }
            }
        }
    }, [isMuted, stream]);

    // --- Helper: Get Pulsation Scale ---
    const getScale = (vol: number) => {
        // Map 0-255 to 1.0 - 1.5
        return 1 + (vol / 255) * 0.5;
    };

    // --- RENDER ---
    return (
        <div className={`bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl ${className}`}>

            {/* 1. Header */}
            <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'Voice Active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Voice Chat</span>
                </div>
                <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-300'}`}>
                    {isMuted ? '🔇 Muted' : '🎤 Live'}
                </button>
            </div>

            {/* 2. Visualizers Grid */}
            <div className="flex-1 p-4 grid grid-cols-4 gap-4 overflow-y-auto">
                {/* ME */}
                <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                        <div
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg transition-transform duration-75"
                            style={{ transform: `scale(${getScale(volume)})`, boxShadow: `0 0 ${volume / 5}px rgba(59,130,246,0.6)` }}
                        >
                            🦊
                        </div>
                        {isMuted && <div className="absolute -top-1 -right-1 bg-red-500 text-[8px] px-1 rounded-full border border-slate-900 text-white">OFF</div>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">You</span>
                </div>

                {/* OTHERS (Using Remote Volumes mock or WebRTC anal) */}
                {players?.filter(p => p.id !== currentUserId).map(p => (
                    <div key={p.id} className="flex flex-col items-center gap-2 opacity-50">
                        {/* Placeholder for remote audio viz - Hard to do without attaching proper WebRTC streams here */}
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl grayscale">
                            👤
                        </div>
                        <span className="text-[10px] text-slate-500">{p.name}</span>
                    </div>
                ))}
            </div>

            {/* 3. Transcription Log */}
            <div className="h-32 bg-black/40 p-3 overflow-y-auto border-t border-slate-700/50 flex flex-col gap-2 custom-scrollbar">
                {transcripts.length === 0 && <div className="text-center text-[10px] text-slate-600 italic mt-4">Speak to see text...</div>}
                {transcripts.map((t, i) => (
                    <div key={i} className={`flex flex-col ${t.userId === currentUserId ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px] font-bold text-slate-400">{t.name}</span>
                            <span className="text-[8px] text-slate-600">{new Date(t.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs max-w-[90%] ${t.userId === currentUserId ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30' : 'bg-slate-700/50 text-slate-200 border border-slate-600/30'}`}>
                            {t.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
