'use strict';

/* ============================================================
   CORE — Tema, Autentikasi, Navigasi, Komponen
   ============================================================ */

function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  const btn = $('#themeToggle');
  if (btn) btn.textContent = t === 'dark' ? 'Terang' : 'Gelap';
}

function applyBranding() {
  $$('[data-brand]').forEach((el) => { el.textContent = DB.settings.storeName; });
  $$('[data-tagline]').forEach((el) => { el.textContent = DB.settings.tagline; });
  document.title = DB.settings.storeName + ' \u2014 Kasir';
}

/* ---------------- Auth ---------------- */
function onLoginSubmit(e) {
  e.preventDefault();
  const username = $('#loginUsername').value.trim().toLowerCase();
  const password = $('#loginPassword').value;
  const user = DB.users.find((u) => u.username.toLowerCase() === username && u.password === password);
  const err = $('#loginError');
  if (!user) {
    err.textContent = 'Username atau password salah. Coba akun demo di bawah.';
    err.hidden = false;
    const card = $('.login-card');
    if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    return;
  }
  err.hidden = true;
  session = { userId: user.id, at: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  startApp();
  toast(`Selamat datang, ${user.name}!`, 'success');
}

function logout() {
  session = null;
  localStorage.removeItem(SESSION_KEY);
  closeModal();
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
  $('#loginPassword').value = '';
  $('#loginError').hidden = true;
  closeSidebar();
  toast('Kamu telah keluar.', 'info');
}

function startApp() {
  const user = currentUser();
  if (!user) { logout(); return; }
  $('#loginView').hidden = true;
  const landing = $('#landingView');
  if (landing) landing.hidden = true;
  $('#appView').hidden = false;
  buildNav();
  refreshUserUI();
  applyBranding();
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  const chip = $('#todayChip');
  if (chip) chip.textContent = todayLong();
  goNav(user.role === 'admin' ? 'dashboard' : 'pos', true);
}

function refreshUserUI() {
  const u = currentUser();
  if (!u) return;
  const initial = u.name.trim().charAt(0).toUpperCase() || 'U';
  const roleLabel = u.role === 'admin' ? 'Admin / Pemilik' : 'Kasir';
  const ids = { userAvatar: initial, sideAvatar: initial, userName: u.name, userRole: roleLabel, sideName: u.name, sideRole: roleLabel };
  Object.entries(ids).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
}

function buildNav() {
  const u = currentUser();
  if (!u) return;
  $('#nav').innerHTML = NAV.filter((n) => n.roles.includes(u.role))
    .map((n) => `<button class="nav-item" data-action="nav" data-page="${n.key}">
        <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
      </button>`).join('');
  if (u.role === 'kasir') {
    $('#nav').insertAdjacentHTML('beforeend', '<div class="nav-note">Mode kasir aktif. Menu admin disembunyikan.</div>');
  }
}

/* ---------------- Router ---------------- */
function goNav(page, replace) {
  const u = currentUser();
  let target = NAV.find((n) => n.key === page);
  if (!u || !target || !target.roles.includes(u.role)) {
    page = u && u.role === 'admin' ? 'dashboard' : 'pos';
    target = NAV.find((n) => n.key === page);
  }
  currentPage = page;
  $$('#nav .nav-item').forEach((el) => el.classList.toggle('active', el.dataset.page === page));
  $('#pageTitle').textContent = target.label;
  $('#pageSubtitle').textContent = target.sub;
  const content = $('#content');
  const pageObj = PAGES[page];
  content.innerHTML = pageObj.render();
  content.classList.remove('page-anim');
  void content.offsetWidth;
  content.classList.add('page-anim');
  if (!replace) window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pageObj.after) pageObj.after();
  closeSidebar();
}
const go = goNav;

function closeSidebar() {
  $('#sidebar')?.classList.remove('open');
  $('#sidebarOverlay')?.classList.remove('show');
}

/* ---------------- Komponen kecil ---------------- */
function kpiCard(icon, tone, label, value, sub) {
  return `<div class="kpi-card">
    ${icon ? `<div class="kpi-icon ${tone}">${icon}</div>` : ''}
    <div class="kpi-body">
      <span class="kpi-label">${esc(label)}</span>
      <strong class="kpi-value">${value}</strong>
      <span class="kpi-sub">${sub}</span>
    </div>
  </div>`;
}

function trendText(today, yest) {
  if (yest > 0) {
    const pct = ((today - yest) / yest) * 100;
    const cls = pct >= 0 ? 'up' : 'down';
    const arrow = pct >= 0 ? '\u25B2' : '\u25BC';
    return `<span class="trend ${cls}">${arrow} ${Math.abs(pct).toFixed(0)}%</span> dari kemarin`;
  }
  if (today > 0) return '<span class="trend up">\u25B2 Baru hari ini</span>';
  return 'Belum ada transaksi';
}
