// ---------- Bookings page ----------
// Data model, seed data, and formatting helpers live in data.js (shared
// with the Finances page). This file is just the table/modal UI.

// Loaded from localStorage if a previous session saved edits, otherwise
// falls back to the real MICNIC.xlsx seed data.
const liveBookings = loadBookings();

// Which month's table is on screen, as a "YYYY-MM" key. Defaults to the
// real current month — a brand-new month starts out empty and ready for
// bookings, rather than lumping everything into whatever month was last
// recorded.
let currentMonth = todayMonthKey();
// True while the picker is parked on "today's month" — in that case a
// midnight rollover should follow the calendar forward automatically.
// Once the user manually picks a different month to review, it stops
// following so their view doesn't get yanked out from under them.
let viewingCurrentMonth = true;

const tableBody = document.getElementById('bookingsTableBody');
const tableMonthLabel = document.getElementById('tableMonthLabel');

function monthBookings(month) {
  return liveBookings[month] || [];
}

let lastRenderDate = null;

function renderBookings() {
  if (!tableBody) return;
  lastRenderDate = new Date().toDateString();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = monthBookings(currentMonth);

  if (tableMonthLabel) tableMonthLabel.textContent = `${monthLabel(currentMonth)} bookings`;
  renderMonthPickerButton();
  renderMonthPickerMenu();

  if (!rows.length) {
    tableBody.innerHTML = `<tr><td colspan="14" class="checkin-empty">No bookings for ${monthLabel(currentMonth)} yet.</td></tr>`;
    renderTotalsPanel(rows);
    return;
  }

  tableBody.innerHTML = rows.map(b => `
    <tr>
      <td>${escapeHtml(b.id)}</td>
      <td>${formatDisplayDate(b.dateBooked)}</td>
      <td><span class="mini-avatar">${escapeHtml(initials(b.guest))}</span>${escapeHtml(b.guest)}</td>
      <td>${escapeHtml(b.apartment) || '—'}</td>
      <td>${formatDisplayDate(b.checkin)}</td>
      <td>${formatDisplayDate(b.checkout)}</td>
      <td>${formatTZS(b.total)}</td>
      <td>${formatTZS(b.hostShare)}</td>
      <td>${formatTZS(b.commission)}</td>
      <td>${formatTZS(b.amountPaid)}</td>
      <td class="${b.remaining > 0 ? 'amount-owed' : ''}">${formatTZS(b.remaining)}</td>
      <td>${escapeHtml(b.hostPaid)}</td>
      <td>${statusPill(computeBookingStatus(b, today))}</td>
      <td>
        <button type="button" class="row-edit-btn" data-id="${escapeHtml(b.id)}" title="Edit booking" aria-label="Edit booking">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 0 1 4 4L7 21l-4 1 1-4Z"/><path d="m14.5 5.5 4 4"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  renderTotalsPanel(rows);
}

// Lives below the scrollable table (not inside it) so the horizontal
// scrollbar never overlaps it, and reads as a proper summary rather
// than a cramped extra row squeezed into the same 13-column table.
function renderTotalsPanel(rows) {
  const panel = document.getElementById('totalsPanel');
  if (!panel) return;

  const sum = (key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const hostPaidTotal = rows.reduce((s, r) => s + parseHostPaid(r.hostPaid), 0);
  const remainingTotal = sum('remaining');
  const owedCount = rows.filter(r => Number(r.remaining) > 0).length;

  const chip = (cls, icon, label, value, owed) => `
    <div class="total-chip ${cls}${owed ? ' owed' : ''}">
      <div class="total-chip-top">
        <span class="total-chip-icon">${icon}</span>
        <span class="total-chip-label">${label}</span>
      </div>
      <div class="total-chip-value">${value}</div>
    </div>
  `;

  panel.innerHTML = `
    <div class="totals-panel-header">
      <span class="totals-panel-title">Totals — ${monthLabel(currentMonth)}</span>
      <span class="totals-panel-sub">${rows.length} booking${rows.length === 1 ? '' : 's'}${owedCount ? ` · ${owedCount} not fully paid` : ''}</span>
    </div>
    <div class="totals-grid">
      ${chip('c-total', '🧾', 'Total price', formatTZS(sum('total')))}
      ${chip('c-host', '🏠', 'Host share', formatTZS(sum('hostShare')))}
      ${chip('c-commission', '💼', 'Commission', formatTZS(sum('commission')))}
      ${chip('c-paid', '✅', 'Amount paid', formatTZS(sum('amountPaid')))}
      ${chip('c-remaining', remainingTotal > 0 ? '⚠️' : '⏳', 'Remaining', formatTZS(remainingTotal), remainingTotal > 0)}
      ${chip('c-hostpaid', '🤝', 'Host paid', formatTZS(hostPaidTotal))}
    </div>
  `;
}

// ---------- Month picker ----------
const monthPicker = document.getElementById('monthPicker');
const monthPickerBtn = document.getElementById('monthPickerBtn');
const monthPickerMenu = document.getElementById('monthPickerMenu');

function renderMonthPickerButton() {
  const label = document.getElementById('monthPickerLabel');
  if (label) label.textContent = monthLabel(currentMonth);
}

// Shows Jan–Dec of whichever year is currently in view, so a booking
// dropped into a different year (once that's ever needed) still has a
// picker that can reach it.
function renderMonthPickerMenu() {
  if (!monthPickerMenu) return;
  const year = Number(currentMonth.split('-')[0]);
  monthPickerMenu.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const hasData = monthBookings(key).length > 0;
    const active = key === currentMonth;
    return `<button type="button" class="month-picker-item${active ? ' active' : ''}${hasData ? ' has-data' : ''}" data-key="${key}">${monthShortLabel(key)}</button>`;
  }).join('');
}

function openMonthPicker() {
  if (!monthPicker) return;
  renderMonthPickerMenu();
  monthPicker.classList.add('open');
  if (monthPickerBtn) monthPickerBtn.setAttribute('aria-expanded', 'true');
}

function closeMonthPicker() {
  if (!monthPicker) return;
  monthPicker.classList.remove('open');
  if (monthPickerBtn) monthPickerBtn.setAttribute('aria-expanded', 'false');
}

function selectMonth(key) {
  currentMonth = key;
  viewingCurrentMonth = key === todayMonthKey();
  closeMonthPicker();
  renderBookings();
}

if (monthPickerBtn) {
  monthPickerBtn.addEventListener('click', () => {
    monthPicker.classList.contains('open') ? closeMonthPicker() : openMonthPicker();
  });
}
if (monthPickerMenu) {
  monthPickerMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('.month-picker-item');
    if (btn) selectMonth(btn.dataset.key);
  });
}
document.addEventListener('click', (e) => {
  if (monthPicker && !monthPicker.contains(e.target)) closeMonthPicker();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMonthPicker();
});

// ---------- Keep today's-month view and every row's status current ----------
function msUntilNextLocalMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return next - now;
}

function scheduleDailyRefresh() {
  setTimeout(() => {
    if (viewingCurrentMonth) currentMonth = todayMonthKey();
    renderBookings();
    scheduleDailyRefresh();
  }, msUntilNextLocalMidnight());
}

// A sleeping/backgrounded laptop can miss the midnight setTimeout entirely
// — catch that on wake by re-rendering whenever the calendar day has
// moved on since the last render.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (new Date().toDateString() === lastRenderDate) return;
  if (viewingCurrentMonth) currentMonth = todayMonthKey();
  renderBookings();
});

// ---------- Modal ----------
const modalOverlay = document.getElementById('bookingModalOverlay');
const modalTitle = document.getElementById('modalTitle');
const bookingForm = document.getElementById('bookingForm');
const addBookingBtn = document.getElementById('addBookingBtn');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');

const fId = document.getElementById('fId');
const fGuest = document.getElementById('fGuest');
const fDateBooked = document.getElementById('fDateBooked');
const fApartment = document.getElementById('fApartment');
const fCheckin = document.getElementById('fCheckin');
const fCheckout = document.getElementById('fCheckout');
const fTotal = document.getElementById('fTotal');
const fAmountPaid = document.getElementById('fAmountPaid');
const fHostShare = document.getElementById('fHostShare');
const fCommission = document.getElementById('fCommission');
const fRemaining = document.getElementById('fRemaining');
const fHostPaid = document.getElementById('fHostPaid');
const fNoShow = document.getElementById('fNoShow');

let editingId = null;
let editingMonth = null;

function todayIso() {
  return todayIsoLocal();
}

function nextIdFor(month) {
  const maxNum = monthBookings(month).reduce((m, r) => {
    const n = parseInt(r.id.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return 'B' + String(maxNum + 1).padStart(3, '0');
}

// Keeps host share (90%) and commission (10%) in sync with the total
// price, matching the 10% commission rate used throughout the sheet.
function applySplit() {
  const total = Number(fTotal.value) || 0;
  fHostShare.value = Math.round(total * 0.9);
  fCommission.value = Math.round(total * 0.1);
}

function applyRemaining() {
  const total = Number(fTotal.value) || 0;
  const paid = Number(fAmountPaid.value) || 0;
  fRemaining.value = Math.max(total - paid, 0);
}

fTotal.addEventListener('input', () => { applySplit(); applyRemaining(); });
fAmountPaid.addEventListener('input', applyRemaining);

// The booking's month is always the check-in date's month, never a
// hand-picked value — so the ID preview follows the check-in date as
// it's filled in, for a new booking only (editing keeps its real ID).
fCheckin.addEventListener('change', () => {
  if (editingId) return;
  const key = fCheckin.value ? fCheckin.value.slice(0, 7) : currentMonth;
  fId.value = nextIdFor(key);
});

function openModal(booking) {
  editingId = booking ? booking.id : null;
  editingMonth = booking ? bookingMonthKey(booking) : null;
  modalTitle.textContent = booking ? 'Edit booking' : 'Add booking';

  fId.value = booking ? booking.id : nextIdFor(currentMonth);
  fGuest.value = booking ? booking.guest : '';
  fDateBooked.value = booking ? booking.dateBooked : todayIso();
  fApartment.value = booking ? booking.apartment : '';
  fCheckin.value = booking ? booking.checkin : '';
  fCheckout.value = booking ? booking.checkout : '';
  fTotal.value = booking ? booking.total : '';
  fAmountPaid.value = booking ? booking.amountPaid : '';
  fHostShare.value = booking ? booking.hostShare : '';
  fCommission.value = booking ? booking.commission : '';
  fRemaining.value = booking ? booking.remaining : '';
  fHostPaid.value = booking ? booking.hostPaid : '';
  fNoShow.checked = booking ? booking.status === "DIDN'T STAY" : false;

  modalOverlay.classList.add('show');
  fGuest.focus();
}

function closeModal() {
  modalOverlay.classList.remove('show');
  bookingForm.reset();
  editingId = null;
  editingMonth = null;
}

if (addBookingBtn) addBookingBtn.addEventListener('click', () => openModal(null));
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalCancel) modalCancel.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('show')) closeModal();
});

if (tableBody) {
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.row-edit-btn');
    if (!btn) return;
    const booking = monthBookings(currentMonth).find(b => b.id === btn.dataset.id);
    if (booking) openModal(booking);
  });
}

if (bookingForm) {
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const fields = {
      id: fId.value,
      guest: fGuest.value.trim(),
      dateBooked: fDateBooked.value,
      apartment: fApartment.value.trim(),
      checkin: fCheckin.value,
      checkout: fCheckout.value,
      total: Number(fTotal.value) || 0,
      amountPaid: Number(fAmountPaid.value) || 0,
      hostShare: Number(fHostShare.value) || 0,
      commission: Number(fCommission.value) || 0,
      remaining: Number(fRemaining.value) || 0,
      hostPaid: fHostPaid.value.trim(),
      status: fNoShow.checked ? "DIDN'T STAY" : '',
    };

    // The month bucket is always derived from check-in — never chosen by
    // hand — so a booking can't end up filed under the wrong month.
    const targetMonth = bookingMonthKey(fields) || currentMonth;

    if (editingId != null && editingMonth) {
      liveBookings[editingMonth] = (liveBookings[editingMonth] || []).filter(b => b.id !== editingId);
    }
    liveBookings[targetMonth] = liveBookings[targetMonth] || [];
    liveBookings[targetMonth].push(fields);

    saveBookings(liveBookings);

    currentMonth = targetMonth;
    viewingCurrentMonth = currentMonth === todayMonthKey();

    renderBookings();
    closeModal();
  });
}

renderBookings();
scheduleDailyRefresh();
