import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const user = getSessionUser(request.cookies.get('hr_pg2_session')?.value);
    if (pathname === '/login') {
      return user
        ? NextResponse.redirect(new URL('/', request.url))
        : NextResponse.next();
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

    return NextResponse.next();
  } catch (error) {
    console.error('Authentication proxy configuration error:', error);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication is not configured' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return new NextResponse('Authentication is not configured', { status: 503 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|logo.jpeg|api/auth/).*)'],
};
