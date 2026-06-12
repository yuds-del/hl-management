import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


export async function POST() {
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
  } 
}