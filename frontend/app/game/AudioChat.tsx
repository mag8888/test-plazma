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

    // 2. WebRTC Refs
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const remoteAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());

    // Debug Log
    const log = (msg: string) => {
        console.log(`[AudioChat] ${msg}`);
        // Optional: setStatus(msg);
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
                        // Do NOT connect to destination to avoid feedback

                        const updateVolume = () => {
                            if (!mounted) return;

                            // Local Volume
                            if (analyserRef.current) {
                                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                                analyserRef.current.getByteFrequencyData(data);
                                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                                setMyVolume(avg);
                            }

                            // Remote Volumes
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

                // DIAGNOSTIC: Check available devices
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    console.log("Available Devices:", devices.map(d => `${d.kind}: ${d.label} (${d.deviceId})`));
                    const hasAudioInput = devices.some(d => d.kind === 'audioinput');

                    if (!hasAudioInput) {
                        setError("⚠️ macOS Privacy Block? Check System Settings -> Microphone");
                        setStatus("No Mic");
                        return;
                    }
                } catch (diagErr) {
                    console.error("Device Enumeration Failed:", diagErr);
                }

                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError("Mic Permission BLOCKED by Browser/OS");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    setError("Mic Not Found (Browser detects 0 devices)");
                } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    setError("Mic HW Error (In use by other app?)");
                } else {
                    setError(`Mic Error: ${err.name}`);
                }
                setStatus("Offline");
            }
        };

        const checkPermissions = async () => {
            // Optional: Pre-check permissions query if available
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
            // Cleanup
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

        // Add Local Tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', {
                    to: targetUserId, // Directly use Socket ID
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            log(`Connection with ${targetUserId}: ${pc.connectionState}`);
        };

        // Handle Remote Stream
        pc.ontrack = (event) => {
            log(`Received Remote Stream from ${targetUserId}`);
            const remoteStream = event.streams[0];

            // Audio Context Approach
            if (audioContextRef.current) {
                const source = audioContextRef.current.createMediaStreamSource(remoteStream);
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 64;
                source.connect(analyser);
                analyser.connect(audioContextRef.current.destination); // Connect to speakers!

                remoteAnalysersRef.current.set(targetUserId, analyser);
            }

            // Fallback Audio Element (Hidden) ensures fetching continues even if context odd
            // If we connect to destination in Context, we don't need audio element playing.
            // BUT sometimes Context doesn't start properly.
            // Let's use Audio Element as backup or primary if context fails.
            // Safest: Use Audio Element for output, Context ONLY for analyze.

            // Revised Strategy:
            // 1. Audio Element plays sound.
            // 2. Context analyzes sound (using clone?).
            // Actually, `createMediaStreamSource` might steal from element?

            // Let's stick to Context for Output if available.
            if (!audioContextRef.current) {
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.autoplay = true;
                audio.play().catch(e => console.error("Autoplay failed", e));
            }
        };

        peersRef.current.set(targetUserId, pc);
        return pc;
    };

    // --- C. SIGNALING HANDLERS ---
    useEffect(() => {
        const handleSignal = async (data: any) => {
            // data: { from: socketId, signal: { type, sdp, candidate } }
            const { from, signal } = data;
            if (!from) return;

            let pc = peersRef.current.get(from);

            if (!pc) {
                // Determine if we should accept
                // If we receive an Offer, we MUST create a peer
                if (signal.type === 'offer') {
                    pc = createPeer(from, false);
                } else {
                    return; // Ignore answers/candidates for unknown peers
                }
            }

            if (!pc) return;

            try {
                if (signal.type === 'offer') {
                    if (pc.signalingState !== 'stable') {
                        // Rollback logic? Or just replace?
                        await Promise.all([
                            pc.setLocalDescription({ type: "rollback" }),
                            pc.setRemoteDescription(new RTCSessionDescription(signal))
                        ]);
                    } else {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    }

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('signal', {
                        to: from,
                        signal: answer // Browser handles toJSON
                    });
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                } else if (signal.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (e) {
                console.error(`Signal Error from ${from}:`, e);
            }
        };

        socket.on('signal', handleSignal);
        return () => { socket.off('signal', handleSignal); };
    }, [localStream]); // Re-bind if stream changes? No, refs handle it.

    // --- D. CONNECTION LOGIC (Mesh) ---
    useEffect(() => {
        if (!roomId || !players || !currentUserId || !localStream) return;

        // Cleanup dropped players
        const activeIds = new Set(players.map(p => p.id));
        peersRef.current.forEach((_, id) => {
            if (!activeIds.has(id)) {
                log(`Removing peer ${id}`);
                peersRef.current.get(id)?.close();
                peersRef.current.delete(id);
                remoteAnalysersRef.current.delete(id);
            }
        });

        players.forEach(p => {
            // Player.id is the Socket ID. 
            // currentUserId passed from props might be Persistent ID (MongoID).
            // BUT for connection, we need to compare Socket IDs to establish Initiator role consistently.
            // Wait, AudioChat props: `currentUserId={me?.id}`.
            // In board.tsx: `me = state.players.find(p => p.id === socket.id)`.
            // So `currentUserId` passed IS Socket ID.

            if (p.id === currentUserId) return; // Self

            // Connect if not connected
            if (!peersRef.current.has(p.id)) {
                // Initiator Logic: Lexical comparison of Socket IDs to avoid dual-offers.
                // Or just: Existing players initiate to New players?
                // Easier: "I am A, you are B. If A < B, A initiates."
                // This ensures only one side creates Offer.

                if (currentUserId < p.id) {
                    const pc = createPeer(p.id, true);
                    if (pc) {
                        pc.onnegotiationneeded = async () => {
                            try {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);
                                socket.emit('signal', {
                                    to: p.id,
                                    signal: offer
                                });
                            } catch (e) { console.error("Negotiation Error", e); }
                        };
                    }
                }
            }
        });
    }, [roomId, players, currentUserId, localStream]); // Re-run when player list changes


    // --- E. MUTE TOGGLE ---
    const toggleMute = () => {
        if (localStreamRef.current) {
            // Wait, logic inversion:
            // if enabled=true, we want to mute (enabled=false).
            // Current `isMuted` means (enabled=false).
            // So if `isMuted` is true, we want to Unmute (enabled=true).
            const newMuted = !isMuted;
            localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !newMuted);
            setIsMuted(newMuted);
        }
    };

    // --- RENDER ---
    const getScale = (vol: number) => 1 + (vol / 255) * 0.5;

    return (
        <div className={`bg-slate-900/90 backdrop-blur-md border-t border-slate-700 overflow-hidden flex flex-col shadow-2xl relative ${className}`}>

            {needsInteraction && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
                    <button
                        onClick={handleEnableAudio}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-pulse"
                    >
                        📞 CLICK TO JOIN AUDIO
                    </button>
                </div>
            )}

            {/* Main Big Button for Mute/Unmute if Mobile-like view or just overlay */}
            <div className="absolute top-2 right-2 z-20">
                <button
                    onClick={toggleMute}
                    className={`p-3 rounded-full shadow-lg border border-white/10 transition-transform active:scale-95 ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700/50 text-white'}`}
                >
                    {isMuted ? '🔇' : '🎤'}
                </button>
            </div>

            {/* Visualization Grid */}
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
                    return (
                        <div key={p.id} className="flex flex-col items-center gap-2">
                            <div className="relative">
                                <div
                                    className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-2xl shadow-lg transition-transform duration-75 border border-slate-600"
                                    style={{ transform: `scale(${getScale(vol)})`, boxShadow: vol > 10 ? `0 0 ${vol / 2}px rgba(34,197,94,0.5)` : 'none', borderColor: vol > 10 ? '#22c55e' : '#475569' }}
                                >
                                    {p.token || '👤'}
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60px]">{p.name}</span>
                        </div>
                    );
                })}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-0 left-0 w-full bg-red-600 text-white text-[10px] p-1 text-center font-bold flex items-center justify-between px-2">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="text-white hover:text-red-200 px-1 font-bold">✕</button>
                </div>
            )}
        </div>
    );
};
