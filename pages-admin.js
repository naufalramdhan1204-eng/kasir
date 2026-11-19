'use strict';

/* ============================================================
   HALAMAN — Riwayat, Laporan, Menu, Stok, Pengguna, Pengaturan
   ============================================================ */

/* ---------------- Riwayat ---------------- */
function filterHistory() {
  const q = historyState.q.trim().toLowerCase();
  return DB.transactions.filter((t) => {
    if (t.dateKey < historyState.from || t.dateKey > historyState.to) return false;
    if (historyState.payment !== 'all' && t.payment !== historyState.payment) return false;
    if (historyState.status !== 'all' && t.status !== historyState.status) return false;
    if (!q) return true;
    return t.invoice.toLowerCase().includes(q) ||
      (t.customer || '').toLowerCase().includes(q) ||
      t.cashierName.toLowerCase().includes(q) ||
      t.items.some((i) => i.name.toLowerCase().includes(q));
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderHistory() {
  const txs = filterHistory();
  const paid = txs.filter((t) => t.status !== 'void');
  const total = sum(paid, (t) => t.total);
  const voided = txs.filter((t) => t.status === 'void').length;
  const itemsQty = sum(paid, (t) => sum(t.items, (i) => i.qty));

  return `
  <div class="filter-card card">
    <div class="filter-row">
      <label class="field-mini"><span>Dari tanggal</span><input type="date" id="histFrom" class="input" value="${historyState.from}"></label>
      <label class="field-mini"><span>Sampai</span><input type="date" id="histTo" class="input" value="${historyState.to}"></label>
      <label class="field-mini grow"><span>Cari</span><input id="histQ" class="input" placeholder="No. struk, pelanggan, kasir, menu..." value="${esc(historyState.q)}"></label>
      <label class="field-mini"><span>Pembayaran</span>
        <select id="histPayment" class="input">
          <option value="all"${historyState.payment === 'all' ? ' selected' : ''}>Semua</option>
          <option value="cash"${historyState.payment === 'cash' ? ' selected' : ''}>Cash</option>
          <option value="qris"${historyState.payment === 'qris' ? ' selected' : ''}>QRIS</option>
          <option value="debit"${historyState.payment === 'debit' ? ' selected' : ''}>Debit</option>
        </select>
      </label>
      <label class="field-mini"><span>Status</span>
        <select id="histStatus" class="input">
          <option value="all"${historyState.status === 'all' ? ' selected' : ''}>Semua</option>
          <option value="paid"${historyState.status === 'paid' ? ' selected' : ''}>Lunas</option>
          <option value="void"${historyState.status === 'void' ? ' selected' : ''}>Dibatalkan</option>
        </select>
      </label>
      <div class="filter-actions">
        <button class="btn primary" data-action="history-apply">Terapkan</button>
        <button class="btn ghost" data-action="history-reset">Reset</button>
      </div>
    </div>
    <div class="preset-row">
      <span>Filter cepat:</span>
      <button class="chip" data-action="history-preset" data-preset="today">Hari ini</button>
      <button class="chip" data-action="history-preset" data-preset="7">7 Hari</button>
      <button class="chip" data-action="history-preset" data-preset="30">30 Hari</button>
      <button class="chip" data-action="history-preset" data-preset="month">Bulan Ini</button>
      <span class="spacer"></span>
      <button class="btn ghost sm" data-action="export-history">Ekspor CSV</button>
    </div>
  </div>

  <div class="mini-kpis">
    <div class="mini-kpi"><div><small>Transaksi</small><b>${paid.length}</b></div></div>
    <div class="mini-kpi"><div><small>Total Omzet</small><b>${rupiah(total)}</b></div></div>
    <div class="mini-kpi"><div><small>Item Terjual</small><b>${itemsQty}</b></div></div>
    <div class="mini-kpi"><div><small>Dibatalkan</small><b>${voided}</b></div></div>
  </div>

  <div class="card table-card">
    <div class="table-head">
      <h3>Daftar Transaksi</h3>
      <span class="pill soft">${txs.length} data</span>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Invoice</th><th>Waktu</th><th>Pelanggan</th><th>Kasir</th><th>Item</th><th>Metode</th>
          <th class="right">Total</th><th>Status</th><th class="right">Aksi</th>
        </tr></thead>
        <tbody>
          ${txs.length ? txs.map((t) => {
            const qty = sum(t.items, (i) => i.qty);
            return `<tr>
              <td><span class="mono">${esc(t.invoice)}</span></td>
              <td>${fmtDate(t.date, true)}</td>
              <td>${esc(t.customer || '-')}</td>
              <td>${esc(t.cashierName)}</td>
              <td>${qty} item</td>
              <td><span class="method-badge">${esc(PAY_LABEL[t.payment] || t.payment)}</span></td>
              <td class="right strong">${rupiah(t.total)}</td>
              <td><span class="badge ${t.status === 'void' ? 'red' : 'green'}">${t.status === 'void' ? 'Dibatalkan' : 'Lunas'}</span></td>
              <td class="right">
                <div class="row-actions">
                  <button class="btn sm" title="Detail" data-action="tx-detail" data-id="${t.id}">Detail</button>
                  <button class="btn sm" title="Cetak struk" data-action="tx-reprint" data-id="${t.id}">Cetak</button>
                  ${currentUser().role === 'admin' && t.status !== 'void' ? `<button class="btn sm danger" title="Batalkan transaksi" data-action="tx-void" data-id="${t.id}">Batal</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="9">${emptyState('', 'Tidak ada transaksi', 'Ubah filter tanggal atau mulai transaksi baru.')}</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ---------------- Laporan ---------------- */
function reportTransactions() {
  return DB.transactions.filter((t) => t.status !== 'void' && t.dateKey >= reportState.from && t.dateKey <= reportState.to);
}

function reportSeries() {
  const from = parseKey(reportState.from);
  const to = parseKey(reportState.to);
  const days = Math.round((to - from) / 86400000) + 1;
  const txs = reportTransactions();
  if (days > 62) {
    const map = {};
    txs.forEach((t) => { const k = t.dateKey.slice(0, 7); map[k] = (map[k] || 0) + t.total; });
    const labels = [];
    const values = [];
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      const k = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`;
      labels.push(cur.toLocaleDateString('id-ID', { month: 'short' }));
      values.push(map[k] || 0);
      cur.setMonth(cur.getMonth() + 1);
    }
    return { labels, values };
  }
  const map = {};
  txs.forEach((t) => { map[t.dateKey] = (map[t.dateKey] || 0) + t.total; });
  const labels = [];
  const values = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    values.push(map[dateKey(d)] || 0);
  }
  return { labels, values };
}

function topItems(fromKey, toKey, limit = 5) {
  const map = {};
  DB.transactions.filter((t) => t.status !== 'void' && t.dateKey >= fromKey && t.dateKey <= toKey)
    .forEach((t) => t.items.forEach((i) => {
      const o = map[i.itemId] || (map[i.itemId] = { id: i.itemId, name: i.name, icon: i.icon || '', qty: 0, revenue: 0 });
      o.qty += i.qty;
      o.revenue += i.subtotal;
    }));
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit);
}

