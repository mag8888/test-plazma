import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useParticipants, useLocalParticipant, useConnectionState } from '@livekit/components-react';
import { RoomEvent, ConnectionState } from 'livekit-client';
import { useEffect, useState } from 'react';
import '@livekit/components-styles';
import { VoiceControls } from './VoiceControls';
import { getBackendUrl } from '../../lib/config';
import { VoiceProvider } from './VoiceContext';

interface VoiceRoomProps {
    roomId: string;
    userId: string;
    username: string;
    onSpeakingChanged?: (speaking: boolean) => void;
    onActiveSpeakersChange?: (speakers: string[]) => void;
    children?: React.ReactNode | ((isConnected: boolean) => React.ReactNode);
}

// Inner component to use Hooks safely inside LiveKitRoom context
const VoiceRoomInner = ({ onActiveSpeakersChange, children, onSpeakingChanged, players, isHost, onKickPlayer }: any) => {
    const room = useRoomContext();
    const participants = useParticipants();
    const connectionState = useConnectionState();
    const { localParticipant } = useLocalParticipant();
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (room.state === 'connected') {
            setIsConnected(true);
            setError(null);
        }

        const onStateChanged = (state: any) => {
            setIsConnected(state === 'connected');
            if (state === 'connected') setError(null);
        };

        const onDisconnected = (reason?: any) => {
            console.log("Disconnected:", reason);
            // Don't show error on normal disconnect, but maybe on failure
        };

        // Listen for specific failures if possible, generally `Disconnected` with reason
        room.on(RoomEvent.ConnectionStateChanged, onStateChanged);
        room.on(RoomEvent.Disconnected, onDisconnected);
        return () => {
            room.off(RoomEvent.ConnectionStateChanged, onStateChanged);
            room.off(RoomEvent.Disconnected, onDisconnected);
        };
    }, [room]);

    // Safety timeout: If connecting for too long (>10s), show error
    useEffect(() => {
        if (connectionState === ConnectionState.Connecting) {
            const timer = setTimeout(() => {
                if (connectionState === ConnectionState.Connecting) {
                    setError("Timeout");
                }
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [connectionState]);

    // Active Speakers Logic
    useEffect(() => {
        if (!onActiveSpeakersChange) return;
        const interval = setInterval(() => {
            // LiveKit Logic: Filter participants who are speaking
            const speakers = participants
                .filter(p => p.isSpeaking)
                .map(p => p.identity);
            onActiveSpeakersChange(speakers);
        }, 500);
        return () => clearInterval(interval);
    }, [participants, onActiveSpeakersChange]);

    const content = typeof children === 'function' ? children(isConnected) : children;

    // Provide Real State
    const voiceState = {
        isConnected: connectionState === ConnectionState.Connected,
        connectionState,
        participants,
        room,
        localParticipant,
        error
    };

    return (
        <VoiceProvider value={voiceState}>
            <div className="w-full h-full flex flex-col relative voice-room-active">
                {content}
                {/* Audio Renderer handles incoming audio */}
                <RoomAudioRenderer />

                {/* Built-in Controls overlay if not provided by children manually */}
                {/* Only show if we are NOT using a render prop (which implies custom UI) */}
                {typeof children !== 'function' && isConnected && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
                        <VoiceControls
                            onSpeakingChanged={onSpeakingChanged}
                            players={players}
                            isHost={isHost}
                            onKickPlayer={onKickPlayer}
                        />
                    </div>
                )}
            </div>
        </VoiceProvider>
    );
};

export const VoiceRoom = ({ roomId, userId, username, onSpeakingChanged, onActiveSpeakersChange, children, players, isHost, onKickPlayer }: VoiceRoomProps & { players: any[], isHost?: boolean, onKickPlayer?: (id: string) => void }) => {
    const [token, setToken] = useState('');
    const [url, setUrl] = useState('');
    const [tokenError, setTokenError] = useState<string | null>(null);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                setTokenError(null);
                // Use Dynamic Backend URL
                const backend = getBackendUrl();
                const res = await fetch(`${backend}/api/voice/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, userId, username })
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);

                const data = await res.json();
                console.log("[VoiceRoom] Token Response:", data);
                if (data.token) {
                    setToken(data.token);
                    let finalUrl = data.url;

                    // Auto-upgrade to WSS if we are on HTTPS
                    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && finalUrl.startsWith('ws:')) {
                        finalUrl = finalUrl.replace('ws:', 'wss:');
                        console.warn("[Voice] Auto-upgraded Voice URL to WSS (Secure) for HTTPS context:", finalUrl);
                    }

                    setUrl(finalUrl);
                } else {
                    throw new Error("No token");
                }
            } catch (e: any) {
                console.error("Failed to fetch voice token:", e);
                setTokenError(e.message || "Auth Error");
            }
        };

        if (roomId && userId) fetchToken();
    }, [roomId, userId, username]);


    if (tokenError) {
        const errorState = {
            isConnected: false,
            connectionState: ConnectionState.Disconnected,
            participants: [],
            error: tokenError
        };
        const content = typeof children === 'function' ? children(false) : children;
        return (
            <VoiceProvider value={errorState}>
                <div className="voice-error">{content}</div>
            </VoiceProvider>
        );
    }

    if (!token || !url) {
        // Render children with false state while loading
        const content = typeof children === 'function' ? children(false) : children;
        // Provide Disconnected State
        const defaultVoiceState = {
            isConnected: false,
            connectionState: ConnectionState.Disconnected,
            participants: [],
            error: null
        };
        return (
            <VoiceProvider value={defaultVoiceState}>
                <div className="voice-loading">{content}</div>
            </VoiceProvider>
        );
    }

    return (
        <LiveKitRoom
            serverUrl={url}
            token={token}
            connect={true}
            options={{ adaptiveStream: true }}
            data-lk-theme="default"
            style={{ height: '100%', width: '100%' }} // Ensure full size
            onError={(e) => { console.error("LiveKit Error:", e); setTokenError(e.message); }}
        >
            <VoiceRoomInner
                onSpeakingChanged={onSpeakingChanged}
                onActiveSpeakersChange={onActiveSpeakersChange}
                children={children}
                players={players}
                isHost={isHost}
                onKickPlayer={onKickPlayer}
            />
        </LiveKitRoom>
    );
};
