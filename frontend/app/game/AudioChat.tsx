import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';

// WebRTC Configuration - Expanded STUN List
const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ]
};

interface AudioChatProps {
    className?: string;
    roomId?: string;
    players?: any[];
    currentUserId?: string;
    currentPlayerName?: string;
}

export const AudioChat = ({
    className = "",
    roomId,
    players,
    currentUserId,
    currentPlayerName
}: AudioChatProps) => {
    // 1. Audio State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [status, setStatus] = useState<string>("Initializing...");
    const [error, setError] = useState<string | null>(null);
    const [needsInteraction, setNeedsInteraction] = useState(false);

    // Volume States
    const [myVolume, setMyVolume] = useState(0);
    const [remoteVolumes, setRemoteVolumes] = useState<Record<string, number>>({});
    const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});

    // 2. WebRTC Refs
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const candidatesQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const remoteAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());

    // Debug Log
    const log = (msg: string) => {
        console.log(`[AudioChat] ${msg}`);
    };

    const processCandidateQueue = async (userId: string, pc: RTCPeerConnection) => {
        const queue = candidatesQueueRef.current.get(userId) || [];
        if (queue.length > 0) {
            log(`Processing ${queue.length} queued candidates for ${userId}`);
            for (const cand of queue) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                    console.error("Queue Candidate Error:", e);
                }
            }
            candidatesQueueRef.current.delete(userId);
        }
    };

    // --- A. INITIALIZE LOCAL AUDIO ---
    useEffect(() => {
        let mounted = true;

        const initLocalAudio = async () => {
            try {
                setStatus("Requesting Mic...");
                const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                setLocalStream(stream);
                localStreamRef.current = stream;
                setStatus("Voice Active");

                // Setup Audio Context
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                        const audioCtx = new AudioContextClass();
                        audioContextRef.current = audioCtx;

                        // Check if suspended
                        if (audioCtx.state === 'suspended') {
                            setNeedsInteraction(true);
                        }

                        const analyser = audioCtx.createAnalyser();
                        analyser.fftSize = 64;
                        analyserRef.current = analyser;

                        const source = audioCtx.createMediaStreamSource(stream);
                        source.connect(analyser);

                        const updateVolume = () => {
                            if (!mounted) return;

                            if (analyserRef.current) {
                                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                                analyserRef.current.getByteFrequencyData(data);
                                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                                setMyVolume(avg);
                            }

                            const newRemoteVols: Record<string, number> = {};
                            remoteAnalysersRef.current.forEach((an, uid) => {
                                const data = new Uint8Array(an.frequencyBinCount);
                                an.getByteFrequencyData(data);
                                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                                newRemoteVols[uid] = avg;
                            });
                            setRemoteVolumes(newRemoteVols);

                            requestAnimationFrame(updateVolume);
                        };
                        updateVolume();
                    }
                } catch (e) {
                    console.error("Audio Context Error", e);
                }

            } catch (err: any) {
                console.error("Mic Error:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError("Mic Permission BLOCKED by Browser/OS");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    setError("Mic Not Found");
                } else {
                    setError(`Mic Error: ${err.name}`);
                }
                setStatus("Offline");

                // Diagnostic log
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    console.log("Devices:", devices.map(d => `${d.kind}: ${d.label}`));
                } catch (e) { }
            }
        };

        const checkPermissions = async () => {
            try {
                const perm = await navigator.permissions.query({ name: 'microphone' as any });
                console.log("Mic Permission State:", perm.state);
            } catch (e) { /* ignore */ }
        };
        checkPermissions();

        if (currentUserId) {
            initLocalAudio();
        }

        return () => {
            mounted = false;
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            peersRef.current.forEach(pc => pc.close());
            peersRef.current.clear();
        };
    }, [currentUserId]);

    const handleEnableAudio = async () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            setNeedsInteraction(false);
            setStatus("Voice Active");
        }
    };

    // --- B. PEER CONNECTION MANAGEMENT ---
    const createPeer = (targetUserId: string, initiator: boolean) => {
        if (peersRef.current.has(targetUserId)) return peersRef.current.get(targetUserId);

        log(`Creating Peer for ${targetUserId} (Init: ${initiator})`);
        const pc = new RTCPeerConnection(RTC_CONFIG);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', {
                    to: targetUserId,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            log(`Connection with ${targetUserId}: ${pc.connectionState}`);
            setConnectionStates(prev => ({ ...prev, [targetUserId]: pc.connectionState }));
        };

        pc.ontrack = (event) => {
            log(`Received Remote Stream from ${targetUserId}`);
            const remoteStream = event.streams[0];

            // Playback
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            (audio as any).playsInline = true;
            audio.volume = 1.0;
            audio.play().catch(e => console.error("Audio Play Error:", e));

            // Visualization
            if (audioContextRef.current) {
                try {
                    const source = audioContextRef.current.createMediaStreamSource(remoteStream);
                    const analyser = audioContextRef.current.createAnalyser();
                    analyser.fftSize = 64;
                    source.connect(analyser);
                    remoteAnalysersRef.current.set(targetUserId, analyser);
                } catch (e) {
                    console.error("Audio Context Visualization Error:", e);
                }
            }
        };

        peersRef.current.set(targetUserId, pc);
        return pc;
    };

    // --- C. SIGNALING HANDLERS ---
    useEffect(() => {
        const handleSignal = async (data: any) => {
            const { from, signal } = data;
            if (!from) return;

            let pc = peersRef.current.get(from);

            if (!pc) {
                if (signal.type === 'offer') {
                    pc = createPeer(from, false);
                } else {
                    return;
                }
            }

            if (!pc) return;

            try {
                if (signal.type === 'offer') {
                    // Always set remote first if stable or rollback needed
                    if (pc.signalingState !== 'stable') {
                        await Promise.all([
                            pc.setLocalDescription({ type: "rollback" }),
                            pc.setRemoteDescription(new RTCSessionDescription(signal))
                        ]);
                    } else {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));

                        {
                            needsInteraction && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
                                    <button
                                        onClick={handleEnableAudio}
                                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-pulse"
                                    >
                                        📞 CLICK TO JOIN AUDIO
                                    </button>
                                </div>
                            )
                        }

                        {/* Main Big Button for Mute/Unmute if Mobile-like view or just overlay */ }
                        <div className="absolute top-2 right-2 z-20">
                            <button
                                onClick={toggleMute}
                                className={`p-3 rounded-full shadow-lg border border-white/10 transition-transform active:scale-95 ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700/50 text-white'}`}
                            >
                                {isMuted ? '🔇' : '🎤'}
                            </button>
                        </div>

                        {/* Visualization Grid */ }
                        <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 place-items-center p-4 gap-4">

                            {/* ME */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div
                                        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg transition-transform duration-75"
                                        style={{ transform: `scale(${getScale(myVolume)})`, boxShadow: `0 0 ${myVolume / 2}px rgba(59,130,246,0.5)` }}
                                    >
                                        🦊
                                    </div>
                                    {isMuted && <div className="absolute -bottom-1 -right-1 bg-red-500 text-[10px] px-1.5 py-0.5 rounded-full border border-slate-900 text-white font-bold">OFF</div>}
                                </div>
                                <span className="text-[10px] font-bold text-slate-300">Вы</span>
                            </div>

                            {/* OTHERS */}
                            {players?.filter(p => p.id !== currentUserId).map(p => {
                                const vol = remoteVolumes[p.id] || 0;
                                const connState = connectionStates[p.id] || 'new';

                                let statusColor = 'bg-slate-500';
                                if (connState === 'connected') statusColor = 'bg-green-500';
                                else if (connState === 'connecting' || connState === 'checking') statusColor = 'bg-yellow-500';
                                else if (connState === 'failed' || connState === 'disconnected') statusColor = 'bg-red-500';

                                return (
                                    <div key={p.id} className="flex flex-col items-center gap-2">
                                        <div className="relative">
                                            <div
                                                className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-2xl shadow-lg transition-transform duration-75 border border-slate-600 relative"
                                                style={{ transform: `scale(${getScale(vol)})`, boxShadow: vol > 10 ? `0 0 ${vol / 2}px rgba(34,197,94,0.5)` : 'none', borderColor: vol > 10 ? '#22c55e' : '#475569' }}
                                            >
                                                {p.token || '👤'}

                                                {/* Connection Status Dot */}
                                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${statusColor} shadow-sm z-10`} title={`Status: ${connState}`} />
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60px]">{p.name}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Error Toast */ }
                        {
                            error && (
                                <div className="absolute bottom-0 left-0 w-full bg-red-600 text-white text-[10px] p-1 text-center font-bold flex items-center justify-between px-2">
                                    <span className="flex-1">{error}</span>
                                    <button onClick={() => setError(null)} className="text-white hover:text-red-200 px-1 font-bold">✕</button>
                                </div>
                            )
                        }
            </div >
        );
    };
