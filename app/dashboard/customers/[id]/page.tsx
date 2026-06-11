'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, ArrowLeft, Calendar, Printer, CheckCircle, Loader2, AlertCircle, TrendingUp } from 'lucide-react';

interface Product {
  nama: string;
  tipe: string;
  hargaModal: number;
}

interface TransactionItem {
  id: string;
  quantity: number;
  priceSnap: number;
  product: Product;
}

interface Customer {
  id: string;
  nama: string;
}

interface Transaction {
  id: string;
  nomorBon: string;
  tanggal: string;
  ongkir: number;
  status: string;
  isBonus: boolean;
  customer?: Customer;
  items: TransactionItem[];
}

interface CustomerData {
  id: string;
  nama: string;
  transactions: Transaction[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedMonthGroup, setSelectedMonthGroup] = useState<{ year: number; month: number; label: string } | null>(null);
  const [tanggalPelunasan, setTanggalPelunasan] = useState(new Date().toISOString().split('T')[0]);
  const [settleLoading, setSettleLoading] = useState(false);

  useEffect(() => {
    async function fetchCustomerDetail() {
      try {
        const [resCust, resTx] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/transactions')
        ]);
        const [dataCust, dataTx] = await Promise.all([resCust.json(), resTx.json()]);

        const allCustomers = (dataCust.data || []) as Customer[];
        const allTransactions = (dataTx.data || []) as Transaction[];

        const currentCust = allCustomers.find((c) => c.id === params.id);
        const custTx = allTransactions.filter((t) => t.customer?.id === params.id);

        if (currentCust) {
          setCustomer({
            id: currentCust.id,
            nama: currentCust.nama,
            transactions: custTx
          });
        } else {
          setError('Data customer tidak ditemukan.');
        }
      } catch {
        setError('Gagal memuat detail laporan keuangan customer.');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomerDetail();
  }, [params.id, settleLoading]);

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Memuat akun mitra...</div>;
  if (error || !customer) return <div className="p-8 text-red-400 flex gap-2"><AlertCircle /> {error || 'Terjadi kesalahan.'}</div>;

  const getBonMetrics = (tx: Transaction) => {
    let omzetLM = 0;
    let omzetBR = 0;
    let laba = 0;

    if (!tx.isBonus) {
      tx.items.forEach(item => {
        const itemOmzet = item.priceSnap * item.quantity;
        const itemLaba = (item.priceSnap - item.product.hargaModal) * item.quantity;
        if (item.product.tipe === 'LM') omzetLM += itemOmzet;
        else omzetBR += itemOmzet;
        laba += itemLaba;
      });
    }

    const totalOwed = omzetLM + omzetBR + tx.ongkir;

    return { omzetLM, omzetBR, totalOwed, laba };
  };

  const monthlyGroups: { [key: string]: { label: string; year: number; month: number; txs: Transaction[] } } = {};
  
  customer.transactions.forEach(tx => {
    const d = new Date(tx.tanggal);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    if (!monthlyGroups[key]) {
      monthlyGroups[key] = { label, year, month, txs: [] };
    }
    monthlyGroups[key].txs.push(tx);
  });

