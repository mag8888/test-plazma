"use client";

import { createContext, useContext, ReactNode } from 'react';
import type { Participant, Room, LocalParticipant } from 'livekit-client';
import { ConnectionState } from 'livekit-client';

interface VoiceContextState {
    isConnected: boolean;
    connectionState: ConnectionState;
    participants: Participant[];
    room?: Room;
    localParticipant?: LocalParticipant;
    error?: Error;
}

const defaultState: VoiceContextState = {
    isConnected: false,
    connectionState: ConnectionState.Disconnected,
    participants: [],
};

const VoiceContext = createContext<VoiceContextState>(defaultState);

export const useVoice = () => useContext(VoiceContext);

export const VoiceProvider = ({ children, value }: { children: ReactNode, value: VoiceContextState }) => {
    return (
        <VoiceContext.Provider value={value}>
            {children}
        </VoiceContext.Provider>
    );
};
