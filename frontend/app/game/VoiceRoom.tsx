import {
    LiveKitRoom,
    RoomAudioRenderer,
    useToken,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useState, useEffect } from 'react';
import { VoiceControls } from './VoiceControls';

interface VoiceRoomProps {
    roomId: string;
    userId: string;
    username: string;
}

export const VoiceRoom = ({ roomId, userId, username }: VoiceRoomProps) => {
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
            <RoomAudioRenderer />
            <VoiceControls />
        </LiveKitRoom>
    );
};
