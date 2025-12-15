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
    const [isMuted, setIsMuted] = useState(false); // Audio on by default for "Voice Chat" feel? Or muted? Let's say Unmuted but can toggle.
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Connecting...");

    const videoRef = useRef<HTMLVideoElement>(null);

    // WebRTC State: Map<PlayerID, Stream>
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const streamRef = useRef<MediaStream | null>(null); // Ref for callbacks

    // 1. Initialize AUDIO Only
    useEffect(() => {
        let localStream: MediaStream | null = null;
        let mounted = true;

        const initAudio = async () => {
            try {
                setStatus("Requesting Mic...");
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });

                if (!mounted) {
                    localStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setStream(localStream);
                streamRef.current = localStream;
                setStatus("Voice Active");
                setIsMuted(false);

            } catch (err) {
                console.error("Audio Access Error:", err);
                if (mounted) setError("Mic Access Denied");
            }
        };

        initAudio();

        return () => {
            mounted = false;
            // Cleanup on unmount
            if (localStream) localStream.getTracks().forEach(t => t.stop());
            peersRef.current.forEach(p => p.close());
            peersRef.current.clear();
        };
    }, []);

    // 2. Add/Remove Video Track
    const toggleVideo = async () => {
        if (!stream) {
            setError("No audio stream to add video to.");
            return;
        }

        if (isVideoEnabled) {
            // Turn OFF Video
            stream.getVideoTracks().forEach(t => {
                t.stop(); // Stop the track to release camera
                stream.removeTrack(t);
            });
            setIsVideoEnabled(false);

            // Notify peers about track removal (renegotiation)
            peersRef.current.forEach((peer) => {
                peer.getSenders().forEach(sender => {
                    if (sender.track && sender.track.kind === 'video') {
                        peer.removeTrack(sender);
                    }
                });
                // Trigger renegotiation (handled automatically by onnegotiationneeded)
            });

        } else {
            // Turn ON Video
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = videoStream.getVideoTracks()[0];

                stream.addTrack(videoTrack);
                setIsVideoEnabled(true);

                // Add track to all existing peers
                peersRef.current.forEach((peer) => {
                    try {
                        // Check if a video sender already exists and replace, otherwise add
                        const senders = peer.getSenders();
                        const videoSender = senders.find(s => s.track?.kind === 'video');
                        if (videoSender) {
                            videoSender.replaceTrack(videoTrack);
                        } else {
                            peer.addTrack(videoTrack, stream);
                        }
                    } catch (e) {
                        console.warn("Error adding video track to peer", e);
                    }
                });
            } catch (err) {
                console.error("Video Access Error:", err);
                setError("Camera Error");
            }
        }
    };

    const toggleMute = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const handleReconnect = () => {
        // Clear existing peers and remote streams
        peersRef.current.forEach(p => p.close());
        peersRef.current.clear();
        setRemoteStreams(new Map());
        setStatus("Reconnecting...");
        setError(null);

        // Re-initiate connections
        if (players && currentUserId && stream) {
            players.forEach(p => {
                if (p.id === currentUserId) return;
                if (currentUserId > p.id) { // Only initiator creates peer
                    setTimeout(() => createPeer(p.id, true), Math.random() * 1000);
                }
            });
        }
    };

    // 3. WebRTC Signals
    useEffect(() => {
        if (!players || !currentUserId || !stream) return;

        const handleSignal = async ({ from, signal }: { from: string, signal: any }) => {
            let peer = peersRef.current.get(from);
            // If we receive an offer and don't have a peer, create one (responder)
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
                console.warn("Signal Error", err);
            }
        };

        socket.on('signal', handleSignal);

        // Initiate connections
        players.forEach(p => {
            if (p.id === currentUserId) return;
            // Mesh: Connect to everyone. To avoid collision, only ID > TargetID initiates.
            if (currentUserId > p.id && !peersRef.current.has(p.id)) {
                // Add small random delay to avoid racing?
                setTimeout(() => createPeer(p.id, true), Math.random() * 1000);
            }
        });

        return () => {
            socket.off('signal', handleSignal);
        };
    }, [players, currentUserId, stream]); // Re-run if stream ready

    const createPeer = (targetId: string, initiator: boolean) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        });

        // Add Local Tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => peer.addTrack(track, streamRef.current!));
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', { to: targetId, signal: { candidate: event.candidate } });
            }
        };

        peer.ontrack = (event) => {
            setRemoteStreams(prev => new Map(prev).set(targetId, event.streams[0]));
        };

        peer.oniceconnectionstatechange = () => {
            if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
                peersRef.current.delete(targetId);
                setRemoteStreams(prev => {
                    const next = new Map(prev);
                    next.delete(targetId);
                    return next;
                });
            }
        };

        peer.onnegotiationneeded = async () => {
            // Only create offer if we are in a stable state (not already negotiating)
            if (peer.signalingState !== 'stable') return;

            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('signal', { to: targetId, signal: { description: offer } });
            } catch (err) {
                console.error("Negotiation Error", err);
            }
        };

        peersRef.current.set(targetId, peer);
        return peer;
    };


    return (
        <div className={`flex flex-col bg-[#1e293b]/95 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-xl relative shadow-2xl ${className}`}>
            {/* Header / Status */}
            <div className="bg-slate-900/50 p-3 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stream ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {status}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReconnect} className="p-1.5 hover:bg-slate-700 rounded-lg text-[10px] text-slate-500 hover:text-white transition-colors" title="Переподключить звук">
                        🔄
                    </button>
                    {error && <span className="text-[9px] text-red-400 font-bold bg-red-900/20 px-2 py-0.5 rounded">{error}</span>}
                </div>
            </div>

            {/* Participants Grid */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-2">
                    {/* ME */}
                    <div className="relative aspect-square bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden group">
                        {isVideoEnabled && stream ? (
                            <video
                                ref={video => { if (video) video.srcObject = stream; }}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        ) : (
                            <div className={`text-2xl ${!isMuted ? 'animate-pulse scale-110' : 'opacity-50'}`}>
                                🦊
                            </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 rounded-md text-[8px] text-white font-bold">
                            БЫ
                        </div>
                        {isMuted && <div className="absolute top-1 right-1 text-xs">🔇</div>}
                    </div>

                    {/* OTHERS */}
                    {players?.filter(p => p.id !== currentUserId).map(p => {
                        const remoteStream = remoteStreams.get(p.id);
                        const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled;

                        return (
                            <div key={p.id} className="relative aspect-square bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700/50 overflow-hidden">
                                {remoteStream ? (
                                    hasRemoteVideo ? (
                                        <video
                                            ref={el => { if (el) el.srcObject = remoteStream; }}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>
                                            <div className="text-2xl animate-bounce">👤</div>
                                            <audio
                                                ref={el => { if (el) el.srcObject = remoteStream; }}
                                                autoPlay
                                            />
                                        </>
                                    )
                                ) : (
                                    <div className="text-2xl opacity-20">⏳</div>
                                )}
                                <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 rounded-md text-[8px] text-white font-bold truncate max-w-[90%]">
                                    {p.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-700/50 flex items-center justify-center gap-4">
                <button
                    onClick={toggleMute}
                    className={`p-3 rounded-xl transition-all active:scale-95 shadow-lg ${isMuted
                        ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
                        : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'}`}
                >
                    {isMuted ? '🔇' : '🎤'}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-xl transition-all active:scale-95 shadow-lg ${isVideoEnabled
                        ? 'bg-emerald-500 text-white border border-emerald-400 hover:bg-emerald-600'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600'}`}
                >
                    {isVideoEnabled ? '📹' : '📷'}
                </button>
            </div>
        </div>
    );
};
