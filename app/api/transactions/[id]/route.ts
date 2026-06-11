import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Gunakan tipe Promise sesuai standar Next.js terbaru
) {
  try {
    // 1. Wajib di-await dulu params-nya biar ID dari URL gak kedeteksi undefined!
    const { id } = await params;
    
    const body = await request.json();
    const { status } = body;

    if (!status || (status !== 'Lunas' && status !== 'Piutang')) {
      return NextResponse.json(
        { success: false, message: 'Status harus berupa "Lunas" atau "Piutang"!' },
        { status: 400 }
      );
    }

    // 2. Jalankan update dengan ID yang sudah valid murni string
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: updatedTransaction });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}