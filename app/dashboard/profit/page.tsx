'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, AlertCircle, Printer, BarChart3, TrendingUp, Layers } from 'lucide-react';

interface Product {
  hargaModal: number;
  tipe: string;
}

interface TransactionItem {
  id: string;
  quantity: number;
  priceSnap: number;
  product: Product;
}

interface Customer {
  nama: string;
}

interface Transaction {
  id: string;
  nomorBon: string;
  tanggal: string;
  ongkir: number;
  status: string;
  isBonus: boolean;
  customer: Customer;
  items: TransactionItem[];
}

export default function ProfitReportPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  useEffect(() => {
    async function fetchReportData() {
      try {
        const res = await fetch('/api/transactions');
        const data = await res.json();
        setTransactions(data.data || []);
      } catch {
        setError('Gagal memuat rekap akuntansi keuangan.');
      } finally {
        setLoading(false);
      }
    }
    fetchReportData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Menghitung buku keuntungan riil...</div>;
  if (error) return <div className="p-8 text-red-400 flex gap-2"><AlertCircle /> {error}</div>;

  const monthlyRecap: { [key: number]: { label: string; omzetLM: number; omzetBR: number; labaLM: number; labaBR: number; totalOngkir: number; totalPiutang: number } } = {};
  
  for (let m = 0; m < 12; m++) {
    const label = new Date(parseInt(selectedYear), m, 1).toLocaleDateString('id-ID', { month: 'long' });
    monthlyRecap[m] = { label, omzetLM: 0, omzetBR: 0, labaLM: 0, labaBR: 0, totalOngkir: 0, totalPiutang: 0 };
  }

  transactions.forEach(tx => {
    const d = new Date(tx.tanggal);
    if (d.getFullYear().toString() !== selectedYear) return;
    const month = d.getMonth();

    if (tx.status === 'Piutang') {
      let bonOmzet = 0;
      if (!tx.isBonus) {
        tx.items.forEach(i => bonOmzet += (i.priceSnap * i.quantity));
      }
      monthlyRecap[month].totalPiutang += (bonOmzet + tx.ongkir);
    } else if (tx.status === 'Lunas') {
      monthlyRecap[month].totalOngkir += tx.ongkir;
      
      if (!tx.isBonus) {
        tx.items.forEach(item => {
          const itemOmzet = item.priceSnap * item.quantity;
          const itemLaba = (item.priceSnap - item.product.hargaModal) * item.quantity;

          if (item.product.tipe === 'LM') {
            monthlyRecap[month].omzetLM += itemOmzet;
            monthlyRecap[month].labaLM += itemLaba;
          } else {
            monthlyRecap[month].omzetBR += itemOmzet;
            monthlyRecap[month].labaBR += itemLaba;
          }
        });
      }
    }
  });

  const grandTotals = Object.values(monthlyRecap).reduce((acc, curr) => {
    acc.omzetLM += curr.omzetLM;
    acc.omzetBR += curr.omzetBR;
    acc.labaLM += curr.labaLM;
    acc.labaBR += curr.labaBR;
    acc.piutang += curr.totalPiutang;
    acc.ongkir += curr.totalOngkir;
    return acc;
  }, { omzetLM: 0, omzetBR: 0, labaLM: 0, labaBR: 0, piutang: 0, ongkir: 0 });

  return (
    <div className="p-8 min-h-screen bg-slate-950 text-white print:p-0 print:bg-white print:text-black">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-500" />
            <span>Laporan Akuntansi Keuntungan</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Pemisahan performa profit barang LM vs BR berbasis pencatatan tunai kontan (Cash Basis).</p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            aria-label="Pilih Tahun Laporan"
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="2026">Tahun Buku 2026</option>
            <option value="2025">Tahun Buku 2025</option>
          </select>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
            <Printer className="w-4 h-4" /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <h2 className="text-xl font-black uppercase">LAPORAN KINERJA OMSET & LABA KESELURUHAN (ALL CUSTOMERS)</h2>
        <p className="text-sm font-bold">Tahun Buku / Periode Laporan: {selectedYear}</p>
        <p className="text-xs text-gray-500">Kriteria Basis Akuntansi: Kas Masuk Tunai (Cash-Basis) | Nota Bonus Dieksklusi.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 print:grid-cols-3 print:text-black print:mb-6 font-mono text-xs">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl print:border-black print:bg-white">
          <span className="text-[10px] text-slate-500 font-sans uppercase font-bold flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Total Omzet Bersih Kontan</span>
          <span className="text-base font-bold text-slate-200 mt-1 block print:text-black">Rp {(grandTotals.omzetLM + grandTotals.omzetBR).toLocaleString('id-ID')}</span>
          <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400 font-sans print:border-gray-300 print:text-black">
            <span>LM: Rp {grandTotals.omzetLM.toLocaleString('id-ID')}</span>
            <span>BR: Rp {grandTotals.omzetBR.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl print:border-black print:bg-white">
          <span className="text-[10px] text-emerald-500/70 font-sans uppercase font-bold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> TOTAL CUAN BERSIH HL (LABA ALL)</span>
          <span className="text-base font-bold text-emerald-400 mt-1 block print:text-black">Rp {(grandTotals.labaLM + grandTotals.labaBR).toLocaleString('id-ID')}</span>
          <div className="mt-2 pt-2 border-t border-emerald-500/10 flex justify-between text-[11px] text-emerald-500/60 font-sans print:border-gray-300 print:text-black">
            <span>LM: Rp {grandTotals.labaLM.toLocaleString('id-ID')}</span>
            <span>BR: Rp {grandTotals.labaBR.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl print:border-black print:bg-white">
          <span className="text-[10px] text-red-400 font-sans uppercase font-bold flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-red-400" /> Total Aset Piutang Menggantung</span>
          <span className="text-base font-bold text-red-400 mt-1 block print:text-black">Rp {grandTotals.piutang.toLocaleString('id-ID')}</span>
          <span className="text-[10px] text-slate-500 block font-sans mt-2 italic">*Belum diakui sebagai pendapatan kas toko.</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-sm print:border-black print:bg-white print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800 text-center print:bg-gray-100 print:border-black print:text-black">
                <th className="p-3 text-left w-28 border-r border-slate-800/60 print:border-black" rowSpan={2}>Periode Bulan</th>
                <th className="p-2 border-b border-r border-slate-800/60 print:border-black" colSpan={2}>OMZET MASUK (LUNAS)</th>
                <th className="p-2 border-b border-r border-slate-800/60 print:border-black" colSpan={2}>LABA BERSIH TOKO HL</th>
                <th className="p-3 w-28 border-r border-slate-800/60 print:border-black" rowSpan={2}>Total Ongkir (Pass)</th>
                <th className="p-3 w-32 text-red-400 print:text-black" rowSpan={2}>Outstanding Piutang</th>
              </tr>
              <tr className="bg-slate-900/40 text-slate-500 text-[10px] border-b border-slate-800 font-mono text-center print:bg-gray-50 print:border-black print:text-black">
                <th className="p-2 border-r border-slate-800/40 print:border-black">Tipe LM</th>
                <th className="p-2 border-r border-slate-800/60 print:border-black">Tipe BR</th>
                <th className="p-2 border-r border-slate-800/40 print:border-black">Tipe LM</th>
                <th className="p-2 border-r border-slate-800/60 print:border-black">Tipe BR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-right print:divide-gray-300">
              {Object.entries(monthlyRecap).map(([monthIdx, item]) => (
                <tr key={monthIdx} className="hover:bg-slate-800/20 transition-colors align-middle">
                  <td className="p-3 text-left font-sans font-semibold text-slate-300 border-r border-slate-800/60 print:border-black print:text-black">
                    {item.label}
                  </td>
                  <td className="p-2 border-r border-slate-800/40 text-slate-300 print:border-black print:text-black">
                    {item.omzetLM > 0 ? `Rp ${item.omzetLM.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-2 border-r border-slate-800/60 text-slate-300 print:border-black print:text-black">
                    {item.omzetBR > 0 ? `Rp ${item.omzetBR.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-2 border-r border-slate-800/40 text-emerald-400 print:border-black print:text-black">
                    {item.labaLM > 0 ? `Rp ${item.labaLM.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-2 border-r border-slate-800/60 text-emerald-400 font-bold print:border-black print:text-black">
                    {item.labaBR > 0 ? `Rp ${item.labaBR.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-2 text-slate-400 border-r border-slate-800/60 print:border-black print:text-black">
                    {item.totalOngkir > 0 ? `Rp ${item.totalOngkir.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-2 text-red-400 print:text-black font-bold">
                    {item.totalPiutang > 0 ? `Rp ${item.totalPiutang.toLocaleString('id-ID')}` : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-900 font-bold border-t border-slate-700 text-slate-100 text-right print:bg-gray-100 print:border-black print:text-black">
                <td className="p-3 text-left font-sans border-r border-slate-800 print:border-black">GRAND TOTAL</td>
                <td className="p-2 border-r border-slate-800/40 print:border-black">Rp {grandTotals.omzetLM.toLocaleString('id-ID')}</td>
                <td className="p-2 border-r border-slate-800/60 print:border-black">Rp {grandTotals.omzetBR.toLocaleString('id-ID')}</td>
                <td className="p-2 border-r border-slate-800/40 text-emerald-400 print:border-black">Rp {grandTotals.labaLM.toLocaleString('id-ID')}</td>
                <td className="p-2 border-r border-slate-800/60 text-emerald-400 print:border-black">Rp {grandTotals.labaBR.toLocaleString('id-ID')}</td>
                <td className="p-2 border-r border-slate-800 print:border-black">Rp {grandTotals.ongkir.toLocaleString('id-ID')}</td>
                <td className="p-2 text-red-400 print:text-black">Rp {grandTotals.piutang.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}