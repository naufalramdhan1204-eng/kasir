'use strict';

/* ============================================================
   AKSI — Kasir, Struk, Transaksi, Cetak & Ekspor
   ============================================================ */

/* ---------------- Keranjang ---------------- */
function addToCart(id) {
  const item = DB.items.find((i) => i.id === id);
  if (!item) return;
  if (item.status === 'habis' || item.stock <= 0) { toast(`${item.name} sedang habis.`, 'error'); return; }
  const row = cart.find((c) => c.itemId === id);
  const current = row ? row.qty : 0;
  if (current + 1 > item.stock) { toast(`Stok ${item.name} tinggal ${item.stock}.`, 'error'); return; }
  if (row) row.qty += 1;
  else cart.push({ itemId: id, qty: 1 });
  renderPOSCart();
}

function changeQty(id, delta) {
  const row = cart.find((c) => c.itemId === id);
  if (!row) return;
  const item = DB.items.find((i) => i.id === id);
  const next = row.qty + delta;
  if (next <= 0) { cart = cart.filter((c) => c.itemId !== id); renderPOSCart(); return; }
  if (item && next > item.stock) { toast(`Stok ${item.name} tinggal ${item.stock}.`, 'error'); return; }
  row.qty = next;
  renderPOSCart();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.itemId !== id);
  renderPOSCart();
}

function clearCart() {
  if (!cart.length) return;
  cart = [];
  posState.discountValue = 0;
  posState.cashPaid = 0;
  posState.customer = '';
  posState.note = '';
  const dv = $('#discountValue'); if (dv) dv.value = '';
  const cash = $('#cashPaid'); if (cash) cash.value = '';
  const cust = $('#custName'); if (cust) cust.value = '';
  const note = $('#orderNote'); if (note) note.value = '';
  renderPOSCart();
  toast('Keranjang dikosongkan.', 'info');
}

