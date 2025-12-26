import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const text = formData.get('text') as string;
        const category = formData.get('category') as string;
        const photo = formData.get('photo') as File | null;

        if (!text || !category) {
            return NextResponse.json({ success: false, error: 'Missing text or category' }, { status: 400 });
        }

        // Prepare the request to backend
        const backendFormData = new FormData();
        backendFormData.append('text', text);
        backendFormData.append('category', category);
        if (photo) {
            backendFormData.append('photo', photo);
        }

        // Call backend broadcast API
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${backendUrl}/api/admin/broadcast`, {
            method: 'POST',
            body: backendFormData,
        });

        const result = await response.json();

        return NextResponse.json(result);
    } catch (error) {
        console.error('Broadcast API error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