function paymentBreakdown(txs) {
  const map = {};
  txs.forEach((t) => {
    const o = map[t.payment] || (map[t.payment] = { method: t.payment, count: 0, total: 0 });
    o.count += 1;
    o.total += t.total;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function categoryBreakdown(txs) {
  const map = {};
  txs.forEach((t) => t.items.forEach((i) => {
    const cat = DB.categories.find((c) => c.id === i.categoryId);
    const name = cat ? cat.name : 'Lainnya';
    const icon = cat ? cat.icon : '';
    const o = map[name] || (map[name] = { name, icon, qty: 0, total: 0 });
    o.qty += i.qty;
    o.total += i.subtotal;
  }));
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function reportChartUnit() {
  const from = parseKey(reportState.from);
  const to = parseKey(reportState.to);
  return Math.round((to - from) / 86400000) + 1 > 62 ? 'bulan' : 'hari';
}

function renderReports() {
  const txs = reportTransactions();
  const total = sum(txs, (t) => t.total);
  const qty = sum(txs, (t) => sum(t.items, (i) => i.qty));
  const avg = txs.length ? total / txs.length : 0;
  const tops = topItems(reportState.from, reportState.to, 8);
  const maxTop = tops.length ? tops[0].qty : 1;
  const pays = paymentBreakdown(txs);
  const cats = categoryBreakdown(txs);
  const maxCat = cats.length ? cats[0].total : 1;
  let bestDay = null;
  const dayMap = {};
  txs.forEach((t) => { dayMap[t.dateKey] = (dayMap[t.dateKey] || 0) + t.total; });
  const entries = Object.entries(dayMap).sort((a, b) => b[1] - a[1]);
  if (entries.length) bestDay = { key: entries[0][0], total: entries[0][1] };

  return `
  <div class="filter-card card">
    <div class="filter-row">
      <label class="field-mini"><span>Dari tanggal</span><input type="date" id="repFrom" class="input" value="${reportState.from}"></label>
      <label class="field-mini"><span>Sampai</span><input type="date" id="repTo" class="input" value="${reportState.to}"></label>
      <div class="filter-actions">
        <button class="btn primary" data-action="report-apply">Terapkan</button>
        <button class="btn ghost" data-action="print-report">Cetak</button>
        <button class="btn ghost" data-action="export-report">CSV</button>
      </div>
    </div>
    <div class="preset-row">
      <span>Periode:</span>
      <button class="chip" data-action="report-preset" data-preset="today">Hari ini</button>
      <button class="chip" data-action="report-preset" data-preset="7">7 Hari</button>
      <button class="chip" data-action="report-preset" data-preset="30">30 Hari</button>
      <button class="chip" data-action="report-preset" data-preset="month">Bulan Ini</button>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiCard('💰', 'red', 'Total Omzet', rupiah(total), `${fmtDate(parseKey(reportState.from))} – ${fmtDate(parseKey(reportState.to))}`)}
    ${kpiCard('🧾', 'blue', 'Jumlah Transaksi', String(txs.length), `${qty} item terjual`)}
    ${kpiCard('📊', 'gold', 'Rata-rata / Transaksi', rupiah(avg), txs.length ? 'per transaksi' : 'belum ada data')}
    ${kpiCard('🏆', 'green', 'Hari Terbaik', bestDay ? rupiah(bestDay.total) : rupiah(0), bestDay ? fmtDate(parseKey(bestDay.key)) : 'belum ada data')}
  </div>

  <section class="card chart-card">
    <div class="card-head"><div><h3>Tren Penjualan</h3><p>Omzet per ${reportChartUnit()}</p></div><span class="pill">${rupiah(total)}</span></div>
    <div class="chart-wrap"><canvas id="reportChart"></canvas></div>
  </section>

  <div class="dash-grid second">
    <section class="card">
      <div class="card-head"><div><h3>Menu Terlaris</h3><p>Berdasarkan jumlah terjual</p></div></div>
      ${tops.length ? `<div class="rank-list">${tops.map((t, i) => `
        <div class="rank-row">
          <span class="rank-no ${i === 0 ? 'first' : ''}">${i + 1}</span>
          <span class="rank-icon">${esc(t.icon || '')}</span>
          <div class="rank-main">
            <div class="rank-name">${esc(t.name)}</div>
            <div class="rank-bar"><span style="width:${Math.max(6, (t.qty / maxTop) * 100)}%"></span></div>
          </div>
          <div class="rank-val"><b>${t.qty}</b><small>${rupiah(t.revenue)}</small></div>
        </div>`).join('')}</div>` : emptyState('', 'Belum ada data', 'Pilih periode yang memiliki transaksi.')}
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Metode Pembayaran</h3><p>Distribusi omzet</p></div></div>
      ${pays.length ? `<div class="breakdown">${pays.map((p) => {
        const pct = total ? (p.total / total) * 100 : 0;
        return `<div class="bd-row">
          <div class="bd-top"><span>${esc(PAY_LABEL[p.method] || p.method)} <small>• ${p.count}x</small></span><b>${rupiah(p.total)}</b></div>
          <div class="bd-bar"><span style="width:${Math.max(2, pct)}%"></span></div>
          <small class="bd-pct">${pct.toFixed(1)}% dari omzet</small>
        </div>`;
      }).join('')}</div>` : emptyState('', 'Belum ada pembayaran', 'Data metode pembayaran akan tampil di sini.')}
    </section>
  </div>

  <section class="card">
    <div class="card-head"><div><h3>Performa Kategori</h3><p>Kontribusi omzet per kategori menu</p></div></div>
    ${cats.length ? `<div class="breakdown grid2">${cats.map((c) => {
      const pct = total ? (c.total / total) * 100 : 0;
      return `<div class="bd-row">
          <div class="bd-top"><span>${esc(c.icon)} ${esc(c.name)} <small>• ${c.qty} item</small></span><b>${rupiah(c.total)}</b></div>
        <div class="bd-bar"><span style="width:${Math.max(2, (c.total / maxCat) * 100)}%"></span></div>
        <small class="bd-pct">${pct.toFixed(1)}% dari omzet</small>
      </div>`;
    }).join('')}</div>` : emptyState('', 'Belum ada data kategori', 'Data akan muncul setelah ada transaksi.')}
  </section>`;
}

function afterReports() { drawReportChart(); }
function drawReportChart() {
  const s = reportSeries();
  drawBarChart('reportChart', s.labels, s.values);
}

/* ---------------- Menu ---------------- */
function menuFilteredItems() {
  const q = menuState.q.trim().toLowerCase();
  return DB.items.filter((i) => {
    const okCat = menuState.category === 'all' || i.categoryId === Number(menuState.category);
    const okQ = !q || i.name.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q);
    return okCat && okQ;
  });
}

function renderMenu() {
  return `
  <div class="filter-card card">
    <div class="filter-row">
      <label class="field-mini grow"><span>Cari menu</span><input id="menuQ" class="input" placeholder="Nama menu..." value="${esc(menuState.q)}"></label>
      <label class="field-mini"><span>Kategori</span>
        <select id="menuCat" class="input">
          <option value="all"${menuState.category === 'all' ? ' selected' : ''}>Semua kategori</option>
          ${DB.categories.map((c) => `<option value="${c.id}"${menuState.category === String(c.id) ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </label>
      <div class="filter-actions">
        <button class="btn primary" data-action="menu-add">+ Tambah Menu</button>
        <button class="btn ghost" data-action="cat-manage">Kelola Kategori</button>
      </div>
    </div>
    <div class="preset-row">
      <span class="pill soft" id="menuCount">${menuFilteredItems().length} menu</span>
      <span class="spacer"></span>
      <span class="muted-note">Status & stok dapat diubah cepat dari tabel.</span>
    </div>
  </div>

  <div class="card table-card">
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Menu</th><th>Kategori</th><th class="right">Harga</th><th>Stok</th><th>Status</th><th class="right">Aksi</th>
        </tr></thead>
        <tbody id="menuTableBody">${menuTableRows()}</tbody>
      </table>
    </div>
  </div>`;
}

function menuTableRows() {
  const items = menuFilteredItems();
  if (!items.length) return `<tr><td colspan="6">${emptyState('', 'Menu tidak ditemukan', 'Coba kata kunci lain atau tambah menu baru.')}</td></tr>`;
  return items.map((i) => {
    const cat = DB.categories.find((c) => c.id === i.categoryId);
    const out = i.status === 'habis' || i.stock <= 0;
    return `<tr>
      <td>
        <div class="cell-product">
          <span class="cell-icon">${esc(i.icon)}</span>
          <div><strong>${esc(i.name)}</strong><small>${esc(i.desc || '-')}</small></div>
        </div>
      </td>
      <td>${esc(cat ? cat.name : '-')}</td>
      <td class="right strong">${rupiah(i.price)}</td>
      <td><span class="badge ${out ? 'red' : i.stock <= LOW_STOCK ? 'gold' : 'green'}">${i.stock} unit</span></td>
      <td><button class="badge ${out ? 'red' : 'green'} clickable" data-action="menu-toggle" data-id="${i.id}" title="Klik untuk ubah status">${out ? 'Habis' : 'Tersedia'}</button></td>
      <td class="right">
        <div class="row-actions">
          <button class="btn sm" title="Edit" data-action="menu-edit" data-id="${i.id}">Edit</button>
          <button class="btn sm danger" title="Hapus" data-action="menu-delete" data-id="${i.id}">Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function afterMenu() {
  const q = $('#menuQ');
  if (q) q.addEventListener('input', () => { menuState.q = q.value; $('#menuTableBody').innerHTML = menuTableRows(); const c = $('#menuCount'); if (c) c.textContent = menuFilteredItems().length + ' menu'; });
  const cat = $('#menuCat');
  if (cat) cat.addEventListener('change', () => { menuState.category = cat.value; $('#menuTableBody').innerHTML = menuTableRows(); const c = $('#menuCount'); if (c) c.textContent = menuFilteredItems().length + ' menu'; });
}

/* ---------------- Stok ---------------- */
function stockFilteredItems() {
  const q = stockState.q.trim().toLowerCase();
  return DB.items.filter((i) => {
    const okQ = !q || i.name.toLowerCase().includes(q);
    let okF = true;
    if (stockState.filter === 'low') okF = i.stock > 0 && i.stock <= LOW_STOCK;
    else if (stockState.filter === 'out') okF = i.stock <= 0;
    else if (stockState.filter === 'ready') okF = i.stock > LOW_STOCK;
    return okQ && okF;
  }).sort((a, b) => a.stock - b.stock);
}

function stockTableRows() {
  const items = stockFilteredItems();
  if (!items.length) return `<tr><td colspan="6">${emptyState('', 'Tidak ada data stok', 'Ubah filter atau kata kunci pencarian.')}</td></tr>`;
  return items.map((i) => {
    const cat = DB.categories.find((c) => c.id === i.categoryId);
    const pct = clamp((i.stock / 50) * 100, 0, 100);
    const tone = i.stock <= 0 ? 'red' : i.stock <= LOW_STOCK ? 'gold' : 'green';
    return `<tr>
      <td>
        <div class="cell-product">
          <span class="cell-icon">${esc(i.icon)}</span>
          <div><strong>${esc(i.name)}</strong><small>${esc(cat ? cat.name : '-')}</small></div>
        </div>
      </td>
      <td>
        <div class="stock-cell">
          <b>${i.stock} unit</b>
          <div class="stock-bar"><span class="${tone}" style="width:${Math.max(2, pct)}%"></span></div>
        </div>
      </td>
      <td><span class="badge ${tone}">${i.stock <= 0 ? 'Habis' : i.stock <= LOW_STOCK ? 'Menipis' : 'Aman'}</span></td>
      <td>
        <div class="restock-inline">
          <input id="restock-${i.id}" type="number" min="1" class="input sm" placeholder="+ qty">
          <button class="btn sm primary" data-action="stock-add" data-id="${i.id}">Tambah</button>
        </div>
      </td>
      <td><span class="badge ${i.status === 'tersedia' && i.stock > 0 ? 'green' : 'red'}">${i.status === 'tersedia' && i.stock > 0 ? 'Tersedia' : 'Habis'}</span></td>
      <td class="right"><button class="btn sm" title="Edit menu" data-action="menu-edit" data-id="${i.id}">Edit</button></td>
    </tr>`;
  }).join('');
}

function renderStock() {
  const totalUnits = sum(DB.items, (i) => i.stock);
  const low = DB.items.filter((i) => i.stock > 0 && i.stock <= LOW_STOCK).length;
  const out = DB.items.filter((i) => i.stock <= 0).length;
  const chips = [
    ['all', 'Semua'],
    ['low', 'Menipis'],
    ['out', 'Habis'],
    ['ready', 'Aman']
  ];
  return `
  <div class="kpi-grid">
    ${kpiCard('📦', 'blue', 'Total Menu', String(DB.items.length), `${totalUnits} unit stok`)}
    ${kpiCard('⚠️', 'gold', 'Stok Menipis', String(low), `batas ${LOW_STOCK} unit`)}
    ${kpiCard('🚫', 'red', 'Stok Habis', String(out), 'perlu segera diisi')}
    ${kpiCard('✅', 'green', 'Stok Aman', String(DB.items.length - low - out), 'siap dijual')}
  </div>

  <div class="filter-card card">
    <div class="filter-row">
      <label class="field-mini grow"><span>Cari menu</span><input id="stockQ" class="input" placeholder="Nama menu..." value="${esc(stockState.q)}"></label>
      <div class="chips">
        ${chips.map(([key, label]) => `<button class="chip${stockState.filter === key ? ' active' : ''}" data-action="stock-filter" data-filter="${key}">${label}</button>`).join('')}
      </div>
    </div>
  </div>

  <div class="card table-card">
    <div class="table-head"><h3>Daftar Stok</h3><span class="pill soft" id="stockCount">${stockFilteredItems().length} item</span></div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Menu</th><th>Stok</th><th>Status</th><th>Tambah Stok</th><th>Ketersediaan</th><th class="right">Aksi</th></tr></thead>
        <tbody id="stockTableBody">${stockTableRows()}</tbody>
      </table>
    </div>
  </div>`;
}

function afterStock() {
  const q = $('#stockQ');
  if (q) q.addEventListener('input', () => {
    stockState.q = q.value;
    $('#stockTableBody').innerHTML = stockTableRows();
    const c = $('#stockCount'); if (c) c.textContent = stockFilteredItems().length + ' item';
  });
}

/* ---------------- Pengguna ---------------- */
function renderUsers() {
  const txCount = (uid) => DB.transactions.filter((t) => t.cashierId === uid).length;
  return `
  <div class="filter-card card">
    <div class="filter-row">
      <div class="grow"><strong>Akun Pengguna</strong><p class="muted-note">Admin memiliki akses penuh; kasir hanya POS dan riwayat.</p></div>
      <div class="filter-actions"><button class="btn primary" data-action="user-add">+ Tambah Pengguna</button></div>
    </div>
  </div>

  <div class="card table-card">
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th class="right">Transaksi</th><th class="right">Aksi</th></tr></thead>
        <tbody>${DB.users.map((u) => `
          <tr>
            <td>
              <div class="cell-product">
                <span class="cell-icon small">${esc(u.name.charAt(0).toUpperCase())}</span>
                <strong>${esc(u.name)}${u.id === currentUser().id ? ' <small class="badge blue">Kamu</small>' : ''}</strong>
              </div>
            </td>
            <td><span class="mono">${esc(u.username)}</span></td>
            <td><span class="badge ${u.role === 'admin' ? 'blue' : 'gold'}">${u.role === 'admin' ? 'Admin' : 'Kasir'}</span></td>
            <td class="right">${txCount(u.id)}</td>
            <td class="right">
              <div class="row-actions">
                <button class="btn sm" title="Edit" data-action="user-edit" data-id="${u.id}">Edit</button>
                ${u.id !== currentUser().id ? `<button class="btn sm danger" title="Hapus" data-action="user-delete" data-id="${u.id}">Hapus</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ---------------- Pengaturan ---------------- */
function renderSettings() {
  const s = DB.settings;
  const theme = document.documentElement.dataset.theme || 'light';
  return `
  <div class="settings-grid">
    <section class="card">
      <div class="card-head"><div><h3>Profil Warung</h3><p>Tampil di struk & aplikasi</p></div></div>
      <div class="form-grid">
        <label class="field"><span>Nama warung</span><input id="setStoreName" class="input" value="${esc(s.storeName)}"></label>
        <label class="field"><span>Tagline</span><input id="setTagline" class="input" value="${esc(s.tagline)}"></label>
        <label class="field"><span>Alamat</span><input id="setAddress" class="input" value="${esc(s.address)}"></label>
        <label class="field"><span>Telepon</span><input id="setPhone" class="input" value="${esc(s.phone)}"></label>
        <label class="field"><span>Catatan kaki struk</span><input id="setFooter" class="input" value="${esc(s.footer)}"></label>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Pajak & Biaya</h3><p>Otomatis dihitung di kasir</p></div></div>
      <div class="form-grid two">
        <label class="field"><span>Pajak (%)</span><input id="setTaxPct" type="number" min="0" max="100" step="0.1" class="input" value="${s.taxPct}"></label>
        <label class="field"><span>Service charge (%)</span><input id="setServicePct" type="number" min="0" max="100" step="0.1" class="input" value="${s.servicePct}"></label>
      </div>
      <div class="settings-actions"><button class="btn primary" data-action="settings-save">Simpan Pengaturan</button></div>
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Tampilan</h3><p>Pilih tema aplikasi</p></div></div>
      <div class="theme-picker">
        <button class="theme-choice${theme === 'light' ? ' active' : ''}" data-action="theme-set" data-theme="light"><span>Terang</span></button>
        <button class="theme-choice${theme === 'dark' ? ' active' : ''}" data-action="theme-set" data-theme="dark"><span>Gelap</span></button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Data & Backup</h3><p>Semua data tersimpan di browser ini</p></div></div>
      <p class="muted-note">Ekspor data ke file JSON untuk backup, atau pulihkan dari backup. Anda juga bisa mereset ke data contoh.</p>
      <input type="file" id="restoreFile" accept="application/json,.json" hidden>
      <div class="settings-actions wrap">
        <button class="btn ghost" data-action="backup-download">Unduh Backup</button>
        <button class="btn ghost" data-action="backup-restore">Pulihkan Backup</button>
        <button class="btn danger" data-action="reset-data">Reset Data</button>
      </div>
      <div class="info-box">Aplikasi ini berjalan 100% di browser (localStorage). Jangan hapus data browser jika ingin menyimpan riwayat.</div>
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Tentang Aplikasi</h3><p>Ayam Kapuk Tenda Biru POS</p></div></div>
      <div class="about-list">
        <div><span>Versi</span><b>1.0.0</b></div>
        <div><span>Penyimpanan</span><b>localStorage</b></div>
        <div><span>Akun demo</span><b>admin / kasir</b></div>
        <div><span>Mata uang</span><b>Rupiah (IDR)</b></div>
      </div>
      <div class="info-box warning">Demi keamanan, ganti password akun demo sebelum dipakai di warung sungguhan.</div>
    </section>
  </div>`;
}

function afterSettings() {
  const file = $('#restoreFile');
  if (file) file.addEventListener('change', handleRestoreFile);
}
