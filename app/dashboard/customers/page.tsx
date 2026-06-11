'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, AlertCircle, Settings, Trash2 } from 'lucide-react';

interface CustomerDiscount {
  id: string;
  type: string;  // "LM" atau "BR"
  steps: string; // JSON string array, e.g. "[20,10]"
}

interface Customer {
  id: string;
  nama: string;
  bonusThreshold: number;
  createdAt: string;
  discounts?: CustomerDiscount[]; // Sesuai skema: array relation
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State Modal Tambah Customer
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [bonusThreshold, setBonusThreshold] = useState('10000000');
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Modal Set Diskon Bertingkat
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lmInputs, setLmInputs] = useState<string[]>([]);
  const [brInputs, setBrInputs] = useState<string[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);

  // 1. Fetch data pelanggan
  useEffect(() => {
    let isMounted = true;
    async function getCustomers() {
      try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal mengambil data pelanggan.');
        if (isMounted) setCustomers(data.data || []);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    getCustomers();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  // 2. Handle Submit Customer Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, bonusThreshold: parseFloat(bonusThreshold) }),
      });
      if (!res.ok) throw new Error('Gagal menambahkan pelanggan.');
      setNama('');
      setBonusThreshold('10000000');
      setIsModalOpen(false);
      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 3. Buka Modal Pengaturan Diskon (Mencari data dari array relasi)
  const openDiscountModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    
    let initialLm: string[] = [];
    let initialBr: string[] = [];

    if (customer.discounts && customer.discounts.length > 0) {
      const lmData = customer.discounts.find((d) => d.type === 'LM');
      const brData = customer.discounts.find((d) => d.type === 'BR');

      if (lmData) {
        try { initialLm = JSON.parse(lmData.steps).map(String); } catch (e) { console.error(e); }
      }
      if (brData) {
        try { initialBr = JSON.parse(brData.steps).map(String); } catch (e) { console.error(e); }
      }
    }

    setLmInputs(initialLm);
    setBrInputs(initialBr);
    setIsDiscountModalOpen(true);
  };

  // 4. Handle Simpan Diskon Bertingkat
  const handleSaveDiscounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setDiscountLoading(true);
    setError('');

    const lmDiscounts = lmInputs.map((val) => parseFloat(val)).filter((val) => !isNaN(val) && val >= 0);
    const brDiscounts = brInputs.map((val) => parseFloat(val)).filter((val) => !isNaN(val) && val >= 0);

    try {
      const res = await fetch('/api/customers/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id, lmDiscounts, brDiscounts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan diskon.');
      setIsDiscountModalOpen(false);
      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setDiscountLoading(false);
    }
  };

  // Helper untuk mencari dan me-render tag diskon dari array berdasarkan tipe
  const getDiscountTagsByType = (discountsArr: CustomerDiscount[] | undefined, targetType: 'LM' | 'BR', typeColor: string) => {
    if (!discountsArr || discountsArr.length === 0) return <span className="text-slate-600 text-xs">-</span>;
    const target = discountsArr.find((d) => d.type === targetType);
    if (!target) return <span className="text-slate-600 text-xs">-</span>;

    try {
      const arr: number[] = JSON.parse(target.steps);
      if (arr.length === 0) return <span className="text-slate-600 text-xs">-</span>;
      return (
        <div className="flex gap-1 justify-end flex-wrap">
          {arr.map((disc, idx) => (
            <span key={idx} className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${typeColor}`}>
              {disc}%
            </span>
          ))}
        </div>
      );
    } catch {
      return <span className="text-slate-600 text-xs">-</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <span>Master Data Pelanggan</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Kelola data customer, batas omset bonus, dan skema diskon berantai toko HL.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors self-start sm:self-auto shadow-lg shadow-blue-600/10"
        >
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Memuat data pelanggan...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada data pelanggan di database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                  <th className="p-4">Nama Pelanggan</th>
                  <th className="p-4 text-right">Batas Bonus (Threshold)</th>
                  <th className="p-4 text-right">Diskon LM</th>
                  <th className="p-4 text-right">Diskon BR</th>
                  <th className="p-4 text-center">Atur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{customer.nama}</td>
                    <td className="p-4 text-right text-emerald-400 font-mono">
                      Rp {customer.bonusThreshold.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right">
                      {getDiscountTagsByType(customer.discounts, 'LM', 'bg-amber-500/10 text-amber-400 border border-amber-500/20')}
                    </td>
                    <td className="p-4 text-right">
                      {getDiscountTagsByType(customer.discounts, 'BR', 'bg-purple-500/10 text-purple-400 border border-purple-500/20')}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openDiscountModal(customer)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Atur Diskon"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: TAMBAH PELANGGAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Tambah Pelanggan Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-customer-name" className="text-xs font-semibold text-slate-300 block mb-1.5">Nama Pelanggan</label>
                <input
                  id="modal-customer-name"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Toko Maju Jaya"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="modal-bonus-threshold" className="text-xs font-semibold text-slate-300 block mb-1.5">Batas Akumulasi Bonus (IDR)</label>
                <input
                  id="modal-bonus-threshold"
                  type="number"
                  required
                  value={bonusThreshold}
                  onChange={(e) => setBonusThreshold(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white">Batal</button>
                <button type="submit" disabled={submitLoading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                  {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ATUR DISKON BERTINGKAT */}
      {isDiscountModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold text-white">Atur Diskon Bertingkat</h3>
              <p className="text-xs text-slate-400 mt-1">Customer: <span className="text-blue-400 font-semibold">{selectedCustomer.nama}</span></p>
            </div>

            <form onSubmit={handleSaveDiscounts} className="space-y-6">
              {/* SKEMA DISKON TYPE LM */}
              <div className="space-y-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-amber-400">Skema Diskon Produk LM</h4>
                  <button
                    type="button"
                    onClick={() => setLmInputs([...lmInputs, ''])}
                    className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                  >
                    + Tambah Tingkat
                  </button>
                </div>
                {lmInputs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada diskon khusus LM (Harga Jual Base).</p>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    {lmInputs.map((val, idx) => (
                      <div key={idx} className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden pl-2">
                        <span className="text-xs text-slate-500 font-mono">#{idx+1}</span>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="%"
                          value={val}
                          onChange={(e) => {
                            const copy = [...lmInputs];
                            copy[idx] = e.target.value;
                            setLmInputs(copy);
                          }}
                          className="w-16 bg-transparent px-2 py-1.5 text-sm text-white focus:outline-none text-right font-mono"
                        />
                        <span className="text-xs text-slate-400 pr-2">%</span>
                        <button
                          type="button"
                          onClick={() => setLmInputs(lmInputs.filter((_, i) => i !== idx))}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Hapus tingkat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SKEMA DISKON TYPE BR */}
              <div className="space-y-3 p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-purple-400">Skema Diskon Produk BR</h4>
                  <button
                    type="button"
                    onClick={() => setBrInputs([...brInputs, ''])}
                    className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                  >
                    + Tambah Tingkat
                  </button>
                </div>
                {brInputs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada diskon khusus BR (Harga Jual Base).</p>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    {brInputs.map((val, idx) => (
                      <div key={idx} className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden pl-2">
                        <span className="text-xs text-slate-500 font-mono">#{idx+1}</span>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="%"
                          value={val}
                          onChange={(e) => {
                            const copy = [...brInputs];
                            copy[idx] = e.target.value;
                            setBrInputs(copy);
                          }}
                          className="w-16 bg-transparent px-2 py-1.5 text-sm text-white focus:outline-none text-right font-mono"
                        />
                        <span className="text-xs text-slate-400 pr-2">%</span>
                        <button
                          type="button"
                          onClick={() => setBrInputs(brInputs.filter((_, i) => i !== idx))}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Hapus tingkat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white">Batal</button>
                <button type="submit" disabled={discountLoading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                  {discountLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Skema Diskon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}