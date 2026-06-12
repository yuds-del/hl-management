import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fungsi helper untuk menghitung harga setelah diskon bertingkat (Cascading)
function calculateCascadingPrice(basePrice: number, stepsJson: string | undefined): number {
  if (!stepsJson) return basePrice;
  try {
    const steps: number[] = JSON.parse(stepsJson);
    let finalPrice = basePrice;
    for (const step of steps) {
      finalPrice = finalPrice * (1 - step / 100);
    }
    return finalPrice;
  } catch {
    return basePrice;
  }
}

// 1. GET: Ambil semua riwayat nota/bon
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        customer: {
          include: { discounts: true }
        },
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// 2. POST: Membuat Nota / Transaksi Baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, tanggal, ongkir, deskripsi, isBonus, status, items } = body;

    // Validasi basic
    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data Customer dan Item produk wajib diisi!' },
        { status: 400 }
      );
    }

    // 1. Ambil data customer beserta aturan diskon bertingkatnya
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { discounts: true }
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer tidak ditemukan!' }, { status: 404 });
    }

    // 2. Generate Nomor Bon Otomatis (Format: HL-YYYYMMDD-MiliSecond)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomorBon = `HL-${todayStr}-${Date.now().toString().slice(-4)}`;

    // 3. Proses item dan hitung Snapshot Harga Jual + Modal memakai $transaction
    const result = await prisma.$transaction(async (tx) => {
      // Buat baris transaksi utama
      const transaction = await tx.transaction.create({
        data: {
          nomorBon,
          customerId,
          tanggal: tanggal ? new Date(tanggal) : new Date(),
          ongkir: parseFloat(ongkir || 0),
          deskripsi,
          isBonus: Boolean(isBonus),
          status: status || 'Piutang',
        }
      });

      // Loop untuk memasukkan baris item detail
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);

        // Cari diskon bertingkat customer sesuai tipe produk (LM / BR)
        const discountSettings = customer.discounts.find((d) => d.type === product.tipe);
        
        // Hitung harga snapshot (Jika transaksi di-set "isBonus", harga jual otomatis Rp 0 sesuai aturan omset)
        const priceSnap = Boolean(isBonus) 
          ? 0 
          : calculateCascadingPrice(product.hargaBase, discountSettings?.steps);

        // Buat baris TransactionItem
        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: product.id,
            quantity: parseInt(item.quantity),
            priceSnap: priceSnap,
            modalSnap: product.hargaModal // Mengunci harga modal internal saat ini
          }
        });
      }

      return transaction;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}