import React, { useState, useEffect, useRef } from 'react';
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
    // Media State
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(true); // Start Muted for privacy
    const [isVideoOff, setIsVideoOff] = useState(true); // Start Video Off for privacy
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const localPipRef = useRef<HTMLVideoElement>(null);

    // WebRTC State
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    // 1. Initialize Media Stream (Once)
    useEffect(() => {
        let localStream: MediaStream | null = null;

        const initMedia = async () => {
            try {
                // Request both Audio and Video initially
                // We will disable tracks immediately based on initial state
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                // Set initial track states
                localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
                localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);

                setStream(localStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = localStream;
                }
            } catch (err) {
                console.error("Media Access Error:", err);
                setError("Camera/Mic access denied.");
            }
        };

        // Initialize immediately
        initMedia();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(t => t.stop());
            }
        };
    }, []); // Run once on mount

    // 2. Toggle Handlers (Track based)
    const toggleAudio = () => {
        if (!stream) return;
        const newState = !isMuted;
        setIsMuted(newState);
        stream.getAudioTracks().forEach(t => t.enabled = !newState); // Muted = disabled
    };

    const toggleVideo = () => {
        if (!stream) return;
        const newState = !isVideoOff;
        setIsVideoOff(newState);
        stream.getVideoTracks().forEach(t => t.enabled = !newState); // VideoOff = disabled
    };

    // 3. WebRTC Logic (Join Room)
    useEffect(() => {
        if (!players || !currentUserId || !stream) return;

        const handleSignal = async ({ from, signal }: { from: string, signal: any }) => {
            let peer = peersRef.current.get(from);

            if (!peer) {
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
                console.error("WebRTC Handling Error:", err);
            }
        };

        socket.on('signal', handleSignal);

        // Initiate connections to existing peers
        players.forEach(p => {
            if (p.id === currentUserId) return;
            if (!peersRef.current.has(p.id)) {
                // Convention: Initiate if myId > theirId to prevent collissions
                if (currentUserId > p.id) {
                    createPeer(p.id, true);
                }
            }
        });

        return () => {
            socket.off('signal', handleSignal);
        };
    }, [players, currentUserId, stream]); // Re-run if stream is ready

    const createPeer = (targetId: string, initiator: boolean) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
            ]
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
            console.log("Received remote stream from", targetId);
            setRemoteStreams(prev => new Map(prev).set(targetId, event.streams[0]));
        };

        peer.oniceconnectionstatechange = () => {
            console.log(`ICE State (${targetId}):`, peer.iceConnectionState);
            if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(targetId);
                    return newMap;
                });
                peersRef.current.delete(targetId);
            }
        };

        if (initiator) {
            peer.onnegotiationneeded = async () => {
                try {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('signal', { to: targetId, signal: { description: offer } });
                } catch (err) {
                    console.error("Negotiation Error:", err);
                }
            };
        }

        peersRef.current.set(targetId, peer);
        return peer;
    };

    // Update Local Video Refs when toggling (re-attach stream if needed)
    useEffect(() => {
        if (videoRef.current && stream && !isVideoOff) {
            videoRef.current.srcObject = stream;
        }
        if (localPipRef.current && stream && !isVideoOff) {
            localPipRef.current.srcObject = stream;
        }
    }, [stream, isVideoOff]);


    const hasRemote = remoteStreams.size > 0;

    return (
        <div className={`flex flex-col bg-black border border-slate-700 rounded-xl overflow-hidden backdrop-blur-md relative ${className}`}>
            {/* MAIN AREA */}
            <div className="absolute inset-0 z-0 bg-slate-900 flex flex-wrap content-center justify-center">
                {hasRemote ? (
                    Array.from(remoteStreams.entries()).map(([pid, s], i) => (
                        <div key={pid} className={`relative overflow-hidden ${remoteStreams.size === 1 ? 'w-full h-full' : 'w-1/2 h-1/2'} border border-slate-800`}>
                            <video
                                autoPlay
                                playsInline
                                ref={el => { if (el) el.srcObject = s; }}
                                className="w-full h-full object-cover"
                            />
                            {/* Optional: Label for Remote User? We'd need to map PID to Name */}
                        </div>
                    ))
                ) : (
                    // Local Video Main View (if no remote)
                    !isVideoOff ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1] opacity-60 grayscale hover:grayscale-0 transition-all duration-1000"
                        />
                    ) : (
                        // Placeholder
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-4xl animate-pulse">
                                🦊
                            </div>
                            <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {isMuted ? 'Микрофон выключен' : 'Вас слышно'}
                            </div>
                            {players && players.length > 1 && (
                                <div className="mt-8 text-[10px] text-slate-600 animate-pulse">
                                    Ожидание видео...
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* PIP (Local Video) */}
            {hasRemote && !isVideoOff && (
                <div className="absolute bottom-16 right-4 w-24 h-32 bg-black rounded-lg border border-slate-600 shadow-2xl overflow-hidden z-30 group/pip">
                    <video
                        ref={localPipRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-1">You</div>
                </div>
            )}

            {/* ERROR MSG */}
            {error && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/80 text-white px-4 py-2 rounded-xl text-xs font-bold z-50">
                    {error}
                </div>
            )}

            {/* RECORDING INDICATOR */}
            <div className={`absolute bottom-4 left-4 flex items-center space-x-1.5 px-2 py-1 ${isVideoOff ? 'bg-slate-800/60' : 'bg-red-900/40 border-red-500/20'} rounded-full backdrop-blur-sm z-20 scale-90 transition-colors`}>
                <div className={`w-2 h-2 rounded-full ${isVideoOff ? 'bg-slate-500' : 'bg-red-500 animate-pulse'}`}></div>
                <span className={`text-[8px] font-mono tracking-wider font-bold ${isVideoOff ? 'text-slate-400' : 'text-red-200'}`}>
                    {isVideoOff ? 'IDLE' : 'LIVE'}
                </span>
            </div>

            {/* CONTROLS (Zoom Style) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 z-30">
                {/* Audio Toggle */}
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full backdrop-blur-md border shadow-lg active:scale-95 transition-all ${isMuted
                        ? 'bg-red-500/90 border-red-400 text-white hover:bg-red-600'
                        : 'bg-slate-900/60 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    {isMuted ? '🔇' : '🎤'}
                </button>

                {/* Video Toggle */}
                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full backdrop-blur-md border shadow-lg active:scale-95 transition-all ${isVideoOff
                        ? 'bg-red-500/90 border-red-400 text-white hover:bg-red-600'
                        : 'bg-slate-900/60 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                >
                    {isVideoOff ? '🚫' : '📹'}
                </button>
            </div>

            {/* GAME STATS OVERLAY */}
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

            {/* TURN INDICATOR */}
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
