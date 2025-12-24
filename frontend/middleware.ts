import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const host = request.headers.get('host') || '';

    // Only restrict /admin routes
    if (pathname.startsWith('/admin')) {

        // Allowed domains for Admin Panel
        const ALLOWED_ADMIN_HOSTS = [
            'moneo-production-358e.up.railway.app',
            'localhost:3000',
            '127.0.0.1:3000'
        ];

        // Check if the current host is allowed
        const isAllowed = ALLOWED_ADMIN_HOSTS.some(allowed => host.includes(allowed));

        if (!isAllowed) {
            // If accessed from a public domain (not allowed), redirect to home
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
