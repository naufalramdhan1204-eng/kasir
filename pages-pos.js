'use strict';

/* ============================================================
   HALAMAN — Dashboard & Kasir (POS)
   ============================================================ */

function renderDashboard() {
  const u = currentUser();
  const todayKey = dateKey();
  const yKey = dateKey(addDays(new Date(), -1));
  const paidTx = DB.transactions.filter((t) => t.status !== 'void');
  const todayTx = paidTx.filter((t) => t.dateKey === todayKey);
  const yTx = paidTx.filter((t) => t.dateKey === yKey);
  const rev = sum(todayTx, (t) => t.total);
  const yRev = sum(yTx, (t) => t.total);
  const itemsSold = sum(todayTx, (t) => sum(t.items, (i) => i.qty));
  const avg = todayTx.length ? rev / todayTx.length : 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => dateKey(addDays(new Date(), i - 6)));
  const weekTotal = sum(paidTx.filter((t) => weekDays.includes(t.dateKey)), (t) => t.total);
  const tops = topItems(weekDays[0], weekDays[6], 5);
  const maxTop = tops.length ? tops[0].qty : 1;
  const recent = [...DB.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const lowItems = DB.items.filter((i) => i.stock <= LOW_STOCK).sort((a, b) => a.stock - b.stock).slice(0, 6);

  return `
  <div class="hero-card">
    <div class="hero-copy">
      <span class="hero-eyebrow">${greeting()}</span>
      <h2>${esc(u.name.split(' ')[0])}, siap jualan hari ini?</h2>
      <p>${todayLong()} • ${esc(DB.settings.tagline)}</p>
    </div>
    <div class="hero-actions">
      <button class="btn primary" data-action="quick-new-tx">Transaksi Baru</button>
      <button class="btn ghost" data-action="go-menu">Kelola Menu</button>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiCard('💰', 'red', 'Omzet Hari Ini', rupiah(rev), trendText(rev, yRev))}
    ${kpiCard('🧾', 'blue', 'Transaksi Hari Ini', String(todayTx.length), `${itemsSold} item terjual`)}
    ${kpiCard('🍗', 'green', 'Menu Terjual', String(itemsSold), 'porsi hari ini')}
    ${kpiCard('📊', 'gold', 'Rata-rata / Transaksi', rupiah(avg), `${todayTx.length} transaksi`)}
  </div>

  <div class="dash-grid">
    <section class="card chart-card">
      <div class="card-head">
        <div><h3>Penjualan 7 Hari</h3><p>Omzet harian warung</p></div>
        <span class="pill">${rupiah(weekTotal)}</span>
      </div>
      <div class="chart-wrap"><canvas id="dashChart"></canvas></div>
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Menu Terlaris</h3><p>7 hari terakhir</p></div><span class="pill soft">Top 5</span></div>
      ${tops.length ? `<div class="rank-list">${tops.map((t, i) => `
        <div class="rank-row">
          <span class="rank-no ${i === 0 ? 'first' : ''}">${i + 1}</span>
          <span class="rank-icon">${esc(t.icon || '')}</span>
          <div class="rank-main">
            <div class="rank-name">${esc(t.name)}</div>
            <div class="rank-bar"><span style="width:${Math.max(6, (t.qty / maxTop) * 100)}%"></span></div>
          </div>
          <div class="rank-val"><b>${t.qty}</b><small>${rupiah(t.revenue)}</small></div>
        </div>`).join('')}</div>` : emptyState('', 'Belum ada penjualan', 'Transaksi 7 hari terakhir akan muncul di sini.')}
    </section>
  </div>

  <div class="dash-grid second">
    <section class="card">
      <div class="card-head"><div><h3>Transaksi Terbaru</h3><p>6 transaksi terakhir</p></div><button class="link-btn" data-action="nav" data-page="history">Lihat semua →</button></div>
      ${recent.length ? `<div class="mini-list">${recent.map((t) => `
        <button class="mini-tx" data-action="tx-detail" data-id="${t.id}">
          <span class="mini-emoji">${esc(t.items[0]?.icon || '')}</span>
          <div class="mini-main">
            <strong>${esc(t.customer || 'Pelanggan Umum')}</strong>
            <small>${esc(t.invoice)} • ${fmtTime(t.date)}</small>
          </div>
          <div class="mini-right">
            <b>${rupiah(t.total)}</b>
            <span class="badge ${t.status === 'void' ? 'red' : 'green'}">${t.status === 'void' ? 'Dibatalkan' : 'Lunas'}</span>
          </div>
        </button>`).join('')}</div>` : emptyState('', 'Belum ada transaksi', 'Mulai transaksi pertama dari menu Kasir.')}
    </section>

    <section class="card">
      <div class="card-head"><div><h3>Stok Menipis</h3><p>≤ ${LOW_STOCK} unit tersisa</p></div><button class="link-btn" data-action="go-stock">Kelola stok →</button></div>
      ${lowItems.length ? `<div class="mini-list">${lowItems.map((i) => `
        <div class="mini-tx static">
          <span class="mini-emoji">${esc(i.icon)}</span>
          <div class="mini-main">
            <strong>${esc(i.name)}</strong>
            <small>${i.stock <= 0 ? 'Stok habis' : 'Sisa ' + i.stock + ' unit'}</small>
          </div>
          <div class="mini-right">
            <span class="badge ${i.stock <= 0 ? 'red' : 'gold'}">${i.stock <= 0 ? 'Habis' : i.stock + ' unit'}</span>
            <button class="btn sm" data-action="stock-restock" data-id="${i.id}">+ Stok</button>
          </div>
        </div>`).join('')}</div>` : emptyState('', 'Stok aman', 'Semua menu berada di atas batas minimum.')}
    </section>
  </div>`;
}

