import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy function for handling authentication and routing.
 * Next.js 16 uses 'proxy.ts' convention.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get('compliance_session')?.value;
  const path = request.nextUrl.pathname;

  if (path.startsWith('/api/')) {
    console.log(`[Proxy] API Request: ${path} | Auth: ${!!token ? 'Token Found' : 'No Token'}`);
  }

  // Define public paths that don't require authentication
  const isPublicPath = 
    path === '/login' || 
    path.startsWith('/api/auth') || 
    path.includes('_next') || 
    path === '/favicon.ico' ||
    path === '/';

  // 1. If no token and not a public path, restrict access
  if (!token && !isPublicPath) {
    if (path.startsWith('/api/')) {
       console.log('Proxy: Unauthorized API access, returning 401');
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('from', path);
    console.log('Proxy: Redirecting to login from', path);
    return NextResponse.redirect(url);
  }

  // 2. If already logged in and hitting login page, redirect to dashboard
  // [DISABLED] to allow users with expired sessions to re-login
  /*
  if (token && path === '/login') {
    console.log('Proxy: Already logged in, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  */

  console.log('Proxy: Passing through to', path);
  return NextResponse.next();
}

// Configuration for matching paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
