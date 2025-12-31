import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Define allowed domains (including localhost for dev)
    // Production: admin.moneo.xyz, moneo.xyz
    // Dev: admin.localhost:3000, localhost:3000

    const isDev = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isAdminSubdomain = hostname.startsWith('admin.');

    // 1. Handle Admin Subdomain
    if (isAdminSubdomain) {
        // Rewrite all requests to /admin path
        // e.g. admin.moneo.xyz/users -> moneo.xyz/admin/users
        // But we need to be careful not to double-prefix if user visits admin.moneo.xyz/admin (which shouldn't happen usually)

        if (!url.pathname.startsWith('/admin')) {
            url.pathname = `/admin${url.pathname}`;
            return NextResponse.rewrite(url);
        }
        // If it already starts with /admin, just let it pass (or rewrite to self)
        return NextResponse.rewrite(url);
    }

    // 2. Handle Main Domain (Non-Admin)
    // Prevent access to /admin routes directly via main domain
    /*
    if (url.pathname.startsWith('/admin')) {
        // Redirect to home or 404
        return NextResponse.redirect(new URL('/', request.url));
    }
    */

    return NextResponse.next();
}

export const config = {
    // Match all paths to ensure we catch subdomain requests
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