function afterDashboard() { drawDashboardChart(); }

function drawDashboardChart() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const values = days.map((d) => sum(DB.transactions.filter((t) => t.status !== 'void' && t.dateKey === dateKey(d)), (t) => t.total));
  const labels = days.map((d) => d.toLocaleDateString('id-ID', { weekday: 'short' }));
  drawBarChart('dashChart', labels, values);
}

/* ---------------- POS ---------------- */
function cartDetails() {
  const rows = cart.map((c) => {
    const item = DB.items.find((i) => i.id === c.itemId);
    return item ? { item, qty: c.qty, subtotal: item.price * c.qty } : null;
  }).filter(Boolean);
  const subtotal = sum(rows, (r) => r.subtotal);
  let discount = 0;
  if (posState.discountType === 'pct') {
    discount = Math.round(subtotal * (clamp(parseNum(posState.discountValue), 0, 100) / 100));
  } else {
    discount = Math.min(subtotal, Math.max(0, Math.round(parseNum(posState.discountValue))));
  }
  const afterDisc = subtotal - discount;
  const taxPct = Number(DB.settings.taxPct) || 0;
  const servicePct = Number(DB.settings.servicePct) || 0;
  const tax = Math.round(afterDisc * taxPct / 100);
  const service = Math.round(afterDisc * servicePct / 100);
  return { rows, subtotal, discount, tax, service, total: afterDisc + tax + service };
}

