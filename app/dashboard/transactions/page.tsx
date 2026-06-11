'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, Loader2, AlertCircle, Calendar, FileText, Printer, CheckCircle2, XCircle } from 'lucide-react';

interface Product {
  id: string;
  nama: string;
  hargaBase: number;
  tipe: string;
}

interface Customer {
  id: string;
  nama: string;
}

interface TransactionItem {
  id: string;
  quantity: number;
  priceSnap: number;
  product: Product;
}

interface Transaction {
  id: string;
  nomorBon: string;
  tanggal: string;
  ongkir: number;
  deskripsi: string | null;
  isBonus: boolean;
  status: string;
  customer: Customer;
  items: TransactionItem[];
}

interface InputItem {
  productId: string;
  quantity: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State Modal Buat Nota Baru
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [ongkir, setOngkir] = useState('0');
  const [deskripsi, setDeskripsi] = useState('');
  const [isBonus, setIsBonus] = useState(false);
  const [status, setStatus] = useState('Piutang');
  const [inputItems, setInputItems] = useState<InputItem[]>([{ productId: '', quantity: '1' }]);
  const [submitLoading, setSubmitLoading] = useState(false);

  // State status loading untuk per baris tabel saat update status
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // State khusus data transaksi yang sedang dicetak
  const [printData, setPrintData] = useState<Transaction | null>(null);

