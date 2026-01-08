import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useParticipants, useLocalParticipant } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { useEffect, useState } from 'react';
import '@livekit/components-styles';
import { VoiceControls } from './VoiceControls';
import { getBackendUrl } from '../../lib/config';

interface VoiceRoomProps {
    roomId: string;
    userId: string;
    username: string;
    onSpeakingChanged?: (speaking: boolean) => void;
    onActiveSpeakersChange?: (speakers: string[]) => void;
    children?: React.ReactNode | ((isConnected: boolean) => React.ReactNode);
}

// Inner component to use Hooks safely inside LiveKitRoom context
const VoiceRoomInner = ({ onActiveSpeakersChange, children, onSpeakingChanged }: any) => {
    const room = useRoomContext();
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (room.state === 'connected') {
            setIsConnected(true);
        }

        const onStateChanged = (state: any) => {
            setIsConnected(state === 'connected');
        };

        room.on(RoomEvent.ConnectionStateChanged, onStateChanged);
        return () => { room.off(RoomEvent.ConnectionStateChanged, onStateChanged); };
    }, [room]);

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

    return (
        <div className="w-full h-full flex flex-col relative voice-room-active">
            {content}
            {/* Audio Renderer handles incoming audio */}
            <RoomAudioRenderer />

            {/* Built-in Controls overlay if not provided by children manually */}
            {/* Only show if we are NOT using a render prop (which implies custom UI) */}
            {typeof children !== 'function' && isConnected && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
                    <VoiceControls onSpeakingChanged={onSpeakingChanged} />
                </div>
            )}
        </div>
    );
};

export const VoiceRoom = ({ roomId, userId, username, onSpeakingChanged, onActiveSpeakersChange, children }: VoiceRoomProps) => {
    const [token, setToken] = useState('');
    const [url, setUrl] = useState('');

    useEffect(() => {
        const fetchToken = async () => {
            try {
                // Use Dynamic Backend URL
                const backend = getBackendUrl();
                const res = await fetch(`${backend}/api/voice/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, userId, username })
                });
                const data = await res.json();
                if (data.token) {
                    setToken(data.token);
                    setUrl(data.url);
                }
            } catch (e) {
                console.error("Failed to fetch voice token:", e);
            }
        };

        if (roomId && userId) fetchToken();
    }, [roomId, userId, username]);

    if (!token || !url) {
        // Render children with false state while loading
        const content = typeof children === 'function' ? children(false) : children;
        return <div className="voice-loading">{content}</div>;
    }

    return (
        <LiveKitRoom
            serverUrl={url}
            token={token}
            connect={true}
            options={{ adaptiveStream: true }}
            data-lk-theme="default"
            style={{ height: '100%', width: '100%' }} // Ensure full size
        >
            <VoiceRoomInner
                onSpeakingChanged={onSpeakingChanged}
                onActiveSpeakersChange={onActiveSpeakersChange}
                children={children}
            />
        </LiveKitRoom>
    );
};
