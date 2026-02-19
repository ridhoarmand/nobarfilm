import { NextResponse } from 'next/server';import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 });
  }

  const url = request.nextUrl;
  const path = url.pathname;

  // Skip static files and API
  if (path.startsWith('/_next') || path.startsWith('/static') || path.startsWith('/api') || path.includes('.')) {
    return NextResponse.next();
  }

  // Root "/" -> Redirect to "/movie"
  if (path === '/') {
    return NextResponse.redirect(new URL('/movie', request.url));
  }

  // Allow accessing /login, /register, /akun from root, but rewrite to /auth/...
  if (['/login', '/register', '/akun'].some((p) => path.startsWith(p))) {
    return NextResponse.rewrite(new URL(`/auth${path}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
