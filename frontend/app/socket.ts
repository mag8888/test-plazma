"use client";

import { io } from "socket.io-client";
import { getBackendUrl, getGameServiceUrl } from "../lib/config";

const SOCKET_URL = getGameServiceUrl();

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket'], // Force WebSocket to bypass 400 Errors on Polling (Sticky Session/Proxy issues)
    timeout: 20000,
});