function setOrderType(type) {
  posState.orderType = type;
  $$('#orderTypeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
}

function setPayment(method) {
  posState.payment = method;
  updatePOSPaymentUI();
}

function setCashAmount(amount) {
  const total = cartDetails().total;
  const val = amount === 'exact' ? total : Number(amount);
  posState.cashPaid = val;
  const input = $('#cashPaid');
  if (input) input.value = val || '';
  updatePOSTotals();
}

function nextTxId() { return DB.transactions.reduce((m, t) => Math.max(m, t.id), 0) + 1; }

function nextInvoice(date = new Date()) {
  const key = dateKey(date).slice(2).replace(/-/g, '');
  const count = DB.transactions.filter((t) => t.invoice.startsWith('INV-' + key)).length + 1;
  return `INV-${key}-${String(count).padStart(4, '0')}`;
}

function checkout() {
  const d = cartDetails();
  if (!d.rows.length) { toast('Keranjang masih kosong.', 'error'); return; }
  for (const r of d.rows) {
    const item = DB.items.find((i) => i.id === r.item.id);
    if (!item || item.stock < r.qty) {
      toast(`Stok ${r.item.name} tidak mencukupi. Periksa kembali.`, 'error');
      return;
    }
  }
  let paid = d.total;
  let change = 0;
  if (posState.payment === 'cash') {
    paid = parseNum(posState.cashPaid);
    if (paid < d.total) { toast('Uang yang diterima kurang dari total.', 'error'); return; }
    change = paid - d.total;
  }
  const u = currentUser();
  const now = new Date();
  const tx = {
    id: nextTxId(),
    invoice: nextInvoice(now),
    date: now.toISOString(),
    dateKey: dateKey(now),
    cashierId: u.id,
    cashierName: u.name,
    items: d.rows.map((r) => ({
      itemId: r.item.id, name: r.item.name, price: r.item.price, qty: r.qty,
      subtotal: r.subtotal, categoryId: r.item.categoryId, icon: r.item.icon
    })),
    subtotal: d.subtotal,
    discountType: posState.discountType,
    discountValue: posState.discountValue,
    discountAmount: d.discount,
    taxPct: Number(DB.settings.taxPct) || 0,
    taxAmount: d.tax,
    servicePct: Number(DB.settings.servicePct) || 0,
    serviceAmount: d.service,
    total: d.total,
    payment: posState.payment,
    amountPaid: paid,
    change,
    orderType: posState.orderType,
    customer: posState.customer.trim(),
    note: posState.note.trim(),
    status: 'paid'
  };
  d.rows.forEach((r) => {
    const item = DB.items.find((i) => i.id === r.item.id);
    if (item) {
      item.stock = Math.max(0, item.stock - r.qty);
      if (item.stock === 0) item.status = 'habis';
    }
  });
  DB.transactions.push(tx);
  saveDB();
  cart = [];
  posState.customer = '';
  posState.note = '';
  posState.discountValue = 0;
  posState.cashPaid = 0;
  if (currentPage === 'pos') goNav('pos', true);
  showReceipt(tx.id);
  toast(`Transaksi ${tx.invoice} berhasil!`, 'success');
}

/* ---------------- Struk ---------------- */
function receiptHTML(tx) {
  const s = DB.settings;
  const rows = [];
  rows.push(`<div class="rc-center rc-store">${esc(s.storeName)}</div>`);
  rows.push(`<div class="rc-center rc-small">${esc(s.tagline)}</div>`);
  rows.push(`<div class="rc-center rc-small">${esc(s.address)}</div>`);
  rows.push(`<div class="rc-center rc-small">Telp ${esc(s.phone)}</div>`);
  rows.push('<div class="rc-dash"></div>');
  rows.push(`<div class="rc-row"><span>Invoice</span><span>${esc(tx.invoice)}</span></div>`);
  rows.push(`<div class="rc-row"><span>Waktu</span><span>${fmtDate(tx.date, true)}</span></div>`);
  rows.push(`<div class="rc-row"><span>Kasir</span><span>${esc(tx.cashierName)}</span></div>`);
  rows.push(`<div class="rc-row"><span>Tipe</span><span>${esc(ORDER_LABEL[tx.orderType] || tx.orderType)}</span></div>`);
  if (tx.customer) rows.push(`<div class="rc-row"><span>Pelanggan</span><span>${esc(tx.customer)}</span></div>`);
  rows.push('<div class="rc-dash"></div>');
  tx.items.forEach((i) => {
    rows.push(`<div class="rc-item"><div class="rc-item-name">${esc(i.name)}</div>
      <div class="rc-row"><span>${i.qty} x ${rupiah(i.price)}</span><span>${rupiah(i.subtotal)}</span></div></div>`);
  });
  rows.push('<div class="rc-dash"></div>');
  rows.push(`<div class="rc-row"><span>Subtotal</span><span>${rupiah(tx.subtotal)}</span></div>`);
  if (tx.discountAmount > 0) rows.push(`<div class="rc-row"><span>Diskon</span><span>- ${rupiah(tx.discountAmount)}</span></div>`);
  if (tx.serviceAmount > 0) rows.push(`<div class="rc-row"><span>Service (${tx.servicePct}%)</span><span>${rupiah(tx.serviceAmount)}</span></div>`);
  if (tx.taxAmount > 0) rows.push(`<div class="rc-row"><span>Pajak (${tx.taxPct}%)</span><span>${rupiah(tx.taxAmount)}</span></div>`);
  rows.push(`<div class="rc-row rc-total"><span>TOTAL</span><span>${rupiah(tx.total)}</span></div>`);
  rows.push(`<div class="rc-row"><span>${esc(PAY_LABEL[tx.payment] || tx.payment)}</span><span>${rupiah(tx.amountPaid)}</span></div>`);
  rows.push(`<div class="rc-row"><span>Kembali</span><span>${rupiah(tx.change)}</span></div>`);
  if (tx.note) rows.push(`<div class="rc-note">Catatan: ${esc(tx.note)}</div>`);
  if (tx.status === 'void') rows.push('<div class="rc-void">*** TRANSAKSI DIBATALKAN ***</div>');
  rows.push('<div class="rc-dash"></div>');
  rows.push(`<div class="rc-center rc-small">${esc(s.footer)}</div>`);
  return `<div class="receipt">${rows.join('')}</div>`;
}

function showReceipt(id) {
  const tx = DB.transactions.find((t) => t.id === id);
  if (!tx) return;
  const footer = `
        <button class="btn primary" data-action="receipt-print" data-id="${tx.id}">Cetak Struk</button>
    <button class="btn ghost" data-action="close-modal">Tutup</button>`;
  openModal(modalShell('Struk Transaksi', `<div class="receipt-wrap">${receiptHTML(tx)}</div>`, footer), 'receipt-modal');
}

function openTransactionDetail(id) {
  const t = DB.transactions.find((x) => x.id === id);
  if (!t) return;
  const qty = sum(t.items, (i) => i.qty);
  const body = `
    <div class="tx-meta-grid">
      <div><span>Invoice</span><b class="mono">${esc(t.invoice)}</b></div>
      <div><span>Waktu</span><b>${fmtDate(t.date, true)}</b></div>
      <div><span>Kasir</span><b>${esc(t.cashierName)}</b></div>
      <div><span>Tipe Pesanan</span><b>${esc(ORDER_LABEL[t.orderType] || t.orderType)}</b></div>
      <div><span>Pelanggan</span><b>${esc(t.customer || 'Pelanggan Umum')}</b></div>
      <div><span>Metode</span><b>${esc(PAY_LABEL[t.payment] || t.payment)}</b></div>
      <div><span>Status</span><b><span class="badge ${t.status === 'void' ? 'red' : 'green'}">${t.status === 'void' ? 'Dibatalkan' : 'Lunas'}</span></b></div>
      <div><span>Total Item</span><b>${qty} item</b></div>
    </div>
    <div class="table-wrap">
      <table class="table compact">
        <thead><tr><th>Menu</th><th class="right">Harga</th><th class="center">Qty</th><th class="right">Subtotal</th></tr></thead>
        <tbody>${t.items.map((i) => `<tr>
          <td>${esc(i.icon || '')} ${esc(i.name)}</td>
          <td class="right">${rupiah(i.price)}</td>
          <td class="center">${i.qty}</td>
          <td class="right strong">${rupiah(i.subtotal)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="tx-totals">
      <div><span>Subtotal</span><b>${rupiah(t.subtotal)}</b></div>
      ${t.discountAmount > 0 ? `<div><span>Diskon</span><b>- ${rupiah(t.discountAmount)}</b></div>` : ''}
      ${t.serviceAmount > 0 ? `<div><span>Service (${t.servicePct}%)</span><b>${rupiah(t.serviceAmount)}</b></div>` : ''}
      ${t.taxAmount > 0 ? `<div><span>Pajak (${t.taxPct}%)</span><b>${rupiah(t.taxAmount)}</b></div>` : ''}
      <div class="grand"><span>Total</span><b>${rupiah(t.total)}</b></div>
      <div><span>Dibayar</span><b>${rupiah(t.amountPaid)}</b></div>
      <div><span>Kembalian</span><b>${rupiah(t.change)}</b></div>
    </div>
        ${t.note ? `<div class="info-box">Catatan: ${esc(t.note)}</div>` : ''}`;
  const footer = `
        <button class="btn primary" data-action="receipt-print" data-id="${t.id}">Cetak Struk</button>
    <button class="btn ghost" data-action="close-modal">Tutup</button>`;
  openModal(modalShell('Detail Transaksi', body, footer), 'wide');
}

function voidTransaction(id) {
  const t = DB.transactions.find((x) => x.id === id);
  if (!t || t.status === 'void') return;
  confirmDialog(
    'Batalkan Transaksi',
    `Transaksi ${t.invoice} senilai ${rupiah(t.total)} akan dibatalkan dan stok dikembalikan. Lanjutkan?`,
    'Ya, batalkan',
    () => {
      t.status = 'void';
      t.items.forEach((i) => {
        const item = DB.items.find((x) => x.id === i.itemId);
        if (item) {
          item.stock += i.qty;
          if (item.stock > 0) item.status = 'tersedia';
        }
      });
      saveDB();
      closeModal();
      toast(`Transaksi ${t.invoice} dibatalkan.`, 'success');
      goNav(currentPage === 'dashboard' ? 'dashboard' : 'history', true);
    }
  );
}

/* ---------------- Cetak ---------------- */
const PRINT_CSS = `
  *{box-sizing:border-box}
  body{font-family:'Courier New',monospace;color:#111;margin:0;padding:0}
  .receipt{width:76mm;margin:0 auto;padding:6mm 3mm;font-size:11px;line-height:1.45}
  .rc-center{text-align:center}
  .rc-store{font-size:15px;font-weight:800;letter-spacing:.2px}
  .rc-small{font-size:9.5px;color:#333}
  .rc-dash{border-top:1px dashed #555;margin:6px 0}
  .rc-row{display:flex;justify-content:space-between;gap:8px}
  .rc-item-name{font-weight:700}
  .rc-total{font-weight:800;font-size:13px;border-top:1px solid #111;border-bottom:1px solid #111;padding:4px 0;margin:4px 0}
  .rc-note{font-size:10px;margin-top:4px;font-style:italic}
  .rc-void{text-align:center;font-weight:800;margin-top:6px}
  .report{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111}
  .report h1{font-size:20px;margin:0 0 2px}
  .report h2{font-size:14px;margin:18px 0 6px}
  .report .muted{color:#555;font-size:11px;margin:0}
  .report table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
  .report th,.report td{border:1px solid #bbb;padding:6px 8px;text-align:left}
  .report th{background:#f0f0f0}
  .report .right{text-align:right}
  .kpi-print{display:flex;gap:10px;margin:12px 0}
  .kpi-print div{flex:1;border:1px solid #ccc;border-radius:6px;padding:8px 10px}
  .kpi-print small{display:block;color:#555;font-size:10px}
  .kpi-print b{font-size:15px}
`;

function printDocument(title, bodyHTML) {
  const w = window.open('', '_blank', 'width=480,height=720');
  if (!w) { toast('Popup diblokir. Izinkan popup untuk mencetak.', 'error'); return; }
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) { /* ignore */ } }, 350);
}

function printReceipt(id) {
  const t = DB.transactions.find((x) => x.id === id);
  if (!t) return;
  printDocument('Struk ' + t.invoice, receiptHTML(t));
}

function printReport() {
  const txs = reportTransactions();
  const total = sum(txs, (t) => t.total);
  const qty = sum(txs, (t) => sum(t.items, (i) => i.qty));
  const avg = txs.length ? total / txs.length : 0;
  const series = reportSeries();
  const tops = topItems(reportState.from, reportState.to, 10);
  const pays = paymentBreakdown(txs);
  const cats = categoryBreakdown(txs);
  const body = `
    <div class="report">
      <h1>${esc(DB.settings.storeName)}</h1>
      <p class="muted">${esc(DB.settings.address)} • Telp ${esc(DB.settings.phone)}</p>
      <h2>Laporan Penjualan</h2>
      <p class="muted">Periode: ${fmtDate(parseKey(reportState.from))} s.d. ${fmtDate(parseKey(reportState.to))} • Dicetak ${fmtDate(new Date().toISOString(), true)}</p>
      <div class="kpi-print">
        <div><small>Total Omzet</small><b>${rupiah(total)}</b></div>
        <div><small>Transaksi</small><b>${txs.length}</b></div>
        <div><small>Item Terjual</small><b>${qty}</b></div>
        <div><small>Rata-rata</small><b>${rupiah(avg)}</b></div>
      </div>
      <h2>Tren Penjualan</h2>
      <table><thead><tr><th>Periode</th><th class="right">Omzet</th></tr></thead><tbody>
        ${series.labels.map((l, i) => `<tr><td>${l}</td><td class="right">${rupiah(series.values[i])}</td></tr>`).join('')}
      </tbody></table>
      <h2>Menu Terlaris</h2>
      <table><thead><tr><th>#</th><th>Menu</th><th class="right">Qty</th><th class="right">Omzet</th></tr></thead><tbody>
        ${tops.length ? tops.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.name)}</td><td class="right">${t.qty}</td><td class="right">${rupiah(t.revenue)}</td></tr>`).join('') : '<tr><td colspan="4">Belum ada data</td></tr>'}
      </tbody></table>
      <h2>Metode Pembayaran</h2>
      <table><thead><tr><th>Metode</th><th class="right">Transaksi</th><th class="right">Omzet</th></tr></thead><tbody>
        ${pays.map((p) => `<tr><td>${esc(PAY_LABEL[p.method] || p.method)}</td><td class="right">${p.count}</td><td class="right">${rupiah(p.total)}</td></tr>`).join('')}
      </tbody></table>
      <h2>Performa Kategori</h2>
      <table><thead><tr><th>Kategori</th><th class="right">Qty</th><th class="right">Omzet</th></tr></thead><tbody>
        ${cats.map((c) => `<tr><td>${esc(c.name)}</td><td class="right">${c.qty}</td><td class="right">${rupiah(c.total)}</td></tr>`).join('')}
      </tbody></table>
      <p class="muted" style="margin-top:18px">Dicetak dari Sistem Kasir ${esc(DB.settings.storeName)}</p>
    </div>`;
  printDocument('Laporan Penjualan', body);
}

/* ---------------- Ekspor CSV ---------------- */
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function downloadCSV(filename, rows) {
  const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  downloadFile(filename, csv, 'text/csv;charset=utf-8');
}
function txCSVRows(txs) {
  const header = ['Invoice', 'Tanggal', 'Waktu', 'Kasir', 'Pelanggan', 'Tipe', 'Metode', 'Status', 'Subtotal', 'Diskon', 'Pajak', 'Service', 'Total', 'Dibayar', 'Kembali', 'Item'];
  const rows = txs.map((t) => [
    t.invoice,
    t.dateKey,
    fmtTime(t.date),
    t.cashierName,
    t.customer || '',
    ORDER_LABEL[t.orderType] || t.orderType,
    PAY_LABEL[t.payment] || t.payment,
    t.status === 'void' ? 'Dibatalkan' : 'Lunas',
    t.subtotal,
    t.discountAmount,
    t.taxAmount,
    t.serviceAmount,
    t.total,
    t.amountPaid,
    t.change,
    t.items.map((i) => `${i.name} x${i.qty}`).join(' | ')
  ]);
  return [header, ...rows];
}
function exportHistoryCSV() {
  const txs = filterHistory();
  downloadCSV(`riwayat-transaksi-${dateKey()}.csv`, txCSVRows(txs));
  toast(`${txs.length} transaksi diekspor.`, 'success');
}
function exportReportCSV() {
  const txs = reportTransactions();
  downloadCSV(`laporan-${reportState.from}-ke-${reportState.to}.csv`, txCSVRows(txs));
  toast(`${txs.length} transaksi laporan diekspor.`, 'success');
}
