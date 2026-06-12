import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, lmDiscounts, brDiscounts } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID wajib disertakan!' },
        { status: 400 }
      );
    }

    // Eksekusi dua perkawinan data (LM dan BR) menggunakan Prisma Transactions ($transaction)
    // agar kalau salah satu gagal, database otomatis rollback (aman total)
    await prisma.$transaction([
      // 1. Simpan/Update Diskon tipe LM
      prisma.customerDiscount.upsert({
        where: {
          customerId_type: {
            customerId: customerId,
            type: 'LM',
          },
        },
        update: {
          steps: JSON.stringify(lmDiscounts || []),
        },
        create: {
          customerId: customerId,
          type: 'LM',
          steps: JSON.stringify(lmDiscounts || []),
        },
      }),

      // 2. Simpan/Update Diskon tipe BR
      prisma.customerDiscount.upsert({
        where: {
          customerId_type: {
            customerId: customerId,
            type: 'BR',
          },
        },
        update: {
          steps: JSON.stringify(brDiscounts || []),
        },
        create: {
          customerId: customerId,
          type: 'BR',
          steps: JSON.stringify(brDiscounts || []),
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Skema diskon bertingkat berhasil disimpan!' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}