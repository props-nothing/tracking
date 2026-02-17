import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Only protect dashboard routes — check for Supabase auth cookie
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Supabase stores the session in cookies prefixed with sb-<ref>-auth-token
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.includes('-auth-token'));

    if (!hasAuthCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Only match dashboard routes — no need to run middleware on public pages
     */
    '/dashboard/:path*',
  ],
};
