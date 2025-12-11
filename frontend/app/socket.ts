"use client";

import { io } from "socket.io-client";

const getSocketUrl = () => {
    // 1. Try Environmental Variable
    let url = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    url = url.replace(/^["']|["']$/g, '');
    if (url) {
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        return url.replace(/\/$/, '');
    }

    // 2. Try Relative (Same Origin) if in Browser and not Localhost
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const origin = window.location.origin;
        console.log('Socket connecting to origin:', origin);
        return origin;
    }

    // 3. Fallback to Localhost Dev
    return 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});
