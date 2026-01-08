import { useLocalParticipant, useRoomContext, useParticipants, useParticipantContext } from '@livekit/components-react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

interface VoiceControlsProps {
    onSpeakingChanged?: (speaking: boolean) => void;
    players: any[]; // Game players list to match photos
}

// Sub-component for individual avatar to handle speaking state efficiently
const VoiceAvatar = ({ participant, player }: { participant: any, player: any }) => {
    // We can use the simpler 'isSpeaking' property if we force updates, 
    // but a reliable way is to check the participant state or use a hook if available for single participant.
    // Since we are inside a map, we can just use the prop if the parent re-renders, 
    // OR we can use a local state listener for this specific participant.
    // LiveKit's `useParticipants` updates on speaking changes if configured, but let's be safe.

    // Actually, let's just use the style directly based on the participant's current state 
    // which triggers re-renders from the parent hook `useParticipants`.

    const isSpeaking = participant.isSpeaking;

    return (
        <div className="relative group" title={player?.name || participant.identity}>
            <div className={`w-8 h-8 rounded-full border-2 transition-all duration-300 overflow-hidden bg-slate-800
                ${isSpeaking ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] scale-110' : 'border-slate-600 opacity-80 group-hover:opacity-100'}
            `}>
                {player?.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                        {player?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>
            {/* Mic Muted Indicator */}
            {!participant.isMicrophoneEnabled && (
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700">
                    <MicOff size={8} className="text-red-400" />
                </div>
            )}
        </div>
    );
};

export const VoiceControls = ({ onSpeakingChanged, players = [] }: VoiceControlsProps) => {
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants(); // Get all connected participants
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
            if (onSpeakingChanged) onSpeakingChanged(speaking);
        };

        localParticipant.on('isSpeakingChanged', onIsSpeakingChanged);
        return () => {
            localParticipant.off('isSpeakingChanged', onIsSpeakingChanged);
        };
    }, [localParticipant, onSpeakingChanged]);

    return (
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <button
                onClick={toggleMute}
                className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    } ${isSpeaking && !isMuted ? 'ring-2 ring-emerald-400/50 scale-105' : ''}`}
            >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* AVATAR LIST - Show other participants */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-2">
                {participants.map(p => {
                    // Match participant identity (userId) with Game Player
                    // Assuming p.identity matches player.id or player.userId
                    const player = players.find(pl => pl.id === p.identity || pl.userId === p.identity) || { name: p.identity };

                    // Skip if we want to hide self from this list? No, user usually wants to see themselves glowing too.
                    // But we have the big mic button for self. 
                    // Let's show everyone for completeness as requested "pictures of players".
                    return (
                        <VoiceAvatar key={p.identity} participant={p} player={player} />
                    );
                })}
            </div>

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
