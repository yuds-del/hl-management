import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'hl-management-secret-super-key-2026');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('hl_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Jika mencoba akses halaman dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      // Tidak ada token? Tendang ke halaman login
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      // Verifikasi token JWT apakah sah atau sudah dimanipulasi
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Token palsu atau expired? Bersihkan cookie lalu tendang ke login
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('hl_token');
      return response;
    }
  }

  // 2. Jika user yang sudah login mencoba balik ke halaman utama/login polosan, alihkan langsung ke dashboard
  if (pathname === '/' && token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch {
      // Token invalid, biarkan akses halaman login polosan
    }
  }

  return NextResponse.next();
}

// Konfigurasi pencocokan rute yang diproteksi oleh middleware
export const config = {
  matcher: ['/', '/dashboard/:path*'],
};