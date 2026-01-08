export { };

declare global {
    interface Window {
        Telegram: {
            WebApp: {
                initData: string;
                initDataUnsafe: {
                    user?: {
                        language_code?: string;
                    }
                };
                ready: () => void;
            };
        };
    }
}
