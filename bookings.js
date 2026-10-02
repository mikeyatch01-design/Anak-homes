// ---------- Bookings page ----------
// Data model and formatting helpers live in data.js (shared with the
// Finances page). This file is just the table/modal UI.

(async function () {
  const session = await requireSession();
  if (!session) return; // requireSession() is already redirecting to login.html
  await initAppData();

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

  // ---------- Sort ----------
  const sortSelect = document.getElementById('sortSelect');
  let sortKey = sortSelect ? sortSelect.value : 'checkin-asc';

  const SORTERS = {
    'checkin-asc': (a, b) => (a.checkin || '').localeCompare(b.checkin || ''),
    'added-desc': (a, b) => (b.dateBooked || '').localeCompare(a.dateBooked || ''),
    'added-asc': (a, b) => (a.dateBooked || '').localeCompare(b.dateBooked || ''),
    'guest-az': (a, b) => a.guest.localeCompare(b.guest),
    'amount-desc': (a, b) => (Number(b.total) || 0) - (Number(a.total) || 0),
  };

  function sortedRows(rows) {
    const sorter = SORTERS[sortKey] || SORTERS['checkin-asc'];
    return rows.slice().sort(sorter);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortKey = sortSelect.value;
      renderBookings();
    });
  }

  let lastRenderDate = null;

  function renderBookings() {
    if (!tableBody) return;
    lastRenderDate = new Date().toDateString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = sortedRows(monthBookings(currentMonth));

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
        <td class="row-actions">
          <button type="button" class="row-edit-btn" data-id="${escapeHtml(b.id)}" title="Edit booking" aria-label="Edit booking">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 0 1 4 4L7 21l-4 1 1-4Z"/><path d="m14.5 5.5 4 4"/></svg>
          </button>
          <button type="button" class="row-delete-btn" data-id="${escapeHtml(b.id)}" title="Delete booking" aria-label="Delete booking">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    renderTotalsPanel(rows);
  }

  // Small line icons for the totals chips (drawn, not emoji).
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    receipt: svg('<path d="M6 3.5h12v17l-2.5-1.6-2 1.6-1.5-1.2-1.5 1.2-2-1.6L6 20.5z"/><path d="M9 8h6M9 11.5h6"/>'),
    home: svg('<path d="M3.5 11.5 12 4.5l8.5 7"/><path d="M6 10v9.5h12V10"/>'),
    briefcase: svg('<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>'),
    check: svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>'),
    alert: svg('<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.2M12 16.8v.2"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    handshake: svg('<path d="M3 11l4-4 4 2 3-2 7 4"/><path d="M7 15l3 3 2-1 2 2 4-4"/><path d="M3 11l4 4M21 11l-3 4"/>'),
  };

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
        ${chip('c-total', ICONS.receipt, 'Total price', formatTZS(sum('total')))}
        ${chip('c-host', ICONS.home, 'Host share', formatTZS(sum('hostShare')))}
        ${chip('c-commission', ICONS.briefcase, 'Commission', formatTZS(sum('commission')))}
        ${chip('c-paid', ICONS.check, 'Amount paid', formatTZS(sum('amountPaid')))}
        ${chip('c-remaining', remainingTotal > 0 ? ICONS.alert : ICONS.clock, 'Remaining', formatTZS(remainingTotal), remainingTotal > 0)}
        ${chip('c-hostpaid', ICONS.handshake, 'Host paid', formatTZS(hostPaidTotal))}
      </div>
    `;
  }

  // ---------- Month picker (grid panel, shared with the dashboard) ----------
  let monthPickerUI = null;
  function renderMonthPickerButton() { if (monthPickerUI) monthPickerUI.refresh(); }
  function renderMonthPickerMenu() {}

  function selectMonth(key) {
    currentMonth = key;
    viewingCurrentMonth = key === todayMonthKey();
    renderBookings();
  }

  const monthPickerRoot = document.getElementById('monthPicker');
  if (monthPickerRoot) {
    monthPickerUI = createMonthPicker(monthPickerRoot, {
      getValue: () => currentMonth,
      hasData: (key) => monthBookings(key).length > 0,
      onSelect: selectMonth,
    });
  }

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
  const modalSubmitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;

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

  // ---------- Enter / Arrow keys move between fields ----------
  // By default, Enter in a text/number/date input submits the whole form
  // early, and Up/Down in a number input nudges its value up or down
  // instead of moving anywhere — both annoying when filling a dozen
  // fields in sequence. This repurposes all three (Enter, ArrowDown,
  // ArrowUp) into Tab-style field-to-field movement (auto-selecting the
  // next field's content so typing overwrites it, spreadsheet-style),
  // only actually submitting once you hit Enter on the last field.
  // Left/Right are left alone — still needed to move the cursor within a
  // field and to move between day/month/year in a date input.
  const FIELD_ORDER = [fGuest, fDateBooked, fApartment, fCheckin, fCheckout, fTotal, fAmountPaid, fHostShare, fCommission, fRemaining, fHostPaid];
  function focusField(field) {
    field.focus();
    if (field.select) field.select();
  }
  FIELD_ORDER.forEach((field, i) => {
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = FIELD_ORDER[i + 1];
        if (next) {
          focusField(next);
        } else if (e.key === 'Enter' && modalSubmitBtn) {
          modalSubmitBtn.click();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = FIELD_ORDER[i - 1];
        if (prev) focusField(prev);
      }
    });
  });

  let editingId = null;
  let editingMonth = null;
  let editingDbId = null;

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

  // Commission is always whatever's left after the host's share — not a
  // fixed 10%, since the split isn't the same on every booking. Host
  // share is typed in by hand; commission just follows it.
  function applyCommission() {
    const total = Number(fTotal.value) || 0;
    const hostShare = Number(fHostShare.value) || 0;
    fCommission.value = Math.max(total - hostShare, 0);
  }

  function applyRemaining() {
    const total = Number(fTotal.value) || 0;
    const paid = Number(fAmountPaid.value) || 0;
    fRemaining.value = Math.max(total - paid, 0);
  }

  fTotal.addEventListener('input', () => { applyCommission(); applyRemaining(); });
  fHostShare.addEventListener('input', applyCommission);
  fAmountPaid.addEventListener('input', applyRemaining);

  // The booking's month is always the check-in date's month, never a
  // hand-picked value — so the ID preview follows the check-in date as
  // it's filled in, for a new booking only (editing keeps its real ID).
  fCheckin.addEventListener('change', () => {
    if (editingId) return;
    const key = fCheckin.value ? fCheckin.value.slice(0, 7) : currentMonth;
    fId.value = nextIdFor(key);
  });

  // ---------- Apartment suggestions (remembers what's been typed) ----------
  // Like Excel's autocomplete: every apartment name ever entered — from
  // saved bookings, the Trash, and a per-device list of names typed here —
  // is offered as you type (e.g. "M" → Masaki, Mikocheni 4, MPV 05).
  const APARTMENTS_KEY = 'anak-apartments';
  const apartmentList = document.getElementById('apartmentSuggestions');

  function rememberedApartments() {
    try { return JSON.parse(localStorage.getItem(APARTMENTS_KEY)) || []; } catch (e) { return []; }
  }
  function rememberApartment(name) {
    const clean = (name || '').trim();
    if (!clean) return;
    const list = rememberedApartments().filter(a => a.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    try { localStorage.setItem(APARTMENTS_KEY, JSON.stringify(list.slice(0, 300))); } catch (e) {}
  }
  function refreshApartmentSuggestions() {
    if (!apartmentList) return;
    const seen = new Map();
    const add = (name) => {
      const clean = (name || '').trim();
      if (clean && !seen.has(clean.toLowerCase())) seen.set(clean.toLowerCase(), clean);
    };
    rememberedApartments().forEach(add);
    allBookings(liveBookings).forEach(b => add(b.apartment));
    loadTrashedBookings().forEach(b => add(b.apartment));
    ['Mikocheni', 'Masaki', 'Sinza', 'Mwenge'].forEach(add);
    apartmentList.innerHTML = [...seen.values()]
      .sort((x, y) => x.localeCompare(y, undefined, { sensitivity: 'base' }))
      .map(name => `<option value="${escapeHtml(name)}">`).join('');
  }

  function openModal(booking) {
    refreshApartmentSuggestions();
    editingId = booking ? booking.id : null;
    editingMonth = booking ? bookingMonthKey(booking) : null;
    editingDbId = booking ? booking._dbId : null;
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
    editingDbId = null;
  }

  if (addBookingBtn) addBookingBtn.addEventListener('click', () => openModal(null));

  // ---------- Expand the bookings table to full screen ----------
  const bookingsCard = document.getElementById('bookingsCard');
  const expandBookingsBtn = document.getElementById('expandBookingsBtn');
  const cardHeader = bookingsCard ? bookingsCard.querySelector('.card-header') : null;
  const pageToolbar = document.querySelector('.page-toolbar');
  const importNoteEl = document.getElementById('importNote');
  if (bookingsCard && expandBookingsBtn && cardHeader) {
    const expandIcon = expandBookingsBtn.querySelector('.expand-icon');
    const shrinkIcon = expandBookingsBtn.querySelector('.shrink-icon');
    const mainEl = bookingsCard.parentElement;

    function setMaximized(on) {
      bookingsCard.classList.toggle('is-maximized', on);
      document.body.classList.toggle('has-maximized-card', on);
      expandIcon.hidden = on;
      shrinkIcon.hidden = !on;
      const label = on ? 'Shrink back down' : 'Expand to full screen';
      expandBookingsBtn.title = label;
      expandBookingsBtn.setAttribute('aria-label', label);

      // Sort, month picker, import, and + Add booking live above the card
      // normally — while maximized there's nothing above it to reach them
      // on, so they move inside the card itself (right under its header)
      // and move back out to their normal spot on shrink.
      if (on) {
        if (pageToolbar) cardHeader.insertAdjacentElement('afterend', pageToolbar);
        if (importNoteEl) (pageToolbar || cardHeader).insertAdjacentElement('afterend', importNoteEl);
      } else if (mainEl) {
        if (pageToolbar) mainEl.insertBefore(pageToolbar, bookingsCard);
        if (importNoteEl) mainEl.insertBefore(importNoteEl, bookingsCard);
      }
    }

    expandBookingsBtn.addEventListener('click', () => {
      setMaximized(!bookingsCard.classList.contains('is-maximized'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bookingsCard.classList.contains('is-maximized')) setMaximized(false);
    });
  }

  // ---------- Import from Excel ----------
  // Parsing/saving lives in data.js (shared data-layer code); this just
  // wires it to the button and shows where the imported rows landed.
  // Month is always read from each row's own Check-in date — never typed
  // or chosen here — so it can't end up filed under the wrong month.
  const importBookingsInput = document.getElementById('importBookingsInput');
  const importNote = document.getElementById('importNote');

  function showImportNote(message, isError) {
    if (!importNote) return;
    importNote.textContent = message;
    importNote.className = 'settings-note' + (isError ? ' error' : '');
  }

  if (importBookingsInput) {
    importBookingsInput.addEventListener('change', async () => {
      const file = importBookingsInput.files[0];
      if (!file) return;

      try {
        showImportNote('Reading file…', false);
        const { rows, skipped } = await parseExcelBookingsFile(file);

        if (!rows.length) {
          showImportNote(
            skipped
              ? `Found ${skipped} row${skipped === 1 ? '' : 's'} but none had a Check-in date, so nothing could be filed into a month.`
              : 'No bookings found in that file — check it has Guest and Check-in columns filled in.',
            true
          );
          return;
        }

        const monthsInFile = Array.from(new Set(rows.map(r => r.month))).sort().map(monthLabel).join(', ');
        if (!confirm(`Import ${rows.length} booking${rows.length === 1 ? '' : 's'} into ${monthsInFile}? Rows matching an existing booking (same ID and month) will be updated; the rest will be added.`)) {
          return;
        }

        showImportNote('Importing…', false);
        const result = await saveImportedBookings(rows, (done, total) => showImportNote(`Importing… ${done}/${total}`, false));

        const monthNames = result.months.map(monthLabel).join(', ');
        let summary = `Imported ${result.done} booking${result.done === 1 ? '' : 's'} into ${monthNames}.`;
        if (result.failed) summary += ` ${result.failed} failed — check the console for details.`;
        if (skipped) summary += ` ${skipped} row${skipped === 1 ? '' : 's'} skipped (no check-in date).`;
        showImportNote(summary, result.failed > 0);

        // Jump straight to where the bookings landed when it's a single
        // month — with several months touched, jumping would just hide
        // the others, so stay put and let the message above name them all.
        if (result.months.length === 1) {
          selectMonth(result.months[0]);
        } else {
          renderMonthPickerMenu();
          renderBookings();
        }
      } catch (err) {
        console.error('Excel import failed:', err);
        showImportNote('Import failed: ' + (err && err.message ? err.message : err), true);
      } finally {
        importBookingsInput.value = '';
      }
    });
  }

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
    tableBody.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.row-edit-btn');
      if (editBtn) {
        const booking = monthBookings(currentMonth).find(b => b.id === editBtn.dataset.id);
        if (booking) openModal(booking);
        return;
      }

      const deleteBtn = e.target.closest('.row-delete-btn');
      if (deleteBtn) {
        const booking = monthBookings(currentMonth).find(b => b.id === deleteBtn.dataset.id);
        if (!booking) return;
        if (!confirm(`Move booking ${booking.id} (${booking.guest}) to Trash?\n\nYou can restore it from Settings → Trash for 30 days.`)) return;

        deleteBtn.disabled = true;
        try {
          await trashBookingRemote(booking._dbId);
          liveBookings[currentMonth] = (liveBookings[currentMonth] || []).filter(b => b.id !== booking.id);
          renderBookings();
        } catch (err) {
          console.error('trashBookingRemote failed:', err);
          alert('Could not delete this booking:\n\n' + (err && err.message ? err.message : err));
          deleteBtn.disabled = false;
        }
      }
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
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
      if (editingDbId) fields._dbId = editingDbId;

      // The month bucket is always derived from check-in — never chosen by
      // hand — so a booking can't end up filed under the wrong month.
      const targetMonth = bookingMonthKey(fields) || currentMonth;

      if (modalSubmitBtn) modalSubmitBtn.disabled = true;
      try {
        const saved = await upsertBooking(fields, targetMonth);
        rememberApartment(fields.apartment);

        if (editingId != null && editingMonth) {
          liveBookings[editingMonth] = (liveBookings[editingMonth] || []).filter(b => b.id !== editingId);
        }
        liveBookings[targetMonth] = liveBookings[targetMonth] || [];
        liveBookings[targetMonth].push(saved);

        currentMonth = targetMonth;
        viewingCurrentMonth = currentMonth === todayMonthKey();

        renderBookings();
        closeModal();
      } catch (err) {
        console.error('upsertBooking failed:', err);
        alert('Could not save this booking:\n\n' + (err && err.message ? err.message : err));
      } finally {
        if (modalSubmitBtn) modalSubmitBtn.disabled = false;
      }
    });
  }

  renderBookings();
  scheduleDailyRefresh();
})();
