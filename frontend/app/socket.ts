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
    transports: ['websocket'], // Force WebSocket to bypass 400 Errors on Polling (Sticky Session/Proxy issues)
    timeout: 20000,
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
