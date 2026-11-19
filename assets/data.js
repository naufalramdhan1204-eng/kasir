'use strict';

/* ============================================================
   DATA & UTILITAS — Ayam Kapuk Tenda Biru POS
   ============================================================ */

  const STORE_KEY = 'agpos_db_v2';
const SESSION_KEY = 'agpos_session_v1';
const THEME_KEY = 'agpos_theme_v1';
const LOW_STOCK = 10;

const PAY_LABEL = { cash: 'Cash', qris: 'QRIS', debit: 'Kartu Debit', transfer: 'Transfer' };
const ORDER_LABEL = { dinein: 'Dine In', takeaway: 'Take Away' };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function rupiah(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
function compactRp(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'jt';
  if (n >= 1000) return Math.round(n / 1000) + 'rb';
  return String(n);
}
function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
function parseKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDate(iso, withTime) {
  const d = new Date(iso);
  let s = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  if (withTime) s += ' \u2022 ' + fmtTime(iso);
  return s;
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function todayLong() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function parseNum(v) {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function sum(arr, fn) { return arr.reduce((s, x) => s + (fn ? fn(x) : x), 0); }
function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}
function presetRange(preset) {
  const today = new Date();
  let from = new Date();
  if (preset === '7') from = addDays(today, -6);
  else if (preset === '30') from = addDays(today, -29);
  else if (preset === 'month') from = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: dateKey(from), to: dateKey(today) };
}
function nextId(list) { return list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1; }

/* ---------------- Seed ---------------- */
function seedTransactions(db) {
  const specs = [
    { d: 6, h: 12, m: 15, uid: 2, items: [[1, 2], [40, 2], [43, 2]], method: 'cash', paid: 50000, type: 'dinein', cust: 'Budi' },
    { d: 6, h: 13, m: 40, uid: 2, items: [[7, 2], [19, 1], [46, 2]], method: 'qris', type: 'dinein' },
    { d: 6, h: 19, m: 5, uid: 2, items: [[2, 1], [38, 1], [43, 2]], method: 'cash', paid: 30000, type: 'takeaway', cust: 'Sari' },
    { d: 5, h: 11, m: 20, uid: 2, items: [[7, 2], [46, 2]], method: 'cash', paid: 50000, type: 'dinein' },
    { d: 5, h: 12, m: 50, uid: 1, items: [[19, 1], [41, 1], [48, 1], [42, 1]], method: 'debit', type: 'dinein', cust: 'Pak Andi' },
    { d: 5, h: 18, m: 30, uid: 2, items: [[1, 1], [34, 1], [45, 1]], method: 'cash', paid: 30000, type: 'takeaway' },
    { d: 4, h: 13, m: 10, uid: 2, items: [[13, 1], [44, 3]], method: 'qris', type: 'dinein', cust: 'Rina' },
    { d: 4, h: 20, m: 15, uid: 2, items: [[4, 2], [39, 2], [47, 2]], method: 'cash', paid: 60000, type: 'dinein' },
    { d: 3, h: 12, m: 5, uid: 2, items: [[5, 1], [40, 1], [43, 1]], method: 'qris', type: 'takeaway' },
    { d: 3, h: 16, m: 35, uid: 1, items: [[22, 2], [37, 2], [48, 2]], method: 'cash', paid: 70000, type: 'dinein', cust: 'Keluarga Dewi' },
    { d: 3, h: 19, m: 55, uid: 2, items: [[29, 2], [36, 3], [45, 3]], method: 'cash', paid: 80000, type: 'dinein' },
    { d: 2, h: 11, m: 45, uid: 2, items: [[3, 1], [41, 1], [42, 1], [43, 1]], method: 'cash', paid: 30000, type: 'takeaway' },
    { d: 2, h: 14, m: 20, uid: 2, items: [[14, 3], [49, 3]], method: 'qris', type: 'dinein', cust: 'Rapat RT' },
    { d: 2, h: 20, m: 10, uid: 2, items: [[1, 2], [39, 2], [44, 2]], method: 'cash', paid: 60000, type: 'dinein' },
    { d: 1, h: 12, m: 30, uid: 2, items: [[4, 1], [37, 1], [40, 1], [43, 1]], method: 'cash', paid: 40000, type: 'dinein', cust: 'Joko' },
    { d: 1, h: 13, m: 15, uid: 2, items: [[15, 1], [46, 2]], method: 'qris', type: 'dinein' },
    { d: 1, h: 18, m: 45, uid: 2, items: [[23, 1], [33, 1], [47, 1]], method: 'debit', type: 'takeaway', cust: 'Maya' },
    { d: 0, h: 10, m: 20, uid: 2, items: [[2, 1], [43, 1]], method: 'cash', paid: 20000, type: 'takeaway', cust: 'Gilang' },
    { d: 0, h: 11, m: 5, uid: 2, items: [[8, 2], [50, 2]], method: 'qris', type: 'dinein' },
    { d: 0, h: 12, m: 10, uid: 1, items: [[1, 1], [30, 1], [40, 1], [42, 1], [45, 1]], method: 'cash', paid: 40000, type: 'dinein', cust: 'Bu Tuti' },
    { d: 0, h: 13, m: 25, uid: 2, items: [[20, 1], [51, 1]], method: 'cash', paid: 30000, type: 'dinein' },
    { d: 0, h: 14, m: 40, uid: 2, items: [[6, 2], [32, 2], [52, 2]], method: 'qris', type: 'dinein', cust: 'Bayu' }
  ];
  const counts = {};
  const txs = [];
  let id = 1;
  specs.forEach((s) => {
    const date = new Date();
    date.setDate(date.getDate() - s.d);
    date.setHours(s.h, s.m, 0, 0);
    const key = dateKey(date);
    counts[key] = (counts[key] || 0) + 1;
    const invoice = `INV-${key.slice(2).replace(/-/g, '')}-${String(counts[key]).padStart(4, '0')}`;
    const items = s.items.map(([iid, qty]) => {
      const it = db.items.find((x) => x.id === iid);
      return { itemId: it.id, name: it.name, price: it.price, qty, subtotal: it.price * qty, categoryId: it.categoryId, icon: it.icon };
    });
    const subtotal = sum(items, (i) => i.subtotal);
    const total = subtotal;
    const paid = s.method === 'cash' ? Math.max(s.paid || total, total) : total;
    txs.push({
      id: id++,
      invoice,
      date: date.toISOString(),
      dateKey: key,
      cashierId: s.uid,
      cashierName: db.users.find((u) => u.id === s.uid).name,
      items,
      subtotal,
      discountType: 'nom',
      discountValue: 0,
      discountAmount: 0,
      taxPct: 0,
      taxAmount: 0,
      servicePct: 0,
      serviceAmount: 0,
      total,
      payment: s.method,
      amountPaid: paid,
      change: Math.max(0, paid - total),
      orderType: s.type,
      customer: s.cust || '',
      note: '',
      status: 'paid'
    });
  });
  return txs;
}

function seedDB() {
  const categories = [
    { id: 1, name: 'Paket Hemat', icon: '\uD83C\uDF81' },
    { id: 2, name: 'Paket Dine In', icon: '\uD83C\uDF7D\uFE0F' },
    { id: 3, name: 'Paket Ma-Min', icon: '\uD83C\uDF71' },
    { id: 4, name: 'Menu Paket', icon: '\uD83C\uDF5B' },
    { id: 5, name: 'Cabe Ijo', icon: '\uD83C\uDF36\uFE0F' },
    { id: 6, name: 'Nasi Omelete', icon: '\uD83C\uDF73' },
    { id: 7, name: 'Nasi Goreng', icon: '\uD83C\uDF5A' },
    { id: 8, name: 'Tambahan', icon: '\uD83E\uDD6A' },
    { id: 9, name: 'Minuman', icon: '\uD83E\uDD64' }
  ];
  const rawItems = [
    /* Paket Hemat — Rp13.000 (nasi + ayam + sambal + lalapan) */
    [1, 1, 'Nasi Ayam Gepuk Korek', 13000, 30, '\uD83C\uDF57', 'Nasi + ayam gepuk + sambal korek + lalapan'],
    [2, 1, 'Nasi Ayam Penyet Korek', 13000, 30, '\uD83C\uDF57', 'Nasi + ayam penyet + sambal korek + lalapan'],
    [3, 1, 'Nasi Ayam Bakar Korek', 13000, 30, '\uD83C\uDF57', 'Nasi + ayam bakar + sambal korek + lalapan'],
    [4, 1, 'Nasi Ayam Gepuk Manis', 13000, 30, '\uD83C\uDF57', 'Nasi + ayam gepuk + sambal manis + lalapan'],
    [5, 1, 'Nasi Ayam Penyet Manis', 13000, 30, '\uD83C\uDF57', 'Nasi + ayam penyet + sambal manis + lalapan'],
    [6, 1, 'Nasi Ayam Bakar Manis', 13000, 30, '\uD83C\uDF57', 'Nasi + ayam bakar + sambal manis + lalapan'],
    /* Paket Dine In — Rp15.000 (nasi + ayam + sambal + free es teh) */
    [7, 2, 'Dine In Gepuk Korek', 15000, 25, '\uD83C\uDF7D\uFE0F', 'Nasi + ayam gepuk + sambal korek + free es teh'],
    [8, 2, 'Dine In Bakar Korek', 15000, 25, '\uD83C\uDF7D\uFE0F', 'Nasi + ayam bakar + sambal korek + free es teh'],
    [9, 2, 'Dine In Penyet Korek', 15000, 25, '\uD83C\uDF7D\uFE0F', 'Nasi + ayam penyet + sambal korek + free es teh'],
    [10, 2, 'Dine In Gepuk Manis', 15000, 25, '\uD83C\uDF7D\uFE0F', 'Nasi + ayam gepuk + sambal manis + free es teh'],
    [11, 2, 'Dine In Bakar Manis', 15000, 25, '\uD83C\uDF7D\uFE0F', 'Nasi + ayam bakar + sambal manis + free es teh'],
    [12, 2, 'Dine In Penyet Manis', 15000, 25, '\uD83C\uDF7D\uFE0F', 'Nasi + ayam penyet + sambal manis + free es teh'],
    /* Paket Ma-Min — Rp17.000 (makan & minum, free es teh) */
    [13, 3, 'Mamin Goreng Tiram', 17000, 20, '\uD83C\uDF71', 'Paket makan + minum, free es teh'],
    [14, 3, 'Mamin Goreng Asam Manis', 17000, 20, '\uD83C\uDF71', 'Paket makan + minum, free es teh'],
    [15, 3, 'Mamin Goreng Saos Padang', 17000, 20, '\uD83C\uDF71', 'Paket makan + minum, free es teh'],
    [16, 3, 'Mamin Goreng Mentega', 17000, 20, '\uD83C\uDF71', 'Paket makan + minum, free es teh'],
    [17, 3, 'Mamin Bakar Tiram', 17000, 20, '\uD83C\uDF71', 'Paket makan + minum, free es teh'],
    [18, 3, 'Mamin Bakar Asam Manis', 17000, 20, '\uD83C\uDF71', 'Paket makan + minum, free es teh'],
    /* Menu Paket — Rp16.000 */
    [19, 4, 'Nasi Chicken Katsu', 16000, 20, '\uD83C\uDF5B', 'Chicken katsu crispy + nasi'],
    [20, 4, 'Nasi Chicken Karage Tiram', 16000, 20, '\uD83C\uDF5B', 'Karage saus tiram + nasi'],
    [21, 4, 'Nasi Chicken Karage Asam Manis', 16000, 20, '\uD83C\uDF5B', 'Karage saus asam manis + nasi'],
    [22, 4, 'Nasi Chicken Karage Rica', 16000, 20, '\uD83C\uDF5B', 'Karage rica-rica pedas + nasi'],
    [23, 4, 'Nasi Chicken Karage Saos Padang', 16000, 20, '\uD83C\uDF5B', 'Karage saos padang + nasi'],
    [24, 4, 'Nasi Chicken Karage Saos Mentega', 16000, 20, '\uD83C\uDF5B', 'Karage saos mentega + nasi'],
    [25, 4, 'Nasi Ayam Geprek Rica', 16000, 20, '\uD83C\uDF5B', 'Ayam geprek rica + nasi'],
    [26, 4, 'Nasi Ayam Geprek Asam Manis', 16000, 20, '\uD83C\uDF5B', 'Ayam geprek asam manis + nasi'],
    [27, 4, 'Nasi Ayam Geprek Tiram', 16000, 20, '\uD83C\uDF5B', 'Ayam geprek saus tiram + nasi'],
    [28, 4, 'Nasi Ayam Bakar Rica', 16000, 20, '\uD83C\uDF5B', 'Ayam bakar rica + nasi'],
    /* Cabe Ijo — Rp15.000 */
    [29, 5, 'Nasi Ayam Geprek Cabe Ijo', 15000, 15, '\uD83C\uDF36\uFE0F', 'Ayam geprek sambal cabe ijo + nasi'],
    [30, 5, 'Nasi Ayam Bakar Cabe Ijo', 15000, 15, '\uD83C\uDF36\uFE0F', 'Ayam bakar sambal cabe ijo + nasi'],
    [31, 5, 'Nasi Ayam Penyet Cabe Ijo', 15000, 15, '\uD83C\uDF36\uFE0F', 'Ayam penyet sambal cabe ijo + nasi'],
    /* Nasi Omelete */
    [32, 6, 'Nasi Omelete Telur', 16000, 15, '\uD83C\uDF73', 'Nasi + omelete telur'],
    [33, 6, 'Nasi Omelete Telur Rica', 18000, 15, '\uD83C\uDF73', 'Nasi + omelete telur rica pedas'],
    /* Nasi Goreng — Rp13.000 */
    [34, 7, 'Nasi Goreng Original', 13000, 20, '\uD83C\uDF5A', 'Nasi goreng klasik'],
    [35, 7, 'Nasi Goreng Smoke Beef', 13000, 20, '\uD83C\uDF5A', 'Nasi goreng smoke beef'],
    [36, 7, 'Nasi Goreng Ayam', 13000, 20, '\uD83C\uDF5A', 'Nasi goreng ayam'],
    /* Tambahan */
    [37, 8, 'Tahu Kremes', 3000, 60, '\uD83E\uDDC6', 'Tahu kremes renyah'],
    [38, 8, 'Tempe Kremes', 3000, 60, '\uD83E\uDDC6', 'Tempe kremes renyah'],
    [39, 8, 'Sate Kulit Kremes', 5000, 40, '\uD83C\uDF62', 'Sate kulit ayam kremes'],
    [40, 8, 'Nasi Putih 1 Porsi', 5000, 100, '\uD83C\uDF5A', 'Nasi putih hangat 1 porsi'],
    [41, 8, 'Nasi Putih 1/2 Porsi', 2000, 100, '\uD83C\uDF5A', 'Nasi putih hangat setengah porsi'],
    [42, 8, 'Sambal 1 Porsi', 2000, 80, '\uD83C\uDF36\uFE0F', 'Sambal korek / manis 1 porsi'],
    /* Minuman */
    [43, 9, 'Es Teh Manis Mini', 3000, 150, '\uD83E\uDDCB', 'Es teh manis ukuran mini'],
    [44, 9, 'Es Teh Manis Jumbo', 5000, 100, '\uD83E\uDDCB', 'Es teh manis ukuran jumbo'],
    [45, 9, 'Air Mineral', 3000, 120, '\uD83D\uDCA7', 'Air mineral botol'],
    [46, 9, 'Nutrisari Jumbo', 5000, 80, '\uD83E\uDD64', 'Aneka nutrisari jumbo'],
    [47, 9, 'Capucino Jumbo Ori', 7000, 60, '\u2615', 'Capucino jumbo original'],
    [48, 9, 'Beng-Beng Ori', 7000, 60, '\uD83C\uDF6B', 'Es beng-beng original'],
    [49, 9, 'Teh Tarik', 6000, 60, '\uD83C\uDF75', 'Teh tarik manis kental'],
    [50, 9, 'Milky Anggur Jumbo', 8000, 50, '\uD83C\uDF47', 'Susu anggur jumbo'],
    [51, 9, 'Milky Strobery Jumbo', 8000, 50, '\uD83C\uDF53', 'Susu stroberi jumbo'],
    [52, 9, 'Milky Orange Jumbo', 8000, 50, '\uD83C\uDF4A', 'Susu jeruk jumbo']
  ];
  const items = rawItems.map(([id, categoryId, name, price, stock, icon, desc]) => ({
    id, categoryId, name, price, stock, icon, desc,
    status: stock > 0 ? 'tersedia' : 'habis'
  }));
  const users = [
    { id: 1, name: 'Pemilik Warung', username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, name: 'Kasir Utama', username: 'kasir', password: 'kasir123', role: 'kasir' }
  ];
  const settings = {
    storeName: 'Ayam Kapuk Tenda Biru',
    tagline: 'Pedasnya nagih, harga bersahabat.',
    address: 'Kantin Tenda Biru',
    phone: '0895-340-340-653',
    footer: 'Terima kasih \u2022 Menerima pesanan via WhatsApp 0895-340-340-653',
    taxPct: 0,
    servicePct: 0
  };
  const db = { users, categories, items, transactions: [], settings, meta: { createdAt: new Date().toISOString(), version: 1 } };
  db.transactions = seedTransactions(db).sort((a, b) => new Date(a.date) - new Date(b.date));
  return db;
}

/* ---------------- Persistence ---------------- */
function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.categories) && Array.isArray(parsed.users)) {
        if (!parsed.settings) parsed.settings = seedDB().settings;
        if (!Array.isArray(parsed.transactions)) parsed.transactions = [];
        return parsed;
      }
    }
  } catch (e) { /* abaikan storage rusak */ }
  const fresh = seedDB();
  localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  return fresh;
}
function saveDB() { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}

