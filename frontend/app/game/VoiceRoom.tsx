import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
    useToken,
    useRoomContext,
} from '@livekit/components-react';
import { RoomEvent, Participant } from 'livekit-client';
import '@livekit/components-styles';
import { useState, useEffect } from 'react';
import { VoiceControls } from './VoiceControls';
import { getGameServiceUrl } from '../../lib/config';

interface VoiceRoomProps {
    roomId: string;
    userId: string;
    username: string;
    onSpeakingChanged?: (speaking: boolean) => void;
    onActiveSpeakersChange?: (speakers: string[]) => void;
}

const ActiveSpeakersObserver = ({ onActiveSpeakersChange }: { onActiveSpeakersChange?: (speakers: string[]) => void }) => {
    const room = useRoomContext();
    const [speakingIds, setSpeakingIds] = useState<string[]>([]);

    useEffect(() => {
        if (!room) return;

        const onActiveSpeakersChanged = (speakers: Participant[]) => {
            const ids = speakers.map(s => s.identity);
            setSpeakingIds(ids);
            if (onActiveSpeakersChange) onActiveSpeakersChange(ids);
        };

        room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);

        // Initial check?
        // speakers is empty initially usually.

        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
        };
    }, [room, onActiveSpeakersChange]);

    return null;
};

export const VoiceRoom = ({ roomId, userId, username, onSpeakingChanged, onActiveSpeakersChange, children }: VoiceRoomProps & { children?: React.ReactNode | ((isConnected: boolean) => React.ReactNode) }) => {
    const [token, setToken] = useState('');
    const [url, setUrl] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                // Use absolute URL from config (Next.js Static Export requires full URL)
                const baseUrl = getGameServiceUrl();
                const response = await fetch(`${baseUrl}/api/voice/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, userId, username }),
                });
                const data = await response.json();
                setToken(data.token);
                setUrl(data.url);
                setIsConnected(true);
            } catch (e) {
                console.error("Failed to fetch voice token:", e);
                // Retry?
            }
        };

        if (roomId && userId) {
            fetchToken();
        }
    }, [roomId, userId, username]);

    // Safe content rendering
    const content = typeof children === 'function' ? children(!!(token && url)) : children;

    // 1. If no token/url, render logic-only wrapper (avoid LiveKitRoom entirely to prevent context errors if it mounts/unmounts)
    if (!token || !url) {
        return (
            <div className="w-full h-full flex flex-col voice-room-wrapper-disconnected">
                {content}
            </div>
        );
    }

    // 2. If token exists, render LiveKitRoom
    // IMPORTANT: Ensure LiveKitRoom doesn't flip-flop.
    // We use a key to force remount only if critical props change, but standard diffing should handle it.
    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect={true}
            audio={true}
            video={false}
            data-lk-theme="default"
            className="w-full h-full flex flex-col voice-room-wrapper-connected"
        >
            <StartAudio label="Включить звук" className="absolute top-2 left-1/2 -translate-x-1/2 z-[200] bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl animate-bounce cursor-pointer border-2 border-white" />
            <RoomAudioRenderer />
            <ActiveSpeakersObserver onActiveSpeakersChange={onActiveSpeakersChange} />

            {/* Render children inside the Context Provider */}
            {content}
        </LiveKitRoom>
    );
};
