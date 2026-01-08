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

export const VoiceRoom = ({ roomId, userId, username, onSpeakingChanged, onActiveSpeakersChange }: VoiceRoomProps) => {
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
        return <div className="text-xs text-white/50">Connecting audio...</div>;
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect={true}
            audio={true}
            video={false}
            data-lk-theme="default"
            className="w-full flex flex-col items-center"
        >
            <StartAudio label="Click to allow audio" className="bg-blue-500 text-white px-2 py-1 rounded mb-2 text-xs" />
            <RoomAudioRenderer />
            <ActiveSpeakersObserver onActiveSpeakersChange={onActiveSpeakersChange} />
            <VoiceControls onSpeakingChanged={onSpeakingChanged} />
        </LiveKitRoom>
    );
};
