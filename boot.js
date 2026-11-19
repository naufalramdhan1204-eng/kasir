'use strict';

/* ============================================================
   BOOT — Event delegation, halaman, dan inisialisasi
   ============================================================ */

const PAGES = {
  dashboard: { render: renderDashboard, after: afterDashboard },
  pos: { render: renderPOS, after: afterPOS },
  history: { render: renderHistory },
  reports: { render: renderReports, after: afterReports },
  menu: { render: renderMenu, after: afterMenu },
  stock: { render: renderStock, after: afterStock },
  users: { render: renderUsers },
  settings: { render: renderSettings, after: afterSettings }
};

function redrawCharts() {
  if (currentPage === 'dashboard' && document.getElementById('dashChart')) drawDashboardChart();
  if (currentPage === 'reports' && document.getElementById('reportChart')) drawReportChart();
}

function setPosCategory(cat) {
  posState.category = cat;
  $$('#posCategories .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === cat));
  renderPOSGrid();
}

function onGlobalClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = Number(el.dataset.id);

  switch (action) {
    case 'toggle-password': {
      const p = $('#loginPassword');
      if (p) p.type = p.type === 'password' ? 'text' : 'password';
      break;
    }
    case 'fill-demo': {
      $('#loginUsername').value = el.dataset.user;
      $('#loginPassword').value = el.dataset.pass;
      $('#loginError').hidden = true;
      $('#loginPassword').focus();
      break;
    }
    case 'go-login': {
      $('#landingView').hidden = true;
      $('#loginView').hidden = false;
      const u = $('#loginUsername');
      if (u) u.focus();
      break;
    }
    case 'back-landing': {
      $('#loginView').hidden = true;
      $('#landingView').hidden = false;
      break;
    }
    case 'forgot-pass': {
      toast('Akun dibuat pemilik warung lewat menu Pengguna. Untuk reset kata sandi, hubungi admin.', 'info');
      break;
    }
    case 'nav': goNav(el.dataset.page); break;
    case 'toggle-sidebar': {
      $('#sidebar').classList.toggle('open');
      $('#sidebarOverlay').classList.toggle('show');
      break;
    }
    case 'close-sidebar': closeSidebar(); break;
    case 'logout': logout(); break;
    case 'toggle-theme': {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      $$('.theme-choice').forEach((b) => b.classList.toggle('active', b.dataset.theme === next));
      redrawCharts();
      break;
    }
    case 'theme-set': {
      const theme = el.dataset.theme;
      applyTheme(theme);
      $$('.theme-choice').forEach((b) => b.classList.toggle('active', b.dataset.theme === theme));
      redrawCharts();
      break;
    }
    case 'toggle-user-menu': {
      const dd = $('#userDropdown');
      if (dd) dd.hidden = !dd.hidden;
      break;
    }
    case 'close-modal': closeModal(); break;
    case 'confirm-yes': {
      const cb = pendingConfirm;
      pendingConfirm = null;
      closeModal();
      if (cb) cb();
      break;
    }

    /* POS */
    case 'add-cart': addToCart(id); break;
    case 'qty-inc': changeQty(id, 1); break;
    case 'qty-dec': changeQty(id, -1); break;
    case 'qty-remove': removeFromCart(id); break;
    case 'clear-cart': clearCart(); break;
    case 'order-type': setOrderType(el.dataset.type); break;
    case 'payment': setPayment(el.dataset.method); break;
    case 'quick-cash': setCashAmount(el.dataset.amount); break;
    case 'checkout': checkout(); break;
    case 'pos-cat': setPosCategory(el.dataset.cat); break;
    case 'quick-new-tx': goNav('pos'); break;

    /* Transaksi */
    case 'tx-detail': openTransactionDetail(id); break;
    case 'tx-reprint': showReceipt(id); break;
    case 'tx-void': voidTransaction(id); break;
    case 'receipt-print': printReceipt(id); break;

    /* Riwayat & laporan */
    case 'history-apply': applyHistoryFilter(); break;
    case 'history-reset': resetHistoryFilter(); break;
    case 'history-preset': applyHistoryPreset(el.dataset.preset); break;
    case 'export-history': exportHistoryCSV(); break;
    case 'report-apply': applyReportFilter(); break;
    case 'report-preset': applyReportPreset(el.dataset.preset); break;
    case 'export-report': exportReportCSV(); break;
    case 'print-report': printReport(); break;

    /* Menu & kategori */
    case 'menu-add': openMenuForm(); break;
    case 'menu-edit': openMenuForm(id); break;
    case 'menu-delete': deleteMenuItem(id); break;
    case 'menu-toggle': toggleMenuAvailability(id); break;
    case 'cat-manage': openCategoryManager(); break;
    case 'cat-save': saveCategoryFromModal(id); break;
    case 'cat-del': deleteCategory(id); break;
    case 'go-menu': goNav('menu'); break;

    /* Stok */
    case 'stock-add': stockAdd(id); break;
    case 'stock-restock': restockQuick(id); break;
    case 'stock-filter': setStockFilter(el.dataset.filter); break;
    case 'quick-restock-set': setQuickRestockValue(Number(el.dataset.qty)); break;
    case 'go-stock': goNav('stock'); break;

    /* Pengguna */
    case 'user-add': openUserForm(); break;
    case 'user-edit': openUserForm(id); break;
    case 'user-delete': deleteUser(id); break;

    /* Pengaturan */
    case 'settings-save': saveSettings(); break;
    case 'backup-download': downloadBackup(); break;
    case 'backup-restore': {
      const input = $('#restoreFile');
      if (input) input.click();
      break;
    }
    case 'reset-data': resetData(); break;

    default: break;
  }
}

function onGlobalKey(e) {
  if (e.key === 'Escape') {
    if ($('#modalRoot') && $('#modalRoot').innerHTML.trim()) closeModal();
    const dd = $('#userDropdown');
    if (dd) dd.hidden = true;
    closeSidebar();
  }
}

function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  applyBranding();

  document.addEventListener('click', onGlobalClick);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      const dd = $('#userDropdown');
      if (dd) dd.hidden = true;
    }
  });
  document.addEventListener('keydown', onGlobalKey);
  window.addEventListener('resize', debounce(redrawCharts, 180));

  const loginForm = $('#loginForm');
  if (loginForm) loginForm.addEventListener('submit', onLoginSubmit);

  if (currentUser()) startApp();
  else {
    $('#landingView').hidden = false;
    $('#loginView').hidden = true;
    $('#appView').hidden = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
