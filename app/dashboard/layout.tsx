'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Package,
    Users,
    ArrowLeftRight,
    DollarSign,
    LogOut,
    Menu,
    X
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    // State untuk mengontrol buka-tutup sidebar di mobile/tablet
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            // 1. Tembak API logout untuk membersihkan cookie token JWT di browser
            await fetch('/api/auth/logout', { method: 'POST' });
            
            // 2. Lempar balik ke halaman login utama (root)
            router.push('/');
            router.refresh();
        } catch (err) {
            console.error('Gagal keluar dari sistem:', err);
        }
    };
    

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">

            {/* HEADER MOBILE (Hanya muncul di layar HP/Tablet < md) */}
            <header className="flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4 md:hidden sticky top-0 z-40">
                <h1 className="text-lg font-bold tracking-wider text-blue-500">HL MANAGEMENT</h1>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-slate-400 hover:text-white focus:outline-none"
                    title="Toggle Sidebar"
                >
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* BACKDROP MOBILE: Biar kalau sidebar kebuka di HP, area kanan jadi agak gelap */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                />
            )}

            <aside className={`
                fixed md:sticky inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900 p-6 flex flex-col justify-between shrink-0 h-screen top-0
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                <div className="space-y-6">
                    {/* Header Sidebar (Tombol Close hanya muncul di mobile pas kebuka) */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold tracking-wider text-blue-500">HL MANAGEMENT</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden p-1 text-slate-400 hover:text-white"
                            title="Close Sidebar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="space-y-2">
                        <Link
                            href="/dashboard"
                            onClick={() => setIsSidebarOpen(false)} // Otomatis tutup sidebar mobile pas diklik
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white font-medium text-sm transition-colors"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            <span>Dashboard Overview</span>
                        </Link>

                        <Link
                            href="/dashboard/products"
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white font-medium text-sm transition-colors"
                        >
                            <Package className="w-5 h-5" />
                            <span>Products Data</span>
                        </Link>

                        <Link
                            href="/dashboard/customers"
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white font-medium text-sm transition-colors"
                        >
                            <Users className="w-5 h-5" />
                            <span>Customers List</span>
                        </Link>

                        <Link
                            href="/dashboard/transactions"
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white font-medium text-sm transition-colors"
                        >
                            <ArrowLeftRight className="w-5 h-5" />
                            <span>Transactions</span>
                        </Link>

                        <Link 
                            href="/dashboard/profit" 
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white font-medium text-sm transition-colors"
                         >
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            <span className="text-emerald-400 font-semibold">Laporan Profit</span>
                            </Link>
                    </nav>
                </div>

                {/* User Info & Logout */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                    <div className="text-xs text-slate-400 px-2">
                        Logged in as: <span className="text-slate-200 block font-semibold">yuds@yuds.my.id</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* AREA KONTEN UTAMA */}
            <div className="flex-1 overflow-x-hidden bg-slate-950">
                {children}
            </div>
        </div>
    );
}