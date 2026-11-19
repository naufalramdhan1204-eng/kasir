# 🍗 Ayam Kapuk Tenda Biru — Website Kasir (POS)

Website kasir modern untuk warung **Ayam Kapuk Tenda Biru** — 100% berjalan di browser
(tanpa PHP, tanpa MySQL, tanpa install apa pun). Cukup buka `index.html`.

## 🚀 Cara Menjalankan

1. Buka `index.html` di Chrome/Edge (double-click), atau
2. Jalankan mini server: `python -m http.server 8000` lalu buka `http://localhost:8000`

## 👤 Akun Demo

| Peran  | Username | Password  | Akses |
|-------|----------|-----------|-------|
| Admin | `admin`  | `admin123` | Semua fitur |
| Kasir | `kasir`  | `kasir123` | POS & Riwayat saja |

## ✨ Fitur

- **🔐 Login & hak akses (RBAC)** — kasir otomatis dialihkan dari halaman admin.
- **🛒 Kasir / POS**
  - Katalog 52 menu asli warung (9 kategori: Paket Hemat, Paket Dine In, Paket Ma-Min, Menu Paket, Cabe Ijo, Nasi Omelete, Nasi Goreng, Tambahan, Minuman), filter kategori, pencarian instan
  - Keranjang, ubah qty, catatan pesanan, nama pelanggan, Dine In / Take Away
  - Diskon nominal/persen, pajak & service charge otomatis (atur di Pengaturan)
  - Pembayaran Cash (uang pas / nominal cepat / hitung kembalian), QRIS, Debit
  - Stok otomatis berkurang saat transaksi; menu habis otomatis nonaktif
- **🧾 Struk & Riwayat**
  - Struk bergaya printer termal 58/80 mm, bisa dicetak (`Ctrl+P` di jendela cetak)
  - Riwayat dengan filter tanggal/metode/status, pencarian, detail, cetak ulang, ekspor CSV
  - **Batalkan transaksi** (admin) — stok otomatis dikembalikan
- **📊 Dashboard** — omzet hari ini + tren vs kemarin, grafik 7 hari, menu terlaris, transaksi terbaru, peringatan stok
- **📈 Laporan** — periode bebas + preset, tren penjualan, menu terlaris, metode pembayaran, performa kategori, cetak & ekspor CSV
- **🍗 Menu & Kategori** — CRUD lengkap (harga, stok, ikon, deskripsi, status Tersedia/Habis dengan toggle cepat)
- **📦 Stok** — filter aman/menipis/habis, tambah stok cepat (inline & modal), bar visual
- **👥 Pengguna** — kelola admin/kasir, ganti password & peran
- **⚙️ Pengaturan** — profil warung (tampil di struk), pajak & service charge, tema terang/gelap, backup/restore JSON, reset data
- **💾 Penyimpanan lokal** — semua data tersimpan di `localStorage` browser (tidak hilang saat refresh)
- **📱 Responsif** — sidebar off-canvas & layout adaptif untuk HP/tablet

## 🗂️ Struktur

```
kasir-ayam-kapuk-web/
├── index.html              # shell aplikasi (login + dashboard shell)
└── assets/
    ├── style.css           # tema terang/gelap & seluruh styling
    ├── data.js             # data awal (seed), util, state, penyimpanan
    ├── ui.js               # modal, toast, chart canvas
    ├── core.js             # auth, router, navigasi, branding
    ├── pages-pos.js        # render Dashboard & POS
    ├── pages-admin.js      # render Riwayat/Laporan/Menu/Stok/Pengguna/Pengaturan
    ├── actions-pos.js      # logika keranjang, checkout, struk, cetak, ekspor CSV
    ├── actions-admin.js    # CRUD menu/kategori/pengguna, filter, backup
    └── boot.js             # event delegation & inisialisasi
```

## 🧪 Uji Mandiri

`selftest.html` memeriksa alur landing → login → dashboard → logout secara otomatis.
Harus dijalankan lewat server lokal (akses `file://` memblokir iframe):

```
python -m http.server 8000
# lalu buka http://localhost:8000/selftest.html — semua baris harus PASS
```

## ⚠️ Catatan

- Demo edukasi: password disimpan di localStorage apa adanya — ganti bila dipakai nyata.
- Data hanya tersimpan di browser/komputer tersebut; gunakan fitur Backup untuk memindahkan.
