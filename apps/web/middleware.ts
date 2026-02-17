import { updateSession } from './lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/collect (public ingest endpoint)
     * - report (public shared reports)
     * - embed (embeddable widgets)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, t.js
     */
    '/((?!api/collect|report|embed|_next/static|_next/image|favicon.ico|t.js).*)',
  ],
};