  const handleSettleMonth = async () => {
    if (!selectedMonthGroup) return;
    setSettleLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/settle-month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedMonthGroup.year,
          month: selectedMonthGroup.month,
          tanggalPelunasan
        })
      });
      if (!res.ok) throw new Error('Gagal memproses pelunasan massal.');
      alert(`Berhasil melunasi seluruh bon pada bulan ${selectedMonthGroup.label}!`);
      setIsSettleModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setSettleLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-slate-950 text-white print:p-0 print:bg-white print:text-black">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div className="space-y-1">
          <button onClick={() => router.push('/dashboard/customers')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Customer
          </button>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <span>Mitra: {customer.nama}</span>
          </h1>
          <p className="text-sm text-slate-400">Rangkuman buku besar piutang, pelunasan bulanan otomatis, dan saringan omset LM/BR.</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors">
          <Printer className="w-4 h-4" /> Cetak Buku Besar (PDF)
        </button>
      </div>

      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <h2 className="text-xl font-black uppercase">REKAP BUKU BESAR PIUTANG MITRA</h2>
        <p className="text-sm font-bold">Nama Toko / Mitra: {customer.nama}</p>
        <p className="text-xs text-gray-500">Dicetak pada tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {Object.keys(monthlyGroups).length === 0 ? (
        <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl">Belum ada riwayat transaksi akun ini.</div>
      ) : (
        <div className="space-y-10">
          {Object.values(monthlyGroups).map(group => {
            let totalPiutangBulan = 0;
            let totalSudahBayarBulan = 0;
            let totalOmzetLM = 0;
            let totalOmzetBR = 0;
            let totalLabaBulan = 0;

            group.txs.forEach(tx => {
              const { omzetLM, omzetBR, totalOwed, laba } = getBonMetrics(tx);
              
              if (tx.status === 'Piutang') {
                totalPiutangBulan += totalOwed;
              } else {
                totalSudahBayarBulan += totalOwed;
                totalOmzetLM += omzetLM;
                totalOmzetBR += omzetBR;
                totalLabaBulan += laba;
              }
            });

            return (
              <div key={group.label} className="border border-slate-800 bg-slate-900/30 rounded-xl overflow-hidden print:border-black print:bg-white print:shadow-none shadow-sm">
                <div className="bg-slate-900/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 print:bg-gray-100 print:border-black">
                  <div className="flex items-center gap-2 text-blue-400 font-bold print:text-black">
                    <Calendar className="w-4 h-4" />
                    <span>Periode {group.label}</span>
                  </div>
                  
                  {totalPiutangBulan > 0 ? (
                    <button
                      onClick={() => {
                        setSelectedMonthGroup({ year: group.year, month: group.month, label: group.label });
                        setIsSettleModalOpen(true);
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors print:hidden flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Settle 1 Bulan Lunas
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 print:border-black print:text-black">✓ Bulan Ini Clear (Lunas)</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 border-b border-slate-800/50 bg-slate-950/40 font-mono text-xs print:grid-cols-4 print:border-black print:text-black print:bg-white">
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg print:border-black">
                    <span className="text-[10px] text-slate-400 block font-sans uppercase">Total Piutang (Belum Bayar)</span>
                    <span className="text-sm font-bold text-red-400 print:text-black">Rp {totalPiutangBulan.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg print:border-black">
                    <span className="text-[10px] text-slate-400 block font-sans uppercase">Total Sudah Dibayar</span>
                    <span className="text-sm font-bold text-emerald-400 print:text-black">Rp {totalSudahBayarBulan.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg print:border-black">
                    <span className="text-[10px] text-slate-400 block font-sans uppercase">Omzet Masuk (LM)</span>
                    <span className="text-sm font-bold text-slate-200 print:text-black">Rp {totalOmzetLM.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg print:border-black">
                    <span className="text-[10px] text-slate-400 block font-sans uppercase">Omzet Masuk (BR)</span>
                    <span className="text-sm font-bold text-slate-200 print:text-black">Rp {totalOmzetBR.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg md:col-span-1 col-span-2 print:hidden">
                    <span className="text-[10px] text-slate-400 block font-sans uppercase">Cuan Riil HL (Laba)</span>
                    <span className="text-sm font-bold text-blue-400">Rp {totalLabaBulan.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 text-slate-400 font-medium border-b border-slate-800 print:bg-gray-50 print:border-black print:text-black">
                        <th className="p-3">Tanggal / No. Bon</th>
                        <th className="p-3">Item Deskripsi Barang</th>
                        <th className="p-3 text-right">Ongkir</th>
                        <th className="p-3 text-right">Total Tagihan (Owed)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono print:divide-gray-300">
                      {group.txs.map(tx => {
                        const metrics = getBonMetrics(tx);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/10 align-top">
                            <td className="p-3">
                              <span className="text-slate-200 block font-semibold print:text-black">{tx.nomorBon}</span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{new Date(tx.tanggal).toLocaleDateString('id-ID')}</span>
                              {tx.isBonus && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 rounded block w-max mt-1 font-bold">BONUS</span>}
                            </td>
                            <td className="p-3 font-sans text-slate-400 max-w-xs space-y-0.5 print:text-black">
                              {tx.items.map(i => (
                                <div key={i.id} className="text-[11px] flex justify-between">
                                  <span>• [{i.product.tipe}] {i.product.nama} ({i.quantity}x)</span>
                                </div>
                              ))}
                            </td>
                            <td className="p-3 text-right text-slate-400 print:text-black">Rp {tx.ongkir.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right text-blue-400 font-bold print:text-black">Rp {metrics.totalOwed.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.status === 'Lunas' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSettleModalOpen && selectedMonthGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-emerald-500 w-5 h-5" />
              <span>Konfirmasi Pelunasan Massal</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anda akan merubah seluruh status transaksi <span className="font-bold text-white">Piutang → Lunas</span> pada periode <span className="text-blue-400 font-bold">{selectedMonthGroup.label}</span> untuk customer ini.
            </p>
            <div>
              <label htmlFor="input-settle-date" className="text-xs font-semibold text-slate-300 block mb-1.5">Tanggal Pelunasan Kontan</label>
              <input id="input-settle-date" type="date" required value={tanggalPelunasan} onChange={(e) => setTanggalPelunasan(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsSettleModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Batal</button>
              <button type="button" onClick={handleSettleMonth} disabled={settleLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {settleLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Eksekusi Lunas Massal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}