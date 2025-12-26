import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        if (!category) {
            return NextResponse.json({ success: false, error: 'Category required' }, { status: 400 });
        }

        // Call backend to get recipients list
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const adminSecret = process.env.ADMIN_SECRET || '';

        const response = await fetch(`${backendUrl}/api/admin/broadcast/recipients?category=${category}`, {
            headers: {
                'x-admin-secret': adminSecret
            }
        });

        const result = await response.json();

        return NextResponse.json(result);
    } catch (error) {
        console.error('Recipients API error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
