import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { getAuthUser } from '@/lib/auth-server';

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
        typeof username !== 'string' || username.length > 320
        || typeof password !== 'string' || password.length > 1024
    ) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase URL and anon key must be configured.');
        }

        const authCookies: { name: string; value: string; options: CookieOptions }[] = [];
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    authCookies.push(...cookiesToSet);
                },
            },
        });
        const { data, error } = await supabase.auth.signInWithPassword({
            email: username.trim(),
            password,
        });
        if (error || !data.user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const response = NextResponse.json({ user: getAuthUser(data.user) }, {
            headers: { 'Cache-Control': 'no-store' },
        });
        authCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        return response;
    } catch (error) {
        console.error('Supabase authentication login failed:', error);
        return NextResponse.json({ error: 'Authentication service is unavailable' }, { status: 503 });
    }
}
