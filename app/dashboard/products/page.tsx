'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Loader2, AlertCircle, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  nama: string;
  hargaModal: number;
  hargaBase: number;
  tipe: string;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State untuk Modal Tambah Produk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [hargaModal, setHargaModal] = useState('');
  const [hargaBase, setHargaBase] = useState('');
  const [tipe, setTipe] = useState('LM'); 
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null); // State loading buat hapus per barang

  // Trigger manual untuk me-refresh data produk setelah disubmit/dihapus
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Fetch data dari API Backend
  useEffect(() => {
    let isMounted = true;
    
    async function getProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal mengambil data produk.');
        
        if (isMounted) {
          setProducts(data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    getProducts();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // 2. Handle Submit Tambah Produk
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama,
          hargaModal: parseFloat(hargaModal),
          hargaBase: parseFloat(hargaBase),
          tipe,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menambahkan produk.');

      setNama('');
      setHargaModal('');
      setHargaBase('');
      setTipe('LM');
      setIsModalOpen(false);
      
      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data.';
      setError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 3. Handle Soft-Delete Produk
  const handleDelete = async (id: string, namaProduk: string) => {
    if (!confirm(`Apakah kamu yakin ingin menghapus produk "${namaProduk}"?`)) return;
    
    setDeleteId(id);
    setError('');

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus produk.');

      // Refresh data tabel
      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus data produk.';
      setError(msg);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            <span>Master Data Produk</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Kelola daftar barang, harga modal internal, dan tipe diskon produk.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors self-start sm:self-auto shadow-lg shadow-blue-600/10"
        >
          <Plus className="w-4 h-4" /> Tambah Produk
        </button>
      </div>

      {/* Global Error Banner */}
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
            <p className="text-sm font-medium">Memuat data produk dari database...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada data produk di database.</p>
            <p className="text-xs text-slate-600 mt-1">Klik tombol &quot;Tambah Produk&quot; di atas untuk mengisi data pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                  <th className="p-4">Nama Produk</th>
                  <th className="p-4">Tipe</th>
                  <th className="p-4 text-right">Harga Modal</th>
                  <th className="p-4 text-right">Harga Base (List Price)</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{product.nama}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        product.tipe === 'LM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {product.tipe}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-400 font-mono">
                      Rp {product.hargaModal.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-right text-blue-400 font-semibold font-mono">
                      Rp {product.hargaBase.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(product.id, product.nama)}
                        disabled={deleteId === product.id}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Hapus Produk"
                      >
                        {deleteId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Product Backdrop */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Tambah Produk Baru</h3>
              <p className="text-xs text-slate-400 mt-1">Pastikan klasifikasi tipe (&quot;LM&quot; / &quot;BR&quot;) sudah sesuai aturan bon bisnis.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="product-name" className="text-xs font-semibold text-slate-300 block mb-1.5">Nama Produk</label>
                <input
                  id="product-name"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Lampu Philips LED 12W"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-price" className="text-xs font-semibold text-slate-300 block mb-1.5">Harga Modal</label>
                  <input
                    id="modal-price"
                    type="number"
                    required
                    value={hargaModal}
                    onChange={(e) => setHargaModal(e.target.value)}
                    placeholder="Rp"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="base-price" className="text-xs font-semibold text-slate-300 block mb-1.5">Harga Base (Jual)</label>
                  <input
                    id="base-price"
                    type="number"
                    required
                    value={hargaBase}
                    onChange={(e) => setHargaBase(e.target.value)}
                    placeholder="Rp"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-type" className="text-xs font-semibold text-slate-300 block mb-1.5">Tipe Klasifikasi Produk</label>
                <select
                  id="product-type"
                  title="Pilih Klasifikasi Produk"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="LM">LM (Type LM)</option>
                  <option value="BR">BR (Type BR)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-800 bg-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
                >
                  {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitLoading ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}