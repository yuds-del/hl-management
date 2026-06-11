import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; 

// Ambil secret key dari env atau default untuk lokal development
export const runtime = 'nodejs';
export const preferredRegion = ['sin1', 'hkg1']; 

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'hl-management-secret-super-key-2026');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username dan password wajib diisi!' }, { status: 400 });
    }

    // 2. Cek apakah sudah ada akun terdaftar di database (AC-1.2 Single User)
    let user = await prisma.user.findFirst();

    if (!user) {
      // 🚀 KUNCIAN UTAMA: Suntikkan id unik (UUID) agar Turso tidak meledak karena constraint PRIMARY KEY
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(), 
          username: String(username).toLowerCase(),
          password: await bcrypt.hash(String(password), 10),
        },
      });
    } else {
      // Jika akun sudah ada, lakukan verifikasi login
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (user.username !== username.toLowerCase() || !isPasswordValid) {
        return NextResponse.json({ success: false, message: 'Username atau password salah!' }, { status: 401 });
      }
    }

    // 3. Generate Token JWT kadaluarsa 1 hari
    const token = await new SignJWT({ userId: user.id, username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(JWT_SECRET);

    // 4. Set token ke cookies browser secara aman (httpOnly & secure)
    const response = NextResponse.json({ success: true, message: 'Autentikasi berhasil!' });
    response.cookies.set('hl_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 hari
      path: '/',
    });

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
  // BLOK finally { prisma.$disconnect() } DIHAPUS agar pool koneksi serverless tetap terjaga stabil!
}