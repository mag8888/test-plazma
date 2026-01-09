import { useLocalParticipant, useRoomContext, useParticipants, useParticipantContext } from '@livekit/components-react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

interface VoiceControlsProps {
    onSpeakingChanged?: (speaking: boolean) => void;
    players: any[]; // Game players list to match photos
    isHost?: boolean;
    onKickPlayer?: (playerId: string) => void;
}

// Sub-component for individual avatar to handle speaking state efficiently
const VoiceAvatar = ({ participant, player, isHost, onKick }: { participant?: any, player: any, isHost?: boolean, onKick?: (id: string) => void }) => {
    // We can use the simpler 'isSpeaking' property if we force updates, 
    // but a reliable way is to check the participant state or use a hook if available for single participant.
    // Since we are inside a map, we can just use the prop if the parent re-renders, 
    // OR we can use a local state listener for this specific participant.
    // LiveKit's `useParticipants` updates on speaking changes if configured, but let's be safe.

    // Actually, let's just use the style directly based on the participant's current state 
    // which triggers re-renders from the parent hook `useParticipants`.

    const isSpeaking = participant?.isSpeaking;
    const isConnected = !!participant;

    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="relative group cursor-pointer" title={player?.name || participant?.identity} onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full border-2 transition-all duration-300 overflow-hidden bg-slate-800
                ${isSpeaking ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] scale-110' :
                    isConnected ? 'border-slate-500 opacity-90 group-hover:opacity-100' : 'border-red-500/50 opacity-50 grayscale'}
            `}>
                {player?.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                        {player?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>

            {/* Offline Indicator */}
            {!isConnected && (
                <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-red-500/50 z-10">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
            )}

            {/* Mic Muted Indicator */}
            {isConnected && !participant.isMicrophoneEnabled && (
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700 z-10">
                    <MicOff size={10} className="text-red-400" />
                </div>
            )}

            {/* Balance Display (Always visible below) */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-1 rounded text-[8px] font-mono text-emerald-400 pointer-events-none whitespace-nowrap">
                ${(player.cash || 0).toLocaleString()}
            </div>

            {/* Menu */}
            {showMenu && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-1 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[10px] text-slate-400 px-2 py-1 border-b border-white/5 truncate font-bold text-center">
                        {player.name}
                    </div>

                    <div className="px-2 py-1 text-center">
                        <span className="text-xs font-mono text-emerald-400 font-bold">${(player.cash || 0).toLocaleString()}</span>
                    </div>

                    {isHost && onKick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onKick(player.id);
                                setShowMenu(false);
                            }}
                            className="w-full text-[10px] text-red-400 hover:bg-red-500/20 px-2 py-1.5 rounded text-center transition-colors font-bold uppercase"
                        >
                            Исключить
                        </button>
                    )}
                </div>
            )}

            {/* Click Outside to close */}
            {showMenu && <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />}
        </div>
    );
};

export const VoiceControls = ({ onSpeakingChanged, players = [], isHost, onKickPlayer }: VoiceControlsProps) => {
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

            {/* AVATAR LIST - Show ALL players */}
            <div className="flex items-center gap-3 pl-2 border-l border-white/10 ml-2">
                {players.map(player => {
                    // Find participant if online
                    const participant = participants.find(p => p.identity === player.id || p.identity === player.userId);

                    return (
                        <VoiceAvatar
                            key={player.id}
                            participant={participant} // Valid or undefined
                            player={player}
                            isHost={isHost}
                            onKick={onKickPlayer}
                        />
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
