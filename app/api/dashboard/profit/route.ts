import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    // Tarik semua data transaksi beserta snapshot harga & modal per item barang
    const transactions = await prisma.transaction.findMany({
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { tanggal: 'desc' }
    });

    let totalOmset = 0;
    let totalModalHPP = 0;
    let totalProfitBersih = 0;

    // Mapping data untuk detail per nota di tabel
    const reportDetails = transactions.map((tx) => {
      let notaOmset = tx.ongkir; // Ongkir masuk ke komponen omset/nilai transaksi
      let notaModal = 0;

      tx.items.forEach((item) => {
        notaOmset += item.priceSnap * item.quantity;
        notaModal += item.modalSnap * item.quantity;
      });

      const notaProfit = notaOmset - notaModal;

      // Akumulasi total keseluruhan
      totalOmset += notaOmset;
      totalModalHPP += notaModal;
      totalProfitBersih += notaProfit;

      return {
        id: tx.id,
        nomorBon: tx.nomorBon,
        tanggal: tx.tanggal,
        customerNama: tx.customer?.nama || 'Tanpa Nama',
        isBonus: tx.isBonus,
        omset: notaOmset,
        modal: notaModal,
        profit: notaProfit,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalOmset,
        totalModalHPP,
        totalProfitBersih,
      },
      details: reportDetails
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}