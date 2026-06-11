import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, hargaModal, hargaBase, tipe } = body;

    if (!nama || hargaModal === undefined || hargaBase === undefined || !tipe) {
      return NextResponse.json(
        { success: false, message: 'Field nama, harga modal, harga base, dan tipe wajib diisi!' },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        nama: String(nama),
        hargaModal: parseFloat(hargaModal),
        hargaBase: parseFloat(hargaBase),
        tipe: String(tipe),
        isDeleted: false,
      },
    });

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// 3. DELETE: Soft-delete produk berdasarkan ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID produk wajib disertakan!' },
        { status: 400 }
      );
    }

    // Lakukan soft-delete dengan mengubah flag isDeleted menjadi true
    await prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus!' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}