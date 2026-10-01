import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'hr_pg2_session';

function isAuthenticatedSession(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { username?: string; exp?: number };
    return Boolean(parsed.username && parsed.exp && Date.now() < parsed.exp);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/logo')
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE)?.value;

  if (!isAuthenticatedSession(session)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