  // 1. Fetch data master secara paralel
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const [resTx, resCust, resProd] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/customers'),
          fetch('/api/products')
        ]);

        const [dataTx, dataCust, dataProd] = await Promise.all([
          resTx.json(),
          resCust.json(),
          resProd.json()
        ]);

        if (isMounted) {
          setTransactions(dataTx.data || []);
          setCustomers(dataCust.data || []);
          setProducts(dataProd.data || []);
        }
      } catch {
        if (isMounted) setError('Gagal memuat data administrasi transaksi.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  const addInputItem = () => setInputItems([...inputItems, { productId: '', quantity: '1' }]);
  const removeInputItem = (index: number) => setInputItems(inputItems.filter((_, i) => i !== index));

  // 2. Handle Submit Nota Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = inputItems.filter(item => item.productId && parseInt(item.quantity) >= 1);
    if (validItems.length === 0) {
      alert('Minimal harus mengisi 1 item produk dengan quantity yang valid!');
      return;
    }

    setSubmitLoading(true);
    setError('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          tanggal,
          ongkir: parseFloat(ongkir),
          deskripsi,
          isBonus,
          status,
          items: validItems
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan transaksi.');

      setSelectedCustomerId('');
      setTanggal(new Date().toISOString().split('T')[0]);
      setOngkir('0');
      setDeskripsi('');
      setIsBonus(false);
      setStatus('Piutang');
      setInputItems([{ productId: '', quantity: '1' }]);
      setIsModalOpen(false);

      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 3. Fungsi Baru: Toggle Ubah Status Transaksi (Piutang <-> Lunas)
  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Piutang' ? 'Lunas' : 'Piutang';
    setUpdatingId(id);
    setError('');

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal merubah status pembayaran.');

      // Refresh data tabel
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Trik Sakti Pemicu Print Dokumen Nota
  const handlePrint = (tx: Transaction) => {
    setPrintData(tx);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const calculateGrandTotal = (items: TransactionItem[], currentOngkir: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.priceSnap * item.quantity), 0);
    return subtotal + currentOngkir;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 print:p-0 print:bg-white print:text-black">
      
      {/* AREA UTAMA DASHBOARD */}
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ArrowLeftRight className="w-8 h-8 text-blue-500" />
              <span>Riwayat Transaksi / Bon</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Pencatatan nota penjualan, piutang pelanggan, dan kalkulasi diskon otomatis.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/10"
          >
            <Plus className="w-4 h-4" /> Buat Nota Baru
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3 text-sm text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Memuat riwayat bon dari database...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Belum ada riwayat transaksi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                    <th className="p-4">No. Bon / Tanggal</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Item Produk</th>
                    <th className="p-4 text-right">Total Nota</th>
                    <th className="p-4 text-center">Status (Klik untuk Ubah)</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors align-top">
                      <td className="p-4 font-mono">
                        <span className="text-slate-200 block font-semibold">{tx.nomorBon}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(tx.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-300">
                        {tx.customer?.nama}
                        {tx.isBonus && (
                          <span className="block mt-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded w-max">
                            NOTA BONUS
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 max-w-xs">
                          {tx.items.map((item) => (
                            <div key={item.id} className="text-xs text-slate-400 flex justify-between gap-4">
                              <span className="truncate text-slate-300">• {item.product?.nama}</span>
                              <span className="shrink-0 font-mono text-slate-500">
                                {item.quantity}x @ Rp {item.priceSnap.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right text-blue-400 font-bold font-mono">
                        Rp {calculateGrandTotal(tx.items, tx.ongkir).toLocaleString('id-ID')}
                      </td>
                      
                      {/* KOLOM STATUS PEMBAYARAN INTERAKTIF */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleStatus(tx.id, tx.status)}
                          disabled={updatingId === tx.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all border shadow-sm ${
                            updatingId === tx.id 
                              ? 'opacity-40 bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                              : tx.status === 'Lunas'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                          }`}
                          title="Klik untuk mengubah status pembayaran"
                        >
                          {updatingId === tx.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : tx.status === 'Lunas' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{tx.status}</span>
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handlePrint(tx)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL JALUR INPUT TRANSAKSI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>Form Buat Nota / Bon Baru</span>
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="select-cust" className="text-xs font-semibold text-slate-300 block mb-1.5">Pilih Customer</label>
                  <select id="select-cust" required value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none">
                    <option value="">-- Pilih Pelanggan --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="input-date" className="text-xs font-semibold text-slate-300 block mb-1.5">Tanggal Nota</label>
                  <input id="input-date" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none" />
                </div>
              </div>

              <div className="space-y-3 border-t border-b border-slate-800/80 py-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daftar Item Barang</h4>
                  <button type="button" onClick={addInputItem} className="text-xs px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">+ Tambah Item</button>
                </div>
                {inputItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <div className="flex-1">
                      <select aria-label="Pilih Produk" required value={item.productId} onChange={(e) => { const copy = [...inputItems]; copy[idx].productId = e.target.value; setInputItems(copy); }} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-white focus:outline-none">
                        <option value="">-- Pilih Produk --</option>
                        {products.map(p => <option key={p.id} value={p.id}>[{p.tipe}] {p.nama} - Rp {p.hargaBase.toLocaleString('id-ID')}</option>)}
                      </select>
                    </div>
                    <div className="w-24">
                      <input aria-label="Kuantitas" type="number" min="1" required value={item.quantity} onChange={(e) => { const copy = [...inputItems]; copy[idx].quantity = e.target.value; setInputItems(copy); }} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-white text-center font-mono focus:outline-none" />
                    </div>
                    {inputItems.length > 1 && <button type="button" onClick={() => removeInputItem(idx)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">✕</button>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="input-ongkir" className="text-xs font-semibold text-slate-300 block mb-1.5">Ongkos Kirim (Rp)</label>
                  <input id="input-ongkir" type="number" min="0" value={ongkir} onChange={(e) => setOngkir(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white font-mono focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="select-status" className="text-xs font-semibold text-slate-300 block mb-1.5">Status Pembayaran</label>
                  <select id="select-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none">
                    <option value="Piutang">Piutang</option>
                    <option value="Lunas">Lunas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Kategori Nota</label>
                  <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={isBonus} onChange={(e) => setIsBonus(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-950 border-slate-800" />
                    <span>Set Sebagai Nota Bonus</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="input-desc" className="text-xs font-semibold text-slate-300 block mb-1.5">Keterangan (Opsional)</label>
                <textarea id="input-desc" rows={2} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Catatan ekspedisi..." className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none resize-none" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white">Batal</button>
                <button type="submit" disabled={submitLoading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                  {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cetak & Simpan Bon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧾 TEMPLATE NOTA INVOICE FISIK SIAP PRINT */}
      {printData && (
        <div className="hidden print:block w-full text-black bg-white font-sans text-sm p-4 leading-relaxed">
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-black">TOKO HL (HONGLI)</h2>
              <p className="text-xs text-gray-600 font-medium">Distributor & Supplier Agen Grosir Utama</p>
              <p className="text-xs text-gray-500 mt-0.5">South Tangerang, Banten, Indonesia</p>
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider">NOTA PENJUALAN</h3>
              <p className="font-mono text-xs font-bold text-gray-800 mt-1">{printData.nomorBon}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-gray-50 p-3 rounded border border-gray-200">
            <div>
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Kepada Yth. Mitra:</p>
              <p className="text-sm font-bold text-black mt-0.5">{printData.customer?.nama}</p>
              <p className="text-gray-500 mt-1 font-medium">Status Bon: <span className="font-bold text-black font-mono">{printData.status}</span></p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Tanggal Cetak Nota:</p>
              <p className="text-sm font-bold text-black mt-0.5">
                {new Date(printData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {printData.isBonus && (
                <span className="inline-block mt-1 text-[10px] font-black tracking-widest bg-black text-white px-2 py-0.5 rounded">
                  * DANA AKUMULASI BONUS *
                </span>
              )}
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                <th className="p-2 border-r border-gray-300 w-8 text-center">No</th>
                <th className="p-2 border-r border-gray-300">Nama Barang / Deskripsi Varian</th>
                <th className="p-2 border-r border-gray-300 w-16 text-center">Qty</th>
                <th className="p-2 border-r border-gray-300 text-right w-28">Harga Net (Setelah Diskon)</th>
                <th className="p-2 text-right w-32">Total Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {printData.items.map((item, index) => (
                <tr key={item.id} className="align-middle">
                  <td className="p-2 border-r border-gray-300 text-center">{index + 1}</td>
                  <td className="p-2 border-r border-gray-300 font-sans font-medium">[{item.product?.tipe}] {item.product?.nama}</td>
                  <td className="p-2 border-r border-gray-300 text-center">{item.quantity}</td>
                  <td className="p-2 border-r border-gray-300 text-right">Rp {item.priceSnap.toLocaleString('id-ID')}</td>
                  <td className="p-2 text-right font-bold">Rp {(item.priceSnap * item.quantity).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-start gap-8 font-mono text-xs">
            <div className="flex-1 font-sans text-gray-500 italic max-w-sm">
              {printData.deskripsi ? (
                <p className="bg-gray-50 p-2 rounded border border-gray-200 text-[11px] text-gray-700 not-italic">
                  <span className="font-bold block text-[10px] uppercase text-gray-400 tracking-wider">Catatan Nota:</span>
                  {printData.deskripsi}
                </p>
              ) : (
                <p className="text-[11px]">* Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan tanpa perjanjian awal.</p>
              )}
            </div>

            <div className="w-64 space-y-1.5 text-right border-t border-gray-200 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal Barang:</span>
                <span>Rp {printData.items.reduce((acc, item) => acc + (item.priceSnap * item.quantity), 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Ongkos Kirim (Exp):</span>
                <span>Rp {printData.ongkir.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-dashed border-gray-400 pt-1.5 text-black">
                <span>TOTAL NOTA BIASA:</span>
                <span>Rp {calculateGrandTotal(printData.items, printData.ongkir).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-12 text-center text-xs text-gray-700 font-sans">
            <div>
              <p>Hormat Kami,</p>
              <div className="h-16"></div>
              <p className="font-bold border-b border-gray-400 w-32 mx-auto text-black">( Administrasi )</p>
            </div>
            <div>
              <p>Tanda Terima Sopir / Pelanggan,</p>
              <div className="h-16"></div>
              <p className="font-bold border-b border-gray-400 w-32 mx-auto text-black">( ________________ )</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}