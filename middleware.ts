import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, AUTH_COOKIE_NAME } from './lib/auth';

// Public frontend pages
const PUBLIC_PAGES = ['/signin', '/signup', '/forgot-password', '/copy-otp'];

// Public API endpoints
const PUBLIC_APIS = ['/api/signin', '/api/signup', '/api/logout', '/api/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, internal Next.js routes, images, videos, and fonts
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/videos') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Extract Auth Token from Cookies or Authorization Bearer header
  const cookieToken =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get('agripulse_token')?.value;
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || headerToken;

  const userPayload = token ? await verifyAuthToken(token) : null;
  const isAuthenticated = Boolean(userPayload);

  // 3. API Route Protection (Backend)
  if (pathname.startsWith('/api')) {
    const isPublicApi = PUBLIC_APIS.some((api) => pathname.startsWith(api));
    if (isPublicApi) {
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      const res = NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Valid authentication token required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
      if (cookieToken) {
        res.cookies.delete(AUTH_COOKIE_NAME);
        res.cookies.delete('agripulse_token');
      }
      return res;
    }

    // Attach verified user info to request headers for downstream API handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(userPayload?.id || ''));
    requestHeaders.set('x-user-email', String(userPayload?.email || ''));
    requestHeaders.set('x-user-role', String(userPayload?.role || ''));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. Page Route Protection (Frontend)
  const isPublicPage = PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));

  if (!isAuthenticated && !isPublicPage) {
    // Unauthenticated or expired (>24h) user attempting to access protected route -> Clear cookies & redirect to /signin
    const loginUrl = new URL('/signin', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const res = NextResponse.redirect(loginUrl);
    if (cookieToken) {
      res.cookies.delete(AUTH_COOKIE_NAME);
      res.cookies.delete('agripulse_token');
    }
    return res;
  }

  if (isAuthenticated && isPublicPage) {
    // Authenticated user attempting to access login/signup -> Redirect to intended destination or dashboard
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const targetPath = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return NextResponse.next();
}

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

