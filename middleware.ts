import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || '');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value;

  if (pathname.startsWith('/admin')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (payload.type !== 'admin') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname.startsWith('/lote/')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const requestedId = pathname.split('/')[2];

      if (payload.type === 'admin') return NextResponse.next();

      if (String(payload.id) !== requestedId) {
        return NextResponse.redirect(new URL(`/lote/${payload.id}`, request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/lote/:path*'],
};
