// SAFE MODE: VoiceRoom logic disabled temporarily to debug React Error #321
// This component now strictly renders children with isConnected=false.

interface VoiceRoomProps {
    roomId: string;
    userId: string;
    username: string;
    onSpeakingChanged?: (speaking: boolean) => void;
    onActiveSpeakersChange?: (speakers: string[]) => void;
}

export const VoiceRoom = ({ roomId, userId, username, onSpeakingChanged, onActiveSpeakersChange, children }: VoiceRoomProps & { children?: React.ReactNode | ((isConnected: boolean) => React.ReactNode) }) => {
    // 1. Completely bypass LiveKit logic to isolate the crash
    // We suspect LiveKitRoom or hooks are conflicting with the app's React version/context.

    // Check if children is a function (render prop) or node
    const content = typeof children === 'function' ? children(false) : children;

    return (
        <div className="w-full h-full flex flex-col voice-room-wrapper-disabled">
            {content}
        </div>
    );
};
