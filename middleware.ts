import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Handle the case where the URL starts with atproto.at://
  // This will be rewritten by the browser to https://atproto.at//
  if (pathname.startsWith('//')) {
    // Remove the leading // and redirect to the viewer page
    const atUri = pathname.substring(2);
    url.pathname = '/viewer';
    url.searchParams.set('uri', atUri);
    return NextResponse.redirect(url);
  }
  
  // For backward compatibility, handle the old /view/ routes
  if (pathname.startsWith('/view/')) {
    const atUri = pathname.substring(6); // Remove '/view/'
    url.pathname = '/viewer';
    url.searchParams.set('uri', atUri);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)',
  ],
}; 