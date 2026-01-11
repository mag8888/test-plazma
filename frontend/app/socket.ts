"use client";

import { io } from "socket.io-client";
import { getBackendUrl, getGameServiceUrl } from "../lib/config";

const SOCKET_URL = getGameServiceUrl();

// Prevent SSR Crash: Only initialize socket on client
export const socket = (typeof window !== 'undefined' ? io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'], // Prefer Websocket for mobile stability
    timeout: 45000,
    forceNew: false,
    upgrade: true,
}) : {
    // Mock for Server Side Rendering
    on: () => { },
    off: () => { },
    emit: () => { },
    connect: () => { },
    disconnect: () => { },
    active: false,
    connected: false,
}) as any;

// Debug listeners
if (typeof window !== 'undefined' && socket) {
    socket.on('connect', () => console.log('✅ Socket Connected!', socket.id));
    socket.on('connect_error', (err: any) => console.error('❌ Socket Connection Error:', err));
    socket.on('disconnect', (reason: any) => console.warn('⚠️ Socket Disconnected:', reason));
}