function renderPOS() {
  const u = currentUser();
  const payBtn = (method, label) =>
    `<button data-action="payment" data-method="${method}" class="pay-btn${posState.payment === method ? ' active' : ''}"><span>${label}</span></button>`;

  return `
  <div class="pos-layout">
    <section class="pos-catalog">
      <div class="pos-toolbar">
        <div class="search-box">
          <input id="posSearch" placeholder="Cari menu..." value="${esc(posState.search)}" autocomplete="off">
        </div>
        <span class="pos-count" id="posCount"></span>
      </div>
      <div class="chips" id="posCategories"></div>
      <div class="product-grid" id="posGrid"></div>
    </section>

    <aside class="cart-panel" id="cartPanel">
      <div class="cart-head">
        <div><h3>Pesanan</h3><small id="cartCountLabel">0 item</small></div>
        <button class="btn ghost sm" data-action="clear-cart">Kosongkan</button>
      </div>
      <div class="order-meta">
        <div class="seg" id="orderTypeSeg">
          <button data-action="order-type" data-type="dinein" class="${posState.orderType === 'dinein' ? 'active' : ''}">Dine In</button>
          <button data-action="order-type" data-type="takeaway" class="${posState.orderType === 'takeaway' ? 'active' : ''}">Take Away</button>
        </div>
        <input id="custName" class="input" placeholder="Nama pelanggan (opsional)" value="${esc(posState.customer)}" autocomplete="off">
      </div>
      <div class="cart-items" id="cartItems"></div>
      <div class="cart-note">
        <input id="orderNote" class="input sm" placeholder="Catatan pesanan, mis. tanpa sambal" value="${esc(posState.note)}" autocomplete="off">
      </div>
      <div class="cart-summary">
        <div class="sum-row"><span>Subtotal</span><b id="sumSubtotal">Rp 0</b></div>
        <div class="discount-row">
          <select id="discountType" class="input sm">
            <option value="nom"${posState.discountType === 'nom' ? ' selected' : ''}>Diskon Rp</option>
            <option value="pct"${posState.discountType === 'pct' ? ' selected' : ''}>Diskon %</option>
          </select>
          <input id="discountValue" type="number" min="0" step="any" class="input sm" placeholder="0" value="${posState.discountValue || ''}">
        </div>
        <div class="sum-row discount" id="sumDiscountRow" hidden><span>Diskon</span><b id="sumDiscount">Rp 0</b></div>
        <div class="sum-row" id="sumServiceRow" hidden><span>Service <small id="sumServicePct"></small></span><b id="sumService">Rp 0</b></div>
        <div class="sum-row" id="sumTaxRow" hidden><span>Pajak <small id="sumTaxPct"></small></span><b id="sumTax">Rp 0</b></div>
        <div class="sum-row total"><span>Total Bayar</span><b id="sumTotal">Rp 0</b></div>
      </div>
      <div class="pay-box">
        <p class="pay-label">Metode pembayaran</p>
        <div class="pay-methods" id="payMethods">
          ${payBtn('cash', 'Cash')}
          ${payBtn('qris', 'QRIS')}
          ${payBtn('debit', 'Debit')}
        </div>
        <div id="cashBox" class="cash-box">
          <label class="field-mini"><span>Uang diterima</span>
            <input id="cashPaid" type="number" min="0" class="input" placeholder="0" value="${posState.cashPaid || ''}">
          </label>
          <div class="quick-cash">
            <button data-action="quick-cash" data-amount="exact">Uang Pas</button>
            <button data-action="quick-cash" data-amount="50000">50rb</button>
            <button data-action="quick-cash" data-amount="100000">100rb</button>
            <button data-action="quick-cash" data-amount="150000">150rb</button>
          </div>
          <div class="change-row"><span>Kembalian</span><b id="changeText">Rp 0</b></div>
        </div>
        <button id="checkoutBtn" class="btn primary block big" data-action="checkout">Bayar Sekarang</button>
        <p class="cashier-note">Kasir: ${esc(u.name)}</p>
      </div>
    </aside>
  </div>`;
}

function afterPOS() {
  renderPOSCategories();
  renderPOSGrid();
  renderPOSCart();
  updatePOSPaymentUI();
  bindPOSInputs();
}

function bindPOSInputs() {
  const search = $('#posSearch');
  if (search) search.addEventListener('input', () => { posState.search = search.value; renderPOSGrid(); });
  const cust = $('#custName');
  if (cust) cust.addEventListener('input', () => { posState.customer = cust.value; });
  const note = $('#orderNote');
  if (note) note.addEventListener('input', () => { posState.note = note.value; });
  const dt = $('#discountType');
  if (dt) dt.addEventListener('change', () => { posState.discountType = dt.value; updatePOSTotals(); });
  const dv = $('#discountValue');
  if (dv) dv.addEventListener('input', () => { posState.discountValue = parseNum(dv.value); updatePOSTotals(); });
  const cash = $('#cashPaid');
  if (cash) cash.addEventListener('input', () => { posState.cashPaid = parseNum(cash.value); updatePOSTotals(); });
}

function renderPOSCategories() {
  const wrap = $('#posCategories');
  if (!wrap) return;
  const all = `<button class="chip${posState.category === 'all' ? ' active' : ''}" data-action="pos-cat" data-cat="all">Semua</button>`;
  wrap.innerHTML = all + DB.categories.map((c) =>
    `<button class="chip${posState.category === String(c.id) ? ' active' : ''}" data-action="pos-cat" data-cat="${c.id}">${esc(c.icon)} ${esc(c.name)}</button>`
  ).join('');
}

