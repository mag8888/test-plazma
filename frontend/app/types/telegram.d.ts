export { };

declare global {
    interface Window {
        Telegram: {
            WebApp: {
                initData: string;
                initDataUnsafe: {
                    user?: {
                        id?: number;
                        username?: string;
                        first_name?: string;
                        last_name?: string;
                        language_code?: string;
                        [key: string]: any;
                    };
                };
                ready: () => void;
                HapticFeedback: {
                    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
                    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
                    selectionChanged: () => void;
                };
                [key: string]: any;
            };
        };
    }
}
