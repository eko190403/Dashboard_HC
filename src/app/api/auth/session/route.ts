import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, getSessionUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    try {
        const user = getSessionUser(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: { 'Cache-Control': 'no-store' } },
            );
        }
        return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Authentication configuration failed:', error);
        return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 });
    }
}
