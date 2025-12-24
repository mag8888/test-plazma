'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useTelegram } from '../../../components/TelegramProvider';

export default function AdminProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isReady } = useTelegram();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Wait for Telegram auth to be ready if possible
        if (!isReady) return;

        const auth = localStorage.getItem('admin_authenticated');
        const ADMINS = ['adminroman', 'adminmax', 'adminanton'];
        const username = user?.username?.toLowerCase() || '';

        if (auth === 'true' || ADMINS.includes(username)) {
            setIsAuthenticated(true);
            // Ensure flag is set for consistency
            if (auth !== 'true') localStorage.setItem('admin_authenticated', 'true');
        } else {
        } else {
            router.push('/');
        }
    }
        setIsLoading(false);
}, [router, user, isReady]);

if (isLoading) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-white">Загрузка...</div>
        </div>
    );
}

if (!isAuthenticated) {
    return null;
}

return <>{children}</>;
}
