'use strict';

/* ============================================================
   AKSI — Riwayat, Laporan, Menu, Stok, Pengguna, Pengaturan
   ============================================================ */

/* ---------------- Filter Riwayat & Laporan ---------------- */
function applyHistoryFilter() {
  historyState.from = $('#histFrom')?.value || historyState.from;
  historyState.to = $('#histTo')?.value || historyState.to;
  historyState.q = $('#histQ')?.value || '';
  historyState.payment = $('#histPayment')?.value || 'all';
  historyState.status = $('#histStatus')?.value || 'all';
  if (historyState.from > historyState.to) { const tmp = historyState.from; historyState.from = historyState.to; historyState.to = tmp; }
  goNav('history', true);
}
function resetHistoryFilter() {
  historyState.from = dateKey(addDays(new Date(), -29));
  historyState.to = dateKey();
  historyState.q = '';
  historyState.payment = 'all';
  historyState.status = 'all';
  goNav('history', true);
}
function applyHistoryPreset(preset) {
  const r = presetRange(preset);
  historyState.from = r.from;
  historyState.to = r.to;
  goNav('history', true);
}
function applyReportFilter() {
  reportState.from = $('#repFrom')?.value || reportState.from;
  reportState.to = $('#repTo')?.value || reportState.to;
  if (reportState.from > reportState.to) { const tmp = reportState.from; reportState.from = reportState.to; reportState.to = tmp; }
  goNav('reports', true);
}
function applyReportPreset(preset) {
  const r = presetRange(preset);
  reportState.from = r.from;
  reportState.to = r.to;
  goNav('reports', true);
}

