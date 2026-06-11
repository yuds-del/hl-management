'use client';

import React, { useState, useEffect } from 'react';
import { Package, Users, ArrowLeftRight, LayoutDashboard, Loader2, AlertCircle, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalTransactions: number;
  totalRevenue: number;
  totalPiutang: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function getStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal memuat statistik database.');
        if (isMounted) setStats(data.data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    getStats();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">mengkalkulasi rangkuman data bisnis...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm text-red-400 m-8">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>{error || 'Gagal memuat ringkasan eksekutif.'}</div>
      </div>
    );
  }

  return (
    <main className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Selamat datang kembali di panel administrasi utama HL.</p>
      </header>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL PRODUK */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400 truncate">Total Products</p>
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight font-mono">{stats.totalProducts}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Varian barang aktif terdaftar</span>
        </div>

        {/* TOTAL CUSTOMER */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400 truncate">Active Customers</p>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight font-mono">{stats.totalCustomers}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Mitra grosir & pelanggan aktif</span>
        </div>

        {/* TOTAL REVENUE */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400 truncate">Total Revenue (Omset)</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-400 font-mono">
            Rp {stats.totalRevenue.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Akumulasi seluruh nilai nota penjualan</span>
        </div>

        {/* TOTAL PIUTANG WALKING */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400 truncate">Total Outstanding (Piutang)</p>
            <ArrowLeftRight className="w-5 h-5 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-red-400 font-mono">
            Rp {stats.totalPiutang.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Nilai bon yang belum lunas (Beban Piutang)</span>
        </div>
      </div>

      {/* QUICK INFO ZONE */}
      <div className="mt-8 p-6 rounded-xl border border-blue-500/10 bg-blue-500/5 text-sm text-blue-400 flex items-center gap-3">
        <LayoutDashboard className="w-5 h-5 text-blue-500 shrink-0" />
        <div>
          Sistem mendeteksi ada <span className="font-bold text-white font-mono">{stats.totalTransactions}</span> lembar nota bon yang tercatat di dalam database SQLite lokal saat ini.
        </div>
      </div>
    </main>
  );
}