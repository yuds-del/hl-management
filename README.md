
# HL Sales & Receivables Management System

## Getting Started
Aplikasi manajemen internal satu pintu untuk pengelolaan Customer, Produk, Transaksi, Piutang, dan Bonus berbasis **Cash Basis Accounting**. Dirancang khusus untuk kebutuhan bisnis "HL".

First, run the development server:
## Fitur Utama

**Autentikasi Aman:** Sistem *Single-User* dengan password yang di-hash menggunakan `bcryptjs` dan sesi berbasis JWT.
**Manajemen Customer & Produk:** Mendukung pemisahan tipe produk (LM/BR) dan diskon bertingkat (*cascading discount*).
**Pencatatan Transaksi (Bon):**
 - Nomor bon unik.
 - Perhitungan otomatis Omzet dan Laba Bersih.
 - Penanganan Ongkir sebagai *pass-through* (tidak menambah profit).
**Buku Besar Mitra:** Detail transaksi per customer yang dikelompokkan berdasarkan bulan.
**Pelunasan Cepat:** Fitur *Settle 1 Bulan Lunas* untuk merubah status piutang secara massal.
**Sistem Bonus Otomatis:** Akumulasi omzet lunas untuk melacak ambang batas (*threshold*) bonus tiap customer.
**Laporan Akuntansi:** Rekapitulasi keuntungan riil berbasis kas yang dapat dicetak langsung ke format PDF.

Open http://localhost:3000 with your browser to see the result.
##  Stack Teknologi
**Frontend:** Next.js 15 (App Router), Tailwind CSS, Lucide React Icons.
**Backend:** Next.js API Routes.
**ORM & Database:** Prisma dengan SQLite/LibSQL (Serverless ready).
**Security:** Jose (JWT), Bcryptjs.


##  Aturan Bisnis (Core Logic)

## Learn More
1. **Cash Basis:** Omzet dan Laba hanya diakui dalam laporan jika status transaksi sudah `Lunas`.
2. **Cascading Discount:** Diskon dihitung berurutan (contoh: 100 - 20% - 20% - 10%), bukan dijumlahkan.
3. **Pass-through Shipping:** Ongkir ditagihkan ke customer namun tidak dihitung dalam Laba HL.
4. **Bonus Eligibility:** Transaksi dengan flag `isBonus` tidak menambah omzet dan tidak mengurangi laba (biaya modal diabaikan).


##  Cara Penggunaan
### 1. Instalasi
```bash
npm install
```

 ### 2. Konfigurasi Environment
Buat file `.env` di root direktori:
 ```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="masukkan_secret_key_anda_di_sini"
```

## Deploy on Vercel
### 3. Setup Database
```bash
npx prisma db push
```
### 4. Menjalankan Aplikasi
```bash
npm run dev
```
Akses aplikasi di `http://localhost:3000`. Saat pertama kali dibuka, sistem akan meminta pembuatan akun admin pertama.

##  Lisensi
Internal System for HL Management.
