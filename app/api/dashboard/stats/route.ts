import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Hitung total produk & customer yang aktif (belum didelete)
    const totalProducts = await prisma.product.count({ where: { isDeleted: false } });
    const totalCustomers = await prisma.customer.count({ where: { isDeleted: false } });

    // 2. Ambil semua transaksi beserta item-nya untuk menghitung revenue
    const transactions = await prisma.transaction.findMany({
      include: { items: true },
    });

    const totalTransactions = transactions.length;

    // 3. Kalkulasi Total Revenue (Harga Jual Jual * Qty + Ongkir)
    let totalRevenue = 0;
    let totalPiutang = 0;

    for (const tx of transactions) {
      const subtotalItem = tx.items.reduce((acc, item) => acc + (item.priceSnap * item.quantity), 0);
      const grandTotal = subtotalItem + tx.ongkir;

      totalRevenue += grandTotal;

      if (tx.status === 'Piutang') {
        totalPiutang += grandTotal;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        totalTransactions,
        totalRevenue,
        totalPiutang,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}