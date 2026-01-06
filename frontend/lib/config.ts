export const getBackendUrl = () => {
    // 1. Try Environmental Variable (Prioritize explicit config)
    let url = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    url = url.replace(/^["']|["']$/g, '');

    if (url) {
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        return url.replace(/\/$/, '');
    }

    // 2. Try Relative (Same Origin) - Fallback for Monolith/Unconfigured
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const origin = window.location.origin;
        return origin;
    }

    // 3. No configuration found - Default to Live Backend
    console.warn("Backend URL not configured. Defaulting to Live.");
    return 'https://moneo-live.up.railway.app';
};

export const getGameServiceUrl = () => {
    let url = (process.env.NEXT_PUBLIC_GAME_API_URL || '').trim();
    if (url) {
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        return url.replace(/\/$/, '');
    }

    // Fallback: If no strict Game URL set, assume it might be on port 5001 locally
    // or same origin if deployed with path routing (future).
    // For now, let's default to localhost:5001 if hostname is localhost
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5001';
    }

    // Default to existing Backend URL if we assume legacy behavior or Same Origin proxy
    const fallback = getBackendUrl();
    if (typeof window !== 'undefined') {
        console.warn(`[Config] NEXT_PUBLIC_GAME_API_URL not set. Defaulting to: ${fallback}. (This will fail if Partnership Service doesn't support Socket.IO)`);
    }
    return fallback;
};
