import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and anon key must be configured.');
    }

    let response = NextResponse.next({ request });
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;

    if (pathname === '/login') {
      return response;
    }

    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  } catch (error) {
    console.error('Supabase authentication proxy failed:', error);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication service is unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return new NextResponse('Authentication service is unavailable', { status: 503 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|logo.jpeg|api/auth/).*)'],
};
