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

export const VoiceRoom = ({ roomId, userId, username, onSpeakingChanged, onActiveSpeakersChange, children }: VoiceRoomProps & { children?: React.ReactNode }) => {
    const [token, setToken] = useState('');
    const [url, setUrl] = useState('');

    useEffect(() => {
        const fetchToken = async () => {
            try {
                // Using relative path assuming Next.js proxy rewrite or direct call
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/voice/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, userId, username }),
                });
                const data = await response.json();
                setToken(data.token);
                // Use backend provided URL or fallback env
                setUrl(data.url);
            } catch (e) {
                console.error("Failed to fetch voice token:", e);
            }
        };

        if (roomId && userId) {
            fetchToken();
        }
    }, [roomId, userId, username]);

    if (!token || !url) {
        // While connecting, we still want to render the game! 
        // Just show children. Audio will kick in later.
        return (
            <div className="relative w-full h-full flex flex-col">
                {/* Show loading indicator purely for debug if needed, but better silent */}
                {children}
            </div>
        );
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect={true}
            audio={true}
            video={false}
            data-lk-theme="default"
            className="w-full h-full flex flex-col"
        >
            <StartAudio label="Включить звук" className="absolute top-2 left-1/2 -translate-x-1/2 z-[200] bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl animate-bounce cursor-pointer border-2 border-white" />
            <RoomAudioRenderer />
            <ActiveSpeakersObserver onActiveSpeakersChange={onActiveSpeakersChange} />
            {/* We no longer force <VoiceControls /> here. We let children decide where to put them. */}

            {children}
        </LiveKitRoom>
    );
};
