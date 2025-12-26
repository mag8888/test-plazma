import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const text = formData.get('text') as string;
        const category = formData.get('category') as string;
        const recipientsJson = formData.get('recipients') as string;
        const photo = formData.get('photo') as File | null;

        if (!text || !category || !recipientsJson) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const recipients = JSON.parse(recipientsJson);

        // Prepare the request to backend
        const payload = {
            message: text,
            recipients,
            photoUrl: null // TODO: Upload photo if provided
        };

        // Call backend broadcast API
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const adminSecret = process.env.ADMIN_SECRET || '';

        const response = await fetch(`${backendUrl}/api/admin/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': adminSecret
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        return NextResponse.json(result);
    } catch (error) {
        console.error('Broadcast API error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
