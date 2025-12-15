import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

export const VideoCall = ({
    className = "",
    balance,
    credit,
    turnPlayerName,
    players,
    currentUserId
}: {
    className?: string;
    balance?: number;
    credit?: number;
    turnPlayerName?: string;
    players?: any[];
    currentUserId?: string;
}) => {
    const [isMuted, setIsMuted] = useState(true); // Default Muted (No Auto-Start)
    const [isVideoOff, setIsVideoOff] = useState(true); // Default Video Off (No Auto-Start)
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    // Transcript state removed since feature is disabled
    // const [transcript, setTranscript] = useState<string[]>([]);

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
                setIsMuted(false); // Auto-unmute when camera starts
            } catch (err) {
                console.error("Camera access denied or failed:", err);
                setIsVideoOff(true); // Fallback to "Off" state
                setIsMuted(true);
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

    // Speech Recognition REMOVED to prevent conflicts
    /*
    const [isListening, setIsListening] = useState(false);
    useEffect(() => { ... });
    */

    /*
    useEffect(() => {
        // Mock transcript removed
    }, []);
    */

    const toggleVideo = () => {
        setIsVideoOff(prev => !prev);
    };

    // WebRTC Logic
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = React.useRef<Map<string, RTCPeerConnection>>(new Map());

    useEffect(() => {
        if (!players || !currentUserId || !stream) return;

        // 1. Handle Incoming Signals
        const handleSignal = async ({ from, signal }: { from: string, signal: any }) => {
            let peer = peersRef.current.get(from);

            if (!peer) {
                // Incoming Signal from unknown peer (they initiated)
                peer = createPeer(from, false);
            }

            try {
                if (signal.description) {
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.description));
                    if (signal.description.type === 'offer') {
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        socket.emit('signal', { to: from, signal: { description: answer } });
                    }
                } else if (signal.candidate) {
                    await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (err) {
                console.error("WebRTC Error:", err);
            }
        };

        socket.on('signal', handleSignal);

        // 2. Connect to New Peers
        players.forEach(p => {
            if (p.id === currentUserId) return;
            if (!peersRef.current.has(p.id)) {
                // Simple Mesh: We initiate if our ID > their ID to avoid collision? 
                // Or just initiate if we don't have them? 
                // Better: Use a reliable convention. "Lexical Sort"?
                // Let's rely on "Already In Room" vs "Joiner"?
                // Hack: Just initiate connection blindly if not exists.
                // Actually, collision is real.
                // Let's use: Initiate if myId > theirId.
                if (currentUserId > p.id) {
                    createPeer(p.id, true);
                }
            }
        });

        return () => {
            socket.off('signal', handleSignal);
        };
    }, [players, currentUserId, stream]);

    const createPeer = (targetId: string, initiator: boolean) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        if (stream) {
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', { to: targetId, signal: { candidate: event.candidate } });
            }
        };

        peer.ontrack = (event) => {
            setRemoteStreams(prev => new Map(prev).set(targetId, event.streams[0]));
        };

        if (initiator) {
            peer.onnegotiationneeded = async () => {
                try {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('signal', { to: targetId, signal: { description: offer } });
                } catch (err) {
                    console.error("Offer Error:", err);
                }
            };
        }

        peersRef.current.set(targetId, peer);
        return peer;
    };

    // Determine Main and Pip Streams
    const remoteStream = remoteStreams.values().next().value;
    const hasRemote = !!remoteStream;

    return (
        <div className={`flex flex-col bg-black border border-slate-700 rounded-xl overflow-hidden backdrop-blur-md relative ${className}`}>
            {/* MAIN VIDEO AREA (Fills container) */}
            <div className="absolute inset-0 z-0">
                {hasRemote ? (
                    <video
                        autoPlay
                        playsInline
                        ref={el => { if (el) el.srcObject = remoteStream; }}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    !isVideoOff ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1] opacity-50 grayscale hover:grayscale-0 transition-all duration-1000"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80">
                            <button
                                onClick={toggleVideo}
                                className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-colors p-4 rounded-xl hover:bg-white/5 animate-pulse"
                            >
                                <span className="text-4xl shadow-lg shadow-white/10 rounded-full p-4 bg-white/5">📹</span>
                                <span className="text-xs font-bold uppercase tracking-wider mt-2">Включить камеру</span>
                            </button>
                        </div>
                    )
                )}
            </div>

            {/* PIP (Local Video) - Only if we have a remote stream and local camera is on */}
            {hasRemote && !isVideoOff && (
                <div className="absolute bottom-4 right-4 w-24 h-32 bg-black rounded-lg border border-slate-600 shadow-2xl overflow-hidden z-30 group/pip">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-1">You</div>
                </div>
            )}


            {/* OVERLAYS (Z-INDEX 20) */}

            {/* 1. Rec Indicator */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-1.5 px-2 py-1 bg-red-900/40 rounded-full border border-red-500/20 backdrop-blur-sm z-20 scale-90">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[8px] text-red-200 font-mono tracking-wider font-bold">REC</span>
            </div>

            {/* 2. Controls (Hover/Always visible?) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 z-30">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-full backdrop-blur-md border shadow-lg active:scale-95 transition-all ${isMuted ? 'bg-red-500/90 border-red-400 text-white' : 'bg-slate-900/60 border-slate-600 text-slate-200 hover:bg-slate-800'}`}
                >
                    {isMuted ? '🔇' : '🎤'}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full backdrop-blur-md border shadow-lg active:scale-95 transition-all ${isVideoOff ? 'bg-red-500/90 border-red-400 text-white' : 'bg-slate-900/60 border-slate-600 text-slate-200 hover:bg-slate-800'}`}
                >
                    {isVideoOff ? '🚫' : '📹'}
                </button>
            </div>

            {/* 3. Game Stats (Top Left) */}
            {(balance !== undefined || credit !== undefined) && (
                <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-20 pointer-events-none">
                    {balance !== undefined && (
                        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-green-500/30 flex items-center gap-1 shadow-lg">
                            <span className="text-[10px] text-slate-300 font-bold uppercase">Cash</span>
                            <span className="text-xs font-mono font-bold text-green-400">${balance.toLocaleString()}</span>
                        </div>
                    )}
                    {credit !== undefined && credit > 0 && (
                        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-red-500/30 flex items-center gap-1 shadow-lg">
                            <span className="text-[10px] text-slate-300 font-bold uppercase">Debt</span>
                            <span className="text-xs font-mono font-bold text-red-400">${credit.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}

            {/* 4. Turn Indicator (Top Right) */}
            {turnPlayerName && (
                <div className="absolute top-2 right-2 flex items-center gap-2 z-20 pointer-events-none">
                    <div className="bg-blue-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/50 shadow-xl">
                        <span className="text-[10px] text-blue-200 uppercase font-bold mr-1">Turn</span>
                        <span className="text-xs font-bold text-white max-w-[100px] truncate">{turnPlayerName}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
