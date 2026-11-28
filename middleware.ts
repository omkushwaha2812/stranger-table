import {NextResponse, type NextRequest} from 'next/server';
// Edge middleware cannot read the local database, so it only checks that a session
// cookie exists. Every protected page re-validates the session on the server (lib/auth.ts).
export function middleware(request: NextRequest) {
  if (!request.cookies.get('st_session')?.value) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.search = '';
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}
export const config = {matcher: ['/dashboard/:path*', '/admin/:path*', '/onboarding', '/reset-password']};
