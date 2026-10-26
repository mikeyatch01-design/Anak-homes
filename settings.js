// ---------- Settings page ----------

(async function () {
  const session = await requireSession();
  if (!session) return; // requireSession() is already redirecting to login.html
  await initAppData();

  // ===== Appearance =====
  const themeOptions = document.getElementById('themeOptions');

  function refreshThemeOptions() {
    const current = getThemePreference();
    themeOptions.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === current);
    });
  }

  if (themeOptions) {
    themeOptions.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-option');
      if (!btn) return;
      setThemePreference(btn.dataset.theme);
      refreshThemeOptions();
    });
    refreshThemeOptions();
    document.addEventListener('themeprefchange', refreshThemeOptions);
  }

  // ===== Phone notifications =====
  const pushStatus = document.getElementById('pushStatus');
  const pushHint = document.getElementById('pushHint');
  const pushError = document.getElementById('pushError');
  const pushEnableBtn = document.getElementById('pushEnableBtn');
  const pushTestBtn = document.getElementById('pushTestBtn');
  const pushDisableBtn = document.getElementById('pushDisableBtn');
  const show = (node, on) => { if (node) node.style.display = on ? '' : 'none'; };

  async function refreshPushCard() {
    if (!pushStatus) return;
    pushError.textContent = '';
    if (!pushSupported()) {
      const ios = isIosDevice() && !isInstalledApp();
      pushStatus.textContent = 'Not available'; pushStatus.classList.remove('on');
      pushHint.textContent = ios
        ? 'On iPhone, first add Anak Homes to your Home Screen: tap the Share button, then “Add to Home Screen”. Open Anak Homes from the new icon and come back here.'
        : 'This browser can’t show notifications. Try Chrome, Safari or Edge.';
      show(pushHint, true); show(pushEnableBtn, false); show(pushTestBtn, false); show(pushDisableBtn, false);
      return;
    }
    const on = !!(await currentPushSubscription()) && Notification.permission === 'granted';
    pushStatus.textContent = on ? 'On for this device' : 'Off';
    pushStatus.classList.toggle('on', on);
    show(pushHint, false);
    show(pushEnableBtn, !on); show(pushTestBtn, on); show(pushDisableBtn, on);
  }

  async function pushAction(btn, fn, okText) {
    btn.disabled = true; pushError.textContent = '';
    try { await fn(); if (okText) { pushHint.textContent = okText; show(pushHint, true); } }
    catch (err) { console.error(err); pushError.textContent = (err && err.message) || 'Something went wrong. Please try again.'; }
    finally { btn.disabled = false; await refreshPushCard(); if (okText && !pushError.textContent) show(pushHint, true); }
  }

  if (pushEnableBtn) pushEnableBtn.addEventListener('click', () => pushAction(pushEnableBtn, enablePush, 'Done. You’ll get a notification here for every new booking.'));
  if (pushDisableBtn) pushDisableBtn.addEventListener('click', () => pushAction(pushDisableBtn, disablePush, 'Turned off for this device.'));
  if (pushTestBtn) pushTestBtn.addEventListener('click', () => pushAction(pushTestBtn, async () => {
    const r = await sendTestPush();
    if (!r || !r.sent) throw new Error('No device received it. Turn notifications off and on again on this device.');
  }, 'Test sent. It should appear in a few seconds.'));
  refreshPushCard();

  // ===== Security (real account, via Supabase Auth) =====
  const securityEmail = document.getElementById('securityEmail');
  if (securityEmail) securityEmail.textContent = session.user.email || '—';

  const passwordForm = document.getElementById('passwordForm');
  const fNewPass = document.getElementById('fNewPass');
  const fConfirmPass = document.getElementById('fConfirmPass');
  const securityError = document.getElementById('securityError');
  const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      securityError.textContent = '';

      if (fNewPass.value.length < 6) {
        securityError.textContent = 'Password must be at least 6 characters.';
        return;
      }
      if (fNewPass.value !== fConfirmPass.value) {
        securityError.textContent = 'Passwords don’t match.';
        return;
      }

      passwordSubmitBtn.disabled = true;
      const { error } = await sb.auth.updateUser({ password: fNewPass.value });
      passwordSubmitBtn.disabled = false;

      if (error) {
        securityError.textContent = 'Couldn’t change your password — try again.';
        return;
      }
      passwordForm.reset();
      securityError.textContent = '';
      securityError.className = 'security-error success';
      securityError.textContent = 'Password changed.';
    });
  }

  // ===== Data management =====
  const exportMonthSelect = document.getElementById('exportMonthSelect');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataInput = document.getElementById('importDataInput');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const dataNote = document.getElementById('dataNote');

  function showDataNote(message, isError) {
    dataNote.textContent = message;
    dataNote.className = 'settings-note' + (isError ? ' error' : '');
  }

  // ===== Export to Excel =====
  // A human-readable spreadsheet for sharing, distinct from the JSON backup
  // below (which round-trips through Import and isn't meant to be read
  // directly). Same column order as the Bookings table: one sheet per
  // month, plus a Summary sheet totaling each month at a glance.
  const EXCEL_COLUMNS = [
    ['ID', 'id'], ['Date booked', 'dateBooked'], ['Guest', 'guest'], ['Apartment', 'apartment'],
    ['Check-in', 'checkin'], ['Check-out', 'checkout'], ['Total', 'total'], ['Host share', 'hostShare'],
    ['Commission', 'commission'], ['Amount paid', 'amountPaid'], ['Remaining', 'remaining'],
    ['Host paid', 'hostPaidAmount'], ['Status', 'statusLabel'],
  ];

  // Sheet names can't exceed 31 chars or contain : \ / ? * [ ] — "May 2026"
  // style labels are already well within that, but sanitize just in case.
  function excelSheetName(monthKey) {
    return monthLabel(monthKey).replace(/[:\\/?*[\]]/g, '').slice(0, 31);
  }

  function monthRowsForExcel(rows, today) {
    return rows.map(b => ({
      id: b.id,
      dateBooked: b.dateBooked || '',
      guest: b.guest || '',
      apartment: b.apartment || '',
      checkin: b.checkin || '',
      checkout: b.checkout || '',
      total: Number(b.total) || 0,
      hostShare: Number(b.hostShare) || 0,
      commission: Number(b.commission) || 0,
      amountPaid: Number(b.amountPaid) || 0,
      remaining: Number(b.remaining) || 0,
      hostPaidAmount: parseHostPaid(b.hostPaid),
      statusLabel: (STATUS_META[computeBookingStatus(b, today)] || {}).label || '',
    }));
  }

  function sumRows(rows, key) {
    return rows.reduce((s, r) => s + r[key], 0);
  }

  function buildMonthSheet(rows) {
    const header = EXCEL_COLUMNS.map(c => c[0]);
    const body = rows.map(r => EXCEL_COLUMNS.map(c => r[c[1]]));
    const totals = ['', '', '', '', '', 'TOTAL',
      sumRows(rows, 'total'), sumRows(rows, 'hostShare'), sumRows(rows, 'commission'),
      sumRows(rows, 'amountPaid'), sumRows(rows, 'remaining'), sumRows(rows, 'hostPaidAmount'), ''];

    const ws = XLSX.utils.aoa_to_sheet([header, ...body, totals]);
    ws['!cols'] = [
      { wch: 7 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 11 }, { wch: 11 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    return ws;
  }

  function buildSummarySheet(data, monthKeys, today) {
    const header = ['Month', 'Bookings', 'Total', 'Host share', 'Commission', 'Amount paid', 'Remaining', 'Host paid'];
    const body = monthKeys.map(m => {
      const rows = monthRowsForExcel(data[m] || [], today);
      return [
        monthLabel(m), rows.length, sumRows(rows, 'total'), sumRows(rows, 'hostShare'),
        sumRows(rows, 'commission'), sumRows(rows, 'amountPaid'), sumRows(rows, 'remaining'), sumRows(rows, 'hostPaidAmount'),
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }];
    return ws;
  }

  const EXPORT_ALL_VALUE = 'all';

  function populateExportMonthSelect() {
    if (!exportMonthSelect) return;
    const monthKeys = monthKeysOf(loadBookings());
    exportMonthSelect.innerHTML = [
      `<option value="${EXPORT_ALL_VALUE}">All months (every booking)</option>`,
      ...monthKeys.map(m => `<option value="${m}">${escapeHtml(monthLabel(m))} only</option>`),
    ].join('');
  }
  populateExportMonthSelect();

  if (exportExcelBtn) {
    // start fetching the Excel library as soon as a finger/mouse lands on the button
    ['pointerdown', 'focus'].forEach(ev => exportExcelBtn.addEventListener(ev, () => { loadXlsx().catch(() => {}); }));
    exportExcelBtn.addEventListener('click', async () => {
      try { await loadXlsx(); } catch (e) {
        showDataNote('Excel export isn’t available right now — the xlsx library failed to load.', true);
        return;
      }

      const data = loadBookings();
      const selected = exportMonthSelect ? exportMonthSelect.value : EXPORT_ALL_VALUE;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const wb = XLSX.utils.book_new();

      if (selected === EXPORT_ALL_VALUE) {
        const monthKeys = monthKeysOf(data);
        XLSX.utils.book_append_sheet(wb, buildSummarySheet(data, monthKeys, today), 'Summary');
        monthKeys.forEach(m => {
          XLSX.utils.book_append_sheet(wb, buildMonthSheet(monthRowsForExcel(data[m] || [], today)), excelSheetName(m));
        });
        XLSX.writeFile(wb, `anak-homes-bookings-all-${todayIsoLocal()}.xlsx`);
      } else {
        XLSX.utils.book_append_sheet(wb, buildMonthSheet(monthRowsForExcel(data[selected] || [], today)), excelSheetName(selected));
        XLSX.writeFile(wb, `anak-homes-bookings-${selected}.xlsx`);
      }

      showDataNote('Excel file downloaded.', false);
    });
  }

  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', () => {
      const backup = {
        exportedAt: new Date().toISOString(),
        bookings: loadBookings(),
        customHosts: loadCustomHosts(),
        hiddenHostKeys: loadHiddenHostKeys(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anak-homes-backup-${todayIsoLocal()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showDataNote('Backup downloaded.', false);
    });
  }

  // ---------- Backup import (.json only — Excel bookings import lives on
  // the Bookings page now, where people actually look for it) ----------
  if (importDataInput) {
    importDataInput.addEventListener('change', () => {
      const file = importDataInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        let parsed;
        try {
          parsed = JSON.parse(reader.result);
        } catch (e) {
          showDataNote('That file isn’t valid JSON.', true);
          importDataInput.value = '';
          return;
        }

        const validBookings = parsed && parsed.bookings
          && typeof parsed.bookings === 'object'
          && !Array.isArray(parsed.bookings)
          && Object.values(parsed.bookings).every(v => Array.isArray(v));

        if (!validBookings) {
          showDataNote('That file doesn’t look like an Anak Homes backup.', true);
          importDataInput.value = '';
          return;
        }

        if (!confirm('Import this backup? It will overwrite your current bookings and hosts.')) {
          importDataInput.value = '';
          return;
        }

        showDataNote('Importing…', false);
        try {
          await replaceAllData({
            bookings: parsed.bookings,
            customHosts: Array.isArray(parsed.customHosts) ? parsed.customHosts : [],
            hiddenHostKeys: Array.isArray(parsed.hiddenHostKeys) ? parsed.hiddenHostKeys : [],
          });
          showDataNote('Backup imported — reloading…', false);
          setTimeout(() => { clearDataCache(); location.reload(); }, 700);
        } catch (err) {
          console.error('replaceAllData (import) failed:', err);
          showDataNote('Import failed: ' + (err && err.message ? err.message : err), true);
        }
      };
      reader.readAsText(file);
    });
  }

  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', async () => {
      if (!confirm('Reset bookings and hosts back to the original sample data? This can’t be undone (export a backup first if you want to keep anything).')) return;

      showDataNote('Resetting…', false);
      try {
        await replaceAllData({
          bookings: cloneSeed(),
          customHosts: [],
          hiddenHostKeys: [],
        });
        showDataNote('Reset — reloading…', false);
        setTimeout(() => { clearDataCache(); location.reload(); }, 700);
      } catch (err) {
        console.error('replaceAllData (reset) failed:', err);
        showDataNote('Reset failed: ' + (err && err.message ? err.message : err), true);
      }
    });
  }

  // ===== Trash (bookings deleted on the Bookings page) =====
  const trashTableBody = document.getElementById('trashTableBody');
  const trashCount = document.getElementById('trashCount');
  const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>';

  function renderTrash() {
    if (!trashTableBody) return;
    const trashed = loadTrashedBookings();
    if (trashCount) trashCount.textContent = trashed.length ? `${trashed.length} booking${trashed.length === 1 ? '' : 's'}` : '';
    if (!trashed.length) {
      trashTableBody.innerHTML = '<tr><td colspan="6" class="checkin-empty">Trash is empty.</td></tr>';
      return;
    }
    trashTableBody.innerHTML = trashed.map(b => {
      return `
      <tr>
        <td>${escapeHtml(b.id)}</td>
        <td><span class="mini-avatar">${escapeHtml(initials(b.guest))}</span>${escapeHtml(b.guest)}</td>
        <td>${escapeHtml(b.apartment) || '—'}</td>
        <td>${formatDisplayDate(b.checkin)}</td>
        <td>${b.deletedAt ? formatDisplayDate(b.deletedAt.slice(0, 10)) : '—'}</td>
        <td class="row-actions">
          <button type="button" class="btn-secondary trash-restore-btn" data-dbid="${escapeHtml(b._dbId)}">Restore</button>
          <button type="button" class="row-delete-btn trash-forever-btn" data-dbid="${escapeHtml(b._dbId)}" title="Delete forever" aria-label="Delete ${escapeHtml(b.guest)} forever">${TRASH_ICON}</button>
        </td>
      </tr>`;
    }).join('');
  }

  if (trashTableBody) {
    trashTableBody.addEventListener('click', async (e) => {
      const restoreBtn = e.target.closest('.trash-restore-btn');
      if (restoreBtn) {
        restoreBtn.disabled = true;
        try {
          await restoreBookingRemote(restoreBtn.dataset.dbid);
          renderTrash();
          if (typeof refreshFreshCount === 'function') refreshFreshCount();
        } catch (err) {
          console.error('restoreBookingRemote failed:', err);
          alert('Could not restore this booking:\n\n' + (err && err.message ? err.message : err));
          restoreBtn.disabled = false;
        }
        return;
      }
      const foreverBtn = e.target.closest('.trash-forever-btn');
      if (foreverBtn) {
        if (!confirm('Permanently delete this booking? This cannot be undone.')) return;
        foreverBtn.disabled = true;
        try {
          await deleteBookingForeverRemote(foreverBtn.dataset.dbid);
          renderTrash();
        } catch (err) {
          console.error('deleteBookingForeverRemote failed:', err);
          alert('Could not delete this booking:\n\n' + (err && err.message ? err.message : err));
          foreverBtn.disabled = false;
        }
      }
    });
    renderTrash();
  }

  // ===== Start fresh: hide older bookings from the dashboard (never deletes) =====
  // Bookings are filed by check-in month, so "from October" means the dashboard
  // counts bookings whose check-in month is October or later. Nothing is removed
  // from the database; "Show all" puts the older months back.
  const freshCutoff = document.getElementById('freshCutoff');
  const freshBtn = document.getElementById('freshBtn');
  const freshCount = document.getElementById('freshCount');
  const freshNote = document.getElementById('freshNote');
  const freshShowAllRow = document.getElementById('freshShowAllRow');
  const freshShowAllBtn = document.getElementById('freshShowAllBtn');
  let dashFrom = dashboardStartMonth(session);

  function bookingsBefore(cutoff) {
    return Object.keys(loadBookings())
      .filter(k => k < cutoff)
      .flatMap(k => loadBookings()[k]);
  }
  const plural = (n) => `${n} booking${n === 1 ? '' : 's'}`;

  function refreshFreshCount() {
    if (!freshCutoff) return;
    const hiddenNow = dashFrom ? bookingsBefore(dashFrom).length : 0;
    const wouldHide = bookingsBefore(freshCutoff.value).length;
    freshCount.textContent = dashFrom
      ? `The dashboard now starts from ${monthLabel(dashFrom)} · ${plural(hiddenNow)} from earlier months are hidden there (still saved).`
      : (wouldHide ? `Starting from ${monthLabel(freshCutoff.value)} hides ${plural(wouldHide)} from the dashboard. Nothing is deleted.` : 'The dashboard shows every booking.');
    freshBtn.disabled = freshCutoff.value === dashFrom;
    freshShowAllRow.style.display = dashFrom ? '' : 'none'; // [hidden] loses to the row's display:flex
  }

  async function saveFrom(month, doneText) {
    freshBtn.disabled = true; freshCutoff.disabled = true; freshShowAllBtn.disabled = true;
    freshNote.className = 'settings-note';
    freshNote.textContent = 'Saving…';
    try {
      await setDashboardStartMonth(month);
      dashFrom = month;
      freshNote.textContent = doneText;
    } catch (err) {
      console.error('dashboard start month', err);
      freshNote.className = 'settings-note error';
      freshNote.textContent = 'Couldn’t save that — check your connection and try again.';
    }
    freshCutoff.disabled = false; freshShowAllBtn.disabled = false;
    refreshFreshCount();
  }

  if (freshCutoff && freshBtn) {
    const keys = Object.keys(loadBookings()).sort();
    const last = [keys[keys.length - 1] || todayMonthKey(), todayMonthKey()].sort()[1];
    const options = [];
    for (let y = Number(last.slice(0, 4)), m = Number(last.slice(5)); options.length < 24; m--) {
      if (m < 1) { m = 12; y--; }
      const k = `${y}-${String(m).padStart(2, '0')}`;
      options.push(`<option value="${k}">${monthLabel(k)}</option>`);
    }
    freshCutoff.innerHTML = options.join('');
    freshCutoff.value = dashFrom && options.some(o => o.includes(`"${dashFrom}"`)) ? dashFrom : todayMonthKey();
    freshCutoff.addEventListener('change', refreshFreshCount);
    refreshFreshCount();

    freshBtn.addEventListener('click', () => {
      const month = freshCutoff.value;
      saveFrom(month, `Done — the dashboard now starts from ${monthLabel(month)}. All bookings are still saved.`);
    });
    freshShowAllBtn.addEventListener('click', () => {
      saveFrom(null, 'Done — every booking is back on the dashboard.');
    });
  }
})();
