import { useVoice } from './VoiceContext';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

interface VoiceControlsProps {
    onSpeakingChanged?: (speaking: boolean) => void;
    players: any[]; // Game players list to match photos
    isHost?: boolean;
    onKickPlayer?: (playerId: string) => void;
    onTransferCash?: (playerId: string) => void;
    onTransferAsset?: (playerId: string) => void;
    onSkipTurn?: (playerId: string) => void;
    onForceMove?: (playerId: string) => void;
    myId?: string;
}

// Sub-component for individual avatar to handle speaking state efficiently
const VoiceAvatar = ({ participant, player, isHost, onKick, onTransferCash, onTransferAsset, onSkip, onForceMove, isMe }: {
    participant?: any,
    player: any,
    isHost?: boolean,
    onKick?: (id: string) => void,
    onTransferCash?: (id: string) => void,
    onTransferAsset?: (id: string) => void,
    onSkip?: (id: string) => void,
    onForceMove?: (id: string) => void,
    isMe?: boolean
}) => {
    // We rely on parent updates or participant property being present
    // Since we receive the participant object from context which updates on change, this is fine.

    const isSpeaking = participant?.isSpeaking;
    const isConnected = !!participant;

    const [showMenu, setShowMenu] = useState(false);

    // Close menu when clicking outside is wired in parent/global usually, 
    // but here we have a local backdrop.

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

            {/* Name Display (Always visible ABOVE) */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-1 rounded text-[8px] font-bold text-white pointer-events-none whitespace-nowrap max-w-[60px] truncate z-20">
                {player?.name}
            </div>

            {/* Offline Indicator */}
            {!isConnected && (
                <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-red-500/50 z-10">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
            )}

            {/* Mic Muted Indicator */}
            {isConnected && participant && !participant.isMicrophoneEnabled && (
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
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 z-[9999] flex flex-col gap-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[10px] text-slate-400 px-2 py-1 border-b border-white/5 truncate font-bold text-center">
                        {player.name}
                    </div>

                    <div className="px-2 py-1 text-center">
                        <span className="text-xs font-mono text-emerald-400 font-bold">${(player.cash || 0).toLocaleString()}</span>
                    </div>

                    {!isMe && (
                        <>
                            {onTransferCash && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTransferCash(player.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-[10px] text-white hover:bg-slate-700 px-2 py-1.5 rounded text-center transition-colors font-bold uppercase border border-slate-600/50"
                                >
                                    Перевести $
                                </button>
                            )}
                            {onTransferAsset && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTransferAsset(player.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-[10px] text-white hover:bg-slate-700 px-2 py-1.5 rounded text-center transition-colors font-bold uppercase border border-slate-600/50"
                                >
                                    Передать Актив
                                </button>
                            )}
                        </>
                    )}

                    {isHost && !isMe && (
                        <>
                            <div className="h-px bg-slate-700/50 my-1"></div>
                            {onSkip && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSkip(player.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-[10px] text-blue-400 hover:bg-blue-500/20 px-2 py-1.5 rounded text-center transition-colors font-bold uppercase"
                                >
                                    Пропустить
                                </button>
                            )}
                            {onForceMove && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onForceMove(player.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-[10px] text-yellow-400 hover:bg-yellow-500/20 px-2 py-1.5 rounded text-center transition-colors font-bold uppercase"
                                >
                                    Бросок
                                </button>
                            )}
                        </>
                    )}

                    {isHost && onKick && !isMe && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onKick(player.id);
                                setShowMenu(false);
                            }}
                            className="w-full text-[10px] text-red-400 hover:bg-red-500/20 px-2 py-1.5 rounded text-center transition-colors font-bold uppercase mt-1"
                        >
                            Исключить
                        </button>
                    )}
                </div>
            )}

            {/* Click Outside to close */}
            {showMenu && <div className="fixed inset-0 z-[9990]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />}
        </div>
    );
};

export const VoiceControls = ({ onSpeakingChanged, players = [], isHost, onKickPlayer, onTransferCash, onTransferAsset, onSkipTurn, onForceMove, myId }: VoiceControlsProps) => {
    // SAFELY consume context instead of direct hooks
    const { localParticipant, participants, room, isConnected, error } = useVoice();

    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Derived mic state (localParticipant is truth only 90%)
    // But we need instant feedback, so state is fine.
    const isMicOn = !isMuted && isConnected;

    const toggleMute = () => {
        if (localParticipant) {
            const newState = !isMuted;
            localParticipant.setMicrophoneEnabled(!newState);
            setIsMuted(newState);
        } else {
            console.warn("Cannot toggle mute: LocalParticipant not found");
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


        <div className="flex flex-col items-center w-full">
            <div className="flex flex-wrap justify-center gap-2 px-2 max-w-[95vw]">
                {/* Embedded Mic Button */}
                <button
                    onClick={toggleMute}
                    className={`rounded-full border transition-all shadow-lg active:scale-95 flex items-center justify-center w-10 h-10 backdrop-blur-md shrink-0
                        ${isMicOn
                            ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'
                            : 'bg-red-500/80 border-red-500 text-white animate-pulse shadow-red-500/50'}
                    `}
                    title={isMicOn ? "Выключить микрофон" : "Включить микрофон"}
                >
                    {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                {players.map((p) => {
                    // Find participant
                    const participant = participants.find(part => part.identity === p.id || part.identity === p.userId);
                    return (
                        <VoiceAvatar
                            key={p.id}
                            player={p}
                            participant={participant}
                            isHost={isHost}
                            onKick={onKickPlayer}
                            onTransferCash={onTransferCash}
                            onTransferAsset={onTransferAsset}
                            onSkip={onSkipTurn}
                            onForceMove={onForceMove}
                            isMe={p.id === myId || p.userId === myId}
                        />
                    );
                })}
            </div>

            {/* Connection / Status line - optional/hidden to clean up UI as requested */}
            {!isConnected && (
                <div className="mt-2 text-[10px] animate-pulse text-yellow-500 text-center w-full">
                    {error ? (error === 'Timeout' ? 'ERR: Timeout' : 'ERR: Conn') : 'Подключение...'}
                </div>
            )}
        </div>
    );
};

// Helper to avoid TS error in template above (I used isDirectoryConnected which is not real)
// Fixing the boolean check inline.
function isDirectoryConnected(c: boolean) { return c; }
