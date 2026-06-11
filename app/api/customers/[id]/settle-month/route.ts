import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const { year, month, tanggalPelunasan } = await request.json();

    if (!year || month === undefined || !tanggalPelunasan) {
      return NextResponse.json({ success: false, message: 'Data filter bulan dan tanggal pelunasan wajib diisi!' }, { status: 400 });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Menggunakan string format YYYY-MM-DD untuk query jika kolom 'tanggal' di DB adalah string
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // 1. Ambil dulu data semua transaksi 'Piutang' bulan ini sebelum di-update, lengkap dengan item-nya buat hitung akumulasi omset
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        customerId,
        status: 'Piutang',
        tanggal: {
          gte: startStr,
          lte: endStr,
        },
      },
      include: {
        items: true,
      },
    });

    if (pendingTransactions.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'Tidak ada transaksi piutang pada periode ini.' });
    }

    // 2. Hitung total omset bersih (Nota Bonus diabaikan sesuai AC-5.7) yang siap dimasukkan ke tabungan bonus customer
    let totalNewPaidOmzet = 0;
    pendingTransactions.forEach(tx => {
      if (!tx.isBonus) {
        tx.items.forEach(item => {
          totalNewPaidOmzet += (item.priceSnap * item.quantity);
        });
      }
    });

    // 3. Jalankan transaksi database tunggal (Prisma Transaction) agar perubahan status dan penambahan tabungan bonus berjalan serentak (Atomis)
    await prisma.$transaction([
      // A. Update semua status transaksi menjadi Lunas
      prisma.transaction.updateMany({
        where: {
          customerId,
          status: 'Piutang',
          tanggal: {
            gte: startStr,
            lte: endStr,
          },
        },
        data: {
          status: 'Lunas',
          tanggalPelunasan: new Date(tanggalPelunasan), // AC-6.5: Set tanggal pelunasan
        },
      }),
      // B. Update tabungan akumulasi omset bonus si Customer (AC-6.7 & AC-5.2)
      // Catatan: Sesuaikan nama field 'accumulatedOmzet' dengan nama field asli di skema prisma customer lu (misal: accumulatedOmzet, totalOmzet, atau sejenisnya)
      prisma.customer.update({
        where: { id: customerId },
        data: {
          accumulatedOmzet: {
            increment: totalNewPaidOmzet,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true, count: pendingTransactions.length });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}