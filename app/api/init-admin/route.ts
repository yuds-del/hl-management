import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Inisialisasi resmi Prisma v7 menggunakan adapter / override url standar yang dibungkus aman
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export async function GET() {
  try {
    console.log('Membuat user admin HL via API...');
    
    // 1. Bersihkan data user lama jika ada
    await prisma.user.deleteMany();

    const defaultUsername = 'yuds@yuds.my.id';
    const defaultPassword = 'yudistira123'; 
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 2. Buat user admin langsung memanfaatkan runtime internal Next.js
    const user = await prisma.user.create({
      data: {
        username: defaultUsername,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Akun Admin HL Berhasil Dibuat!',
      credentials: {
        username: user.username,
        password: defaultPassword,
      },
      note: 'Mantap! Akun sudah masuk ke dev.db. Demi keamanan, kamu bisa hapus folder app/api/init-admin ini setelah berhasil.'
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurs';
    return NextResponse.json({
      success: false,
      error: errorMsg
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}