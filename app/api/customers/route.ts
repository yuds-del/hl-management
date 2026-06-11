import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

// 1. GET: Ambil semua data pelanggan yang belum dihapus
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: { isDeleted: false },
      include: { discounts: true }, // Ikut sertakan data diskon bertingkatnya
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// 2. POST: Tambah pelanggan baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, bonusThreshold } = body;

    if (!nama) {
      return NextResponse.json(
        { success: false, message: 'Nama pelanggan wajib diisi!' },
        { status: 400 }
      );
    }

    // Buat data customer baru di SQLite
    const newCustomer = await prisma.customer.create({
      data: {
        nama: String(nama),
        bonusThreshold: bonusThreshold ? parseFloat(bonusThreshold) : 10000000, // Default 10jt sesuai AC-24
        isDeleted: false,
      },
    });

    return NextResponse.json({ success: true, data: newCustomer }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}