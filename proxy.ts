import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy function for handling authentication and routing.
 * Next.js 16 uses 'proxy.ts' convention.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get('compliance_session')?.value;
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = 
    path === '/login' || 
    path.startsWith('/api/auth') || 
    path.includes('_next') || 
    path === '/favicon.ico';

  // 1. If no token and not a public path, restrict access
  if (!token && !isPublicPath) {
    if (path.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If already logged in and hitting login page, redirect to dashboard
  if (token && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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