/* ---------------- State ---------------- */
let DB = loadDB();
let session = loadSession();
let currentPage = 'dashboard';
let cart = [];
let pendingConfirm = null;

const posState = {
  category: 'all',
  search: '',
  orderType: 'dinein',
  customer: '',
  note: '',
  discountType: 'nom',
  discountValue: 0,
  payment: 'cash',
  cashPaid: 0
};

const historyState = { from: dateKey(addDays(new Date(), -29)), to: dateKey(), q: '', payment: 'all', status: 'all' };
const reportState = { from: dateKey(addDays(new Date(), -6)), to: dateKey() };
const menuState = { q: '', category: 'all' };
const stockState = { q: '', filter: 'all' };

function currentUser() { return DB.users.find((u) => u.id === session?.userId) || null; }

/* ---------------- Navigasi ---------------- */
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', sub: 'Ringkasan performa warung', roles: ['admin'] },
  { key: 'pos', label: 'Kasir (POS)', icon: '🛒', sub: 'Buat pesanan & pembayaran', roles: ['admin', 'kasir'] },
  { key: 'history', label: 'Riwayat Transaksi', icon: '🧾', sub: 'Cari, cetak ulang & batalkan transaksi', roles: ['admin', 'kasir'] },
  { key: 'reports', label: 'Laporan', icon: '📈', sub: 'Analisis penjualan & menu terlaris', roles: ['admin'] },
  { key: 'menu', label: 'Menu & Kategori', icon: '🍗', sub: 'Kelola produk, harga & ketersediaan', roles: ['admin'] },
  { key: 'stock', label: 'Stok', icon: '📦', sub: 'Pantau & tambah stok menu', roles: ['admin'] },
  { key: 'users', label: 'Pengguna', icon: '👥', sub: 'Kelola akun admin & kasir', roles: ['admin'] },
  { key: 'settings', label: 'Pengaturan', icon: '⚙️', sub: 'Profil warung, pajak & data', roles: ['admin'] }
];
