import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

export const VoiceControls = () => {
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const toggleMute = () => {
        if (localParticipant) {
            const newState = !isMuted;
            localParticipant.setMicrophoneEnabled(!newState);
            setIsMuted(newState);
        }
    };

    // Monitor speaking state
    useEffect(() => {
        if (!localParticipant) return;

        const onIsSpeakingChanged = (speaking: boolean) => {
            setIsSpeaking(speaking);
        };

        localParticipant.on('isSpeakingChanged', onIsSpeakingChanged);
        return () => {
            localParticipant.off('isSpeakingChanged', onIsSpeakingChanged);
        };
    }, [localParticipant]);

    return (
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <button
                onClick={toggleMute}
                className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    } ${isSpeaking && !isMuted ? 'ring-2 ring-emerald-400/50 scale-105' : ''}`}
            >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Simple Volume Indicator could go here */}
            {isSpeaking && !isMuted && (
                <div className="flex gap-0.5 items-center h-3">
                    <div className="w-0.5 h-2 bg-emerald-400 animate-pulse" />
                    <div className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75" />
                    <div className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-150" />
                </div>
            )}
        </div>
    );
};
