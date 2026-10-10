import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    if (request.headers.get('origin') !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase URL and anon key must be configured.');
        }

        const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        });
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
        return response;
    } catch (error) {
        console.error('Supabase authentication logout failed:', error);
        return NextResponse.json({ error: 'Failed to end session' }, { status: 503 });
    }
}
