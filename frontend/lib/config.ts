export const getBackendUrl = () => {
    // HARDCODED CONFIG FOR PRODUCTION (NUCLEAR FIX V14)
    // We strictly return the live backend URL to bypass any misconfigured environment variables
    // that might be pointing to the frontend itself (causing 404s).
    return 'https://moneo-live.up.railway.app';
};

export const getGameServiceUrl = () => {
    // Same for Game Service
    return 'https://moneo-live.up.railway.app';
};
