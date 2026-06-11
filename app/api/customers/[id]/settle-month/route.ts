import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Definisikan interface item & transaksi demi kepuasan TypeScript linting
interface TxItem {
  priceSnap: number;
  quantity: number;
}

interface PendingTx {
  isBonus: boolean;
  items: TxItem[];
}

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

    // Ambil data transaksi piutang
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        customerId,
        status: 'Piutang',
        tanggal: {
          gte: startDate.toISOString().split('T')[0],
          lte: endDate.toISOString().split('T')[0],
        },
      },
      include: {
        items: true,
      },
    }) as unknown as PendingTx[];

    if (pendingTransactions.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'Tidak ada transaksi piutang pada periode ini.' });
    }

    // Hitung akumulasi omset baru dari transaksi yang lunas (Bonus diabaikan sesuai AC)
    let totalNewPaidOmzet = 0;
    pendingTransactions.forEach((tx) => {
      if (!tx.isBonus) {
        tx.items.forEach((item) => {
          totalNewPaidOmzet += (item.priceSnap * item.quantity);
        });
      }
    });

    // Jalankan operasi atomik ACID transaction
    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: {
          customerId,
          status: 'Piutang',
          tanggal: {
            gte: startDate.toISOString().split('T')[0],
            lte: endDate.toISOString().split('T')[0],
          },
        },
        data: {
          status: 'Lunas',
          tanggalPelunasan: new Date(tanggalPelunasan),
        },
      }),
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
  }
}