// V18 SMART CONFIG: Dynamic Backend Selection based on Domain
// Prevents "Dev knocking on Live" by routing appropriately.

export const getBackendUrl = () => {
    // 1. Runtime Domain Sniffing (Browser Only) - PRIORITY 1 to avoid Env Var pollution
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // DEV Environment
        if (hostname.includes('dev') || hostname.includes('neodev') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            console.log(`[Config] Detected DEV environment (${hostname}). Using moneo-dev backend.`);
            return 'https://moneo-dev.up.railway.app';
        }

        // PROD Environment checks
        if (hostname.includes('moneo-live') || hostname.includes('game-service')) {
            console.log('[Config] Detected PROD environment. Using moneo-live backend.');
            return 'https://moneo-live.up.railway.app';
        }
    }

    // 2. Env Var (Priority 2 - Fallback or Server Side)
    const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
    if (envUrl && !envUrl.includes('game-service-production')) return envUrl;

    // 3. Fallback (Default to Live for safety)
    return 'https://moneo-live.up.railway.app';
};

export const getGameServiceUrl = () => {
    // Reuse the same logic for Game Service to keep them in sync
    return getBackendUrl();
};
