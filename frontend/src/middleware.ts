import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = ['/dashboard', '/users', '/roles', '/brands', '/menu-items', '/permissions', '/admin', '/master'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  // Get token from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  
  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // If accessing root path
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // If user is not authenticated and trying to access protected route
  if (!accessToken && isProtectedRoute) {
    // Store the intended destination (full path with query params) for redirect after login
    const loginUrl = new URL('/login', request.url);
    const intendedUrl = pathname + search;
    loginUrl.searchParams.set('redirectTo', intendedUrl);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated and trying to access login page (not other public routes)
  if (accessToken && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