function renderPOSGrid() {
  const grid = $('#posGrid');
  if (!grid) return;
  const q = posState.search.trim().toLowerCase();
  const items = DB.items.filter((i) => {
    const okCat = posState.category === 'all' || i.categoryId === Number(posState.category);
    const okQ = !q || i.name.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q);
    return okCat && okQ;
  });
  const count = $('#posCount');
  if (count) count.textContent = `${items.length} menu`;
  if (!items.length) {
    grid.innerHTML = emptyState('', 'Menu tidak ditemukan', 'Coba kata kunci atau kategori lain.');
    return;
  }
  grid.innerHTML = items.map((i) => {
    const out = i.status === 'habis' || i.stock <= 0;
    const low = !out && i.stock <= LOW_STOCK;
    return `<button class="product-card${out ? ' soldout' : ''}" data-action="add-cart" data-id="${i.id}" ${out ? 'disabled' : ''} title="${esc(i.name)}">
      <span class="product-emoji">${esc(i.icon)}</span>
      <span class="product-name">${esc(i.name)}</span>
      <span class="product-price">${rupiah(i.price)}</span>
      <span class="product-stock${low ? ' low' : ''}">${out ? 'Habis' : 'Stok ' + i.stock}</span>
      ${out ? '<span class="soldout-tag">HABIS</span>' : '<span class="add-fab">+</span>'}
    </button>`;
  }).join('');
}

function renderPOSCart() {
  const wrap = $('#cartItems');
  if (!wrap) return;
  const d = cartDetails();
  if (!d.rows.length) {
    wrap.innerHTML = `<div class="cart-empty"><p>Keranjang kosong</p><small>Pilih menu di sebelah kiri untuk mulai.</small></div>`;
  } else {
    wrap.innerHTML = d.rows.map((r) => `
      <div class="cart-item">
        <span class="ci-icon">${esc(r.item.icon)}</span>
        <div class="ci-main">
          <div class="ci-name">${esc(r.item.name)}</div>
          <div class="ci-price">${rupiah(r.item.price)}</div>
        </div>
        <div class="qty-ctrl">
          <button data-action="qty-dec" data-id="${r.item.id}" aria-label="Kurangi">−</button>
          <span>${r.qty}</span>
          <button data-action="qty-inc" data-id="${r.item.id}" aria-label="Tambah">+</button>
        </div>
        <div class="ci-sub">${rupiah(r.subtotal)}</div>
        <button class="ci-del" data-action="qty-remove" data-id="${r.item.id}" title="Hapus">✕</button>
      </div>`).join('');
  }
  const cc = $('#cartCountLabel');
  if (cc) cc.textContent = sum(d.rows, (r) => r.qty) + ' item';
  updatePOSTotals();
}

function updatePOSTotals() {
  const d = cartDetails();
  const set = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
  set('#sumSubtotal', rupiah(d.subtotal));
  const dr = $('#sumDiscountRow');
  if (dr) dr.hidden = d.discount <= 0;
  set('#sumDiscount', d.discount > 0 ? '- ' + rupiah(d.discount) : rupiah(0));

  const servicePct = Number(DB.settings.servicePct) || 0;
  const taxPct = Number(DB.settings.taxPct) || 0;
  const sr = $('#sumServiceRow');
  if (sr) sr.hidden = servicePct <= 0;
  set('#sumServicePct', servicePct ? `(${servicePct}%)` : '');
  set('#sumService', rupiah(d.service));
  const tr = $('#sumTaxRow');
  if (tr) tr.hidden = taxPct <= 0;
  set('#sumTaxPct', taxPct ? `(${taxPct}%)` : '');
  set('#sumTax', rupiah(d.tax));
  set('#sumTotal', rupiah(d.total));

  const btn = $('#checkoutBtn');
  if (btn) btn.disabled = d.rows.length === 0;

  const changeEl = $('#changeText');
  if (changeEl) {
    if (posState.payment !== 'cash') {
      changeEl.textContent = rupiah(0);
      changeEl.className = '';
    } else {
      const paid = parseNum(posState.cashPaid);
      const diff = paid - d.total;
      if (paid <= 0) { changeEl.textContent = rupiah(0); changeEl.className = ''; }
      else if (diff < 0) { changeEl.textContent = 'Kurang ' + rupiah(Math.abs(diff)); changeEl.className = 'neg'; }
      else { changeEl.textContent = rupiah(diff); changeEl.className = 'pos'; }
    }
  }
}

function updatePOSPaymentUI() {
  $$('#payMethods .pay-btn').forEach((b) => b.classList.toggle('active', b.dataset.method === posState.payment));
  const cashBox = $('#cashBox');
  if (cashBox) cashBox.hidden = posState.payment !== 'cash';
  updatePOSTotals();
}
