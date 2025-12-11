"use client";

import { io } from "socket.io-client";

const getSocketUrl = () => {
    let url = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    url = url.replace(/^["']|["']$/g, '');
    if (!url) return 'http://localhost:3001';
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    return url.replace(/\/$/, '');
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ["websocket"],
});
