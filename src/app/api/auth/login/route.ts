import { NextRequest, NextResponse } from 'next/server';
import {
    AUTH_SESSION_COOKIE,
    AUTH_SESSION_TTL_SECONDS,
    authenticateCredentials,
    createSessionToken,
} from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    if (request.headers.get('origin') !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid login request' }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null) {
        return NextResponse.json({ error: 'Invalid login request' }, { status: 400 });
    }

    const { username, password } = body as Record<string, unknown>;
    if (
        typeof username !== 'string' || username.length > 100
        || typeof password !== 'string' || password.length > 1024
    ) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
    }

    try {
        const user = await authenticateCredentials(username, password);
        if (!user) {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }

        const response = NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
        response.cookies.set(AUTH_SESSION_COOKIE, createSessionToken(user.username), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: AUTH_SESSION_TTL_SECONDS,
        });
        return response;
    } catch (error) {
        console.error('Authentication configuration or login failed:', error);
        return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 });
    }
}
