'use strict';

/* ============================================================
   UI HELPERS — Modal, Toast, Chart, Components
   ============================================================ */

function toast(message, type = 'info') {
  const wrap = $('#toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<p>${esc(message)}</p>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

function emptyState(icon, title, desc, action) {
  return `<div class="empty-state">${icon ? `<span class="empty-emoji">${icon}</span>` : ''}<strong>${esc(title)}</strong><p>${esc(desc)}</p>${action ? `<div class="empty-action">${action}</div>` : ''}</div>`;
}

function openModal(html, sizeClass) {
  const root = $('#modalRoot');
  if (!root) return;
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div><div class="modal${sizeClass ? ' ' + sizeClass : ''}">${html}</div>`;
  document.body.classList.add('modal-open');
}
function closeModal() {
  const root = $('#modalRoot');
  if (root) root.innerHTML = '';
  document.body.classList.remove('modal-open');
  pendingConfirm = null;
}
function modalShell(title, body, footer, sizeClass) {
  return `<div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-action="close-modal" aria-label="Tutup">✕</button></div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-foot">${footer}</div>` : ''}`;
}
function confirmDialog(title, message, okLabel, onOk, danger = true) {
  pendingConfirm = onOk;
  openModal(modalShell(
    title,
    `<div class="confirm-body"><p>${esc(message)}</p></div>`,
    `<button class="btn ghost" data-action="close-modal">Batal</button><button class="btn ${danger ? 'danger' : 'primary'}" data-action="confirm-yes">${esc(okLabel || 'Ya, lanjutkan')}</button>`,
    'sm'
  ), 'sm');
}

/* Chart sederhana (bar) tanpa library */
function drawBarChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const H = Math.max(140, Math.round(rect.height) || 220);
  canvas.width = rect.width * dpr;
  canvas.height = H * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  const W = rect.width, pad = 36, top = 16, bot = 28;
  ctx.clearRect(0, 0, W, H);
  if (!values.length) return;
  const max = Math.max(1, ...values);
  const barW = Math.min(38, (W - pad * 2) / values.length - 10);
  const gap = (W - pad * 2 - barW * values.length) / Math.max(1, values.length - 1);
  values.forEach((v, i) => {
    const x = pad + i * (barW + gap);
    const h = (v / max) * (H - top - bot);
    const y = H - bot - h;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#1e4e8c';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, h, [3, 3, 0, 0]) : (function(){ ctx.rect(x,y,barW,h); })();
    ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
    ctx.font = '11px Segoe UI, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 10);
    if (h > 18) {
      ctx.fillStyle = '#fff';
      ctx.fillText(compactRp(v), x + barW / 2, y + 14);
    }
  });
}