/* ---------------- Menu CRUD ---------------- */
function openMenuForm(id) {
  const item = id ? DB.items.find((i) => i.id === id) : null;
  const data = item || { name: '', categoryId: DB.categories[0]?.id, price: '', stock: '', icon: '', desc: '', status: 'tersedia' };
  const body = `
    <form id="menuForm" class="form-grid">
      <label class="field"><span>Nama menu *</span><input id="menuName" class="input" required value="${esc(data.name)}" placeholder="mis. Ayam Gepuk Spesial"></label>
      <label class="field"><span>Kategori *</span>
        <select id="menuCategory" class="input" required>
          ${DB.categories.map((c) => `<option value="${c.id}"${c.id === data.categoryId ? ' selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}
        </select>
      </label>
      <div class="form-grid two">
        <label class="field"><span>Harga (Rp) *</span><input id="menuPrice" type="number" min="0" class="input" required value="${data.price}" placeholder="18000"></label>
        <label class="field"><span>Stok *</span><input id="menuStock" type="number" min="0" class="input" required value="${data.stock}" placeholder="20"></label>
      </div>
      <div class="form-grid two">
        <label class="field"><span>Ikon / Emoji</span><input id="menuIcon" class="input" maxlength="8" value="${esc(data.icon)}" placeholder="🍗"></label>
        <label class="field"><span>Status</span>
          <select id="menuStatus" class="input">
            <option value="tersedia"${data.status === 'tersedia' ? ' selected' : ''}>Tersedia</option>
            <option value="habis"${data.status === 'habis' ? ' selected' : ''}>Habis</option>
          </select>
        </label>
      </div>
      <label class="field"><span>Deskripsi</span><input id="menuDesc" class="input" value="${esc(data.desc || '')}" placeholder="Deskripsi singkat menu"></label>
      <div class="modal-form-actions">
        <button type="button" class="btn ghost" data-action="close-modal">Batal</button>
        <button type="submit" class="btn primary">${item ? 'Simpan Perubahan' : 'Tambahkan Menu'}</button>
      </div>
    </form>`;
  openModal(modalShell(item ? 'Edit Menu' : 'Tambah Menu', body, ''), 'wide');
  $('#menuForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#menuName').value.trim();
    const price = parseNum($('#menuPrice').value);
    const stock = Math.max(0, Math.floor(parseNum($('#menuStock').value)));
    if (!name) { toast('Nama menu wajib diisi.', 'error'); return; }
    if (price <= 0) { toast('Harga harus lebih dari 0.', 'error'); return; }
    let status = $('#menuStatus').value;
    if (status === 'tersedia' && stock <= 0) status = 'habis';
    const payload = {
      name,
      categoryId: Number($('#menuCategory').value),
      price,
      stock,
      icon: $('#menuIcon').value.trim() || '',
      desc: $('#menuDesc').value.trim(),
      status
    };
    if (item) {
      Object.assign(item, payload);
      toast('Menu diperbarui.', 'success');
    } else {
      DB.items.push(Object.assign({ id: nextId(DB.items) }, payload));
      toast('Menu baru ditambahkan.', 'success');
    }
    saveDB();
    closeModal();
    goNav(currentPage === 'stock' ? 'stock' : 'menu', true);
  });
}

function deleteMenuItem(id) {
  const item = DB.items.find((i) => i.id === id);
  if (!item) return;
  confirmDialog('Hapus Menu', `Menu "${item.name}" akan dihapus permanen. Riwayat transaksi lama tetap tersimpan. Lanjutkan?`, 'Ya, hapus', () => {
    DB.items = DB.items.filter((i) => i.id !== id);
    cart = cart.filter((c) => c.itemId !== id);
    saveDB();
    closeModal();
    toast(`Menu "${item.name}" dihapus.`, 'success');
    goNav(currentPage === 'stock' ? 'stock' : 'menu', true);
  });
}

function toggleMenuAvailability(id) {
  const item = DB.items.find((i) => i.id === id);
  if (!item) return;
  if (item.status === 'habis' && item.stock <= 0) {
    toast('Stok masih 0. Tambah stok terlebih dahulu.', 'error');
    return;
  }
  item.status = item.status === 'habis' ? 'tersedia' : 'habis';
  saveDB();
  toast(`${item.name} ditandai ${item.status === 'habis' ? 'habis' : 'tersedia'}.`, 'success');
  goNav(currentPage, true);
}

/* ---------------- Kategori ---------------- */
function openCategoryManager() {
  const rows = DB.categories.map((c) => {
    const count = DB.items.filter((i) => i.categoryId === c.id).length;
    return `<div class="cat-row">
      <span class="cat-icon">${esc(c.icon)}</span>
      <input id="catName-${c.id}" class="input sm" value="${esc(c.name)}">
      <span class="badge ${count ? 'soft' : 'gold'}">${count} menu</span>
      <button class="btn sm" data-action="cat-save" data-id="${c.id}">Simpan</button>
      <button class="btn sm danger" data-action="cat-del" data-id="${c.id}" ${count > 0 ? 'disabled title="Masih dipakai menu"' : 'title="Hapus kategori"'}>Hapus</button>
    </div>`;
  }).join('');
  const body = `
    <form id="catAddForm" class="inline-form">
      <input id="newCatName" class="input" placeholder="Nama kategori baru" autocomplete="off">
      <button type="submit" class="btn primary">+ Tambah</button>
    </form>
    <div class="cat-list">${rows || '<p class="muted-note">Belum ada kategori.</p>'}</div>`;
  openModal(modalShell('Kelola Kategori', body, '<button class="btn ghost" data-action="close-modal">Selesai</button>'), 'wide');
  $('#catAddForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#newCatName').value.trim();
    if (!name) { toast('Nama kategori wajib diisi.', 'error'); return; }
    if (DB.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast('Kategori sudah ada.', 'error'); return; }
    DB.categories.push({ id: nextId(DB.categories), name, icon: '' });
    saveDB();
    openCategoryManager();
    toast('Kategori ditambahkan.', 'success');
  });
}

function saveCategoryFromModal(id) {
  const cat = DB.categories.find((c) => c.id === id);
  const input = document.getElementById('catName-' + id);
  if (!cat || !input) return;
  const name = input.value.trim();
  if (!name) { toast('Nama kategori tidak boleh kosong.', 'error'); return; }
  if (DB.categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) { toast('Nama kategori sudah dipakai.', 'error'); return; }
  cat.name = name;
  saveDB();
  openCategoryManager();
  toast('Kategori diperbarui.', 'success');
}

function deleteCategory(id) {
  const cat = DB.categories.find((c) => c.id === id);
  if (!cat) return;
  const used = DB.items.filter((i) => i.categoryId === id).length;
  if (used > 0) { toast(`Kategori masih dipakai ${used} menu. Pindahkan menu terlebih dahulu.`, 'error'); return; }
  if (DB.categories.length <= 1) { toast('Minimal harus ada satu kategori.', 'error'); return; }
  confirmDialog('Hapus Kategori', `Kategori "${cat.name}" akan dihapus. Lanjutkan?`, 'Ya, hapus', () => {
    DB.categories = DB.categories.filter((c) => c.id !== id);
    saveDB();
    closeModal();
    openCategoryManager();
    toast('Kategori dihapus.', 'success');
  });
}

/* ---------------- Stok ---------------- */
function setStockFilter(filter) {
  stockState.filter = filter;
  goNav('stock', true);
}

function stockAdd(id) {
  const item = DB.items.find((i) => i.id === id);
  const input = document.getElementById('restock-' + id);
  if (!item || !input) return;
  const qty = Math.floor(parseNum(input.value));
  if (qty <= 0) { toast('Masukkan jumlah stok yang valid.', 'error'); return; }
  item.stock += qty;
  if (item.stock > 0 && item.status === 'habis') item.status = 'tersedia';
  saveDB();
  toast(`+${qty} stok untuk ${item.name}.`, 'success');
  goNav('stock', true);
}

function restockQuick(id) {
  const item = DB.items.find((i) => i.id === id);
  if (!item) return;
  const body = `
    <div class="restock-head">
      <span class="cell-icon">${esc(item.icon)}</span>
      <div><strong>${esc(item.name)}</strong><small>Stok saat ini: ${item.stock} unit</small></div>
    </div>
    <form id="quickRestockForm" class="form-grid">
      <label class="field"><span>Jumlah tambahan stok</span>
        <input id="quickRestockQty" type="number" min="1" class="input" value="10" required>
      </label>
      <div class="quick-cash">
        <button type="button" data-action="quick-restock-set" data-qty="5">+5</button>
        <button type="button" data-action="quick-restock-set" data-qty="10">+10</button>
        <button type="button" data-action="quick-restock-set" data-qty="25">+25</button>
        <button type="button" data-action="quick-restock-set" data-qty="50">+50</button>
      </div>
      <div class="modal-form-actions">
        <button type="button" class="btn ghost" data-action="close-modal">Batal</button>
        <button type="submit" class="btn primary">Tambah Stok</button>
      </div>
    </form>`;
  openModal(modalShell('Tambah Stok', body, ''), 'sm');
  $('#quickRestockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const qty = Math.floor(parseNum($('#quickRestockQty').value));
    if (qty <= 0) { toast('Jumlah stok tidak valid.', 'error'); return; }
    item.stock += qty;
    if (item.status === 'habis' && item.stock > 0) item.status = 'tersedia';
    saveDB();
    closeModal();
    toast(`+${qty} stok untuk ${item.name}.`, 'success');
    goNav('stock', true);
  });
}

/* ---------------- Pengguna ---------------- */
function openUserForm(id) {
  const user = id ? DB.users.find((u) => u.id === id) : null;
  const data = user || { name: '', username: '', password: '', role: 'kasir' };
  const body = `
    <form id="userForm" class="form-grid">
      <label class="field"><span>Nama lengkap *</span><input id="userFullName" class="input" required value="${esc(data.name)}" placeholder="Nama pengguna"></label>
      <label class="field"><span>Username *</span><input id="userUsername" class="input" required value="${esc(data.username)}" placeholder="username" autocomplete="off"></label>
      <div class="form-grid two">
        <label class="field"><span>Password ${user ? '(kosongkan jika tetap)' : '*'}</span><input id="userPassword" type="text" class="input" value="" placeholder="${user ? '••••••' : 'minimal 4 karakter'}" ${user ? '' : 'required'}></label>
        <label class="field"><span>Peran *</span>
          <select id="userRoleInput" class="input">
            <option value="kasir"${data.role === 'kasir' ? ' selected' : ''}>Kasir</option>
            <option value="admin"${data.role === 'admin' ? ' selected' : ''}>Admin / Pemilik</option>
          </select>
        </label>
      </div>
      <div class="modal-form-actions">
        <button type="button" class="btn ghost" data-action="close-modal">Batal</button>
        <button type="submit" class="btn primary">${user ? 'Simpan Perubahan' : 'Tambah Pengguna'}</button>
      </div>
    </form>`;
  openModal(modalShell(user ? 'Edit Pengguna' : 'Tambah Pengguna', body, ''), 'wide');
  $('#userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#userFullName').value.trim();
    const username = $('#userUsername').value.trim();
    const password = $('#userPassword').value;
    const role = $('#userRoleInput').value;
    if (!name || !username) { toast('Nama dan username wajib diisi.', 'error'); return; }
    if (DB.users.some((u) => u.id !== (user ? user.id : -1) && u.username.toLowerCase() === username.toLowerCase())) {
      toast('Username sudah digunakan.', 'error');
      return;
    }
    if (!user && password.length < 4) { toast('Password minimal 4 karakter.', 'error'); return; }
    if (user) {
      user.name = name;
      user.username = username;
      user.role = role;
      if (password) user.password = password;
      toast('Data pengguna diperbarui.', 'success');
    } else {
      DB.users.push({ id: nextId(DB.users), name, username, password, role });
      toast('Pengguna baru ditambahkan.', 'success');
    }
    saveDB();
    closeModal();
    refreshUserUI();
    goNav('users', true);
  });
}

function deleteUser(id) {
  const user = DB.users.find((u) => u.id === id);
  if (!user) return;
  if (user.id === currentUser().id) { toast('Tidak bisa menghapus akun sendiri.', 'error'); return; }
  const adminCount = DB.users.filter((u) => u.role === 'admin').length;
  if (user.role === 'admin' && adminCount <= 1) { toast('Minimal harus ada satu admin.', 'error'); return; }
  confirmDialog('Hapus Pengguna', `Akun "${user.name}" akan dihapus. Riwayat transaksi tetap tersimpan. Lanjutkan?`, 'Ya, hapus', () => {
    DB.users = DB.users.filter((u) => u.id !== id);
    saveDB();
    closeModal();
    toast('Pengguna dihapus.', 'success');
    goNav('users', true);
  });
}

/* ---------------- Pengaturan & Backup ---------------- */
function saveSettings() {
  const name = $('#setStoreName').value.trim();
  if (!name) { toast('Nama warung wajib diisi.', 'error'); return; }
  DB.settings.storeName = name;
  DB.settings.tagline = $('#setTagline').value.trim();
  DB.settings.address = $('#setAddress').value.trim();
  DB.settings.phone = $('#setPhone').value.trim();
  DB.settings.footer = $('#setFooter').value.trim();
  DB.settings.taxPct = clamp(parseNum($('#setTaxPct').value), 0, 100);
  DB.settings.servicePct = clamp(parseNum($('#setServicePct').value), 0, 100);
  saveDB();
  applyBranding();
  goNav('settings', true);
  toast('Pengaturan disimpan.', 'success');
}

function downloadBackup() {
  downloadFile(`backup-ayam-kapuk-${dateKey()}.json`, JSON.stringify(DB, null, 2), 'application/json');
  toast('Backup data diunduh.', 'success');
}

function handleRestoreFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      toast('File backup tidak valid.', 'error');
      return;
    }
    if (!data || !Array.isArray(data.users) || !Array.isArray(data.items) || !Array.isArray(data.categories)) {
      toast('Struktur file backup tidak dikenali.', 'error');
      return;
    }
    confirmDialog('Pulihkan Backup', 'Data saat ini akan diganti dengan isi file backup. Tindakan ini tidak bisa dibatalkan. Lanjutkan?', 'Ya, pulihkan', () => {
      if (!data.settings) data.settings = DB.settings;
      if (!Array.isArray(data.transactions)) data.transactions = [];
      DB = data;
      saveDB();
      localStorage.removeItem(SESSION_KEY);
      location.reload();
    });
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetData() {
  confirmDialog('Reset Semua Data', 'Seluruh transaksi, menu, pengguna, dan pengaturan akan dikembalikan ke data contoh. Semua perubahan akan hilang. Lanjutkan?', 'Ya, reset', () => {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

function setQuickRestockValue(qty) {
  const input = $('#quickRestockQty');
  if (input) input.value = qty;
}
