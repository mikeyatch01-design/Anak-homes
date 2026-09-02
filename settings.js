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
    exportExcelBtn.addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
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

  // ---------- Excel bookings import ----------
  // Reads the same column layout the Excel export produces (ID, Date
  // booked, Guest, Apartment, Check-in, Check-out, Total, Host share,
  // Commission, Amount paid, Remaining, Host paid, Status) so a file
  // exported from here — edited, or handed off and filled in by someone
  // else — round-trips back in cleanly. One sheet per month, same as the
  // export; a "Summary" sheet (or any sheet without a Guest/Check-in
  // column) is skipped automatically rather than misread as bookings.
  const EXCEL_HEADER_MAP = {
    'id': 'id', 'date booked': 'dateBooked', 'guest': 'guest', 'apartment': 'apartment',
    'check-in': 'checkin', 'check-out': 'checkout', 'total': 'total', 'host share': 'hostShare',
    'commission': 'commission', 'amount paid': 'amountPaid', 'remaining': 'remaining',
    'host paid': 'hostPaid', 'status': 'status',
  };

  function excelDateToIso(val) {
    if (val == null || val === '') return '';
    if (val instanceof Date) {
      const y = val.getFullYear(), m = String(val.getMonth() + 1).padStart(2, '0'), d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(val).trim();
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
  }

  // Rows already saved under the same id+month get updated in place
  // (via _dbId) instead of duplicated — re-importing the same file twice
  // is safe.
  function findExistingBooking(id, month) {
    return (loadBookings()[month] || []).find(b => b.id === id);
  }

  function nextIdForImport(month, alreadyUsedThisImport) {
    const existing = (loadBookings()[month] || []).map(b => b.id);
    const used = existing.concat(alreadyUsedThisImport);
    const maxNum = used.reduce((m, id) => {
      const n = parseInt(String(id).replace(/\D/g, ''), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return 'B' + String(maxNum + 1).padStart(3, '0');
  }

  function parseBookingSheet(sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    if (!rows.length) return [];

    const header = rows[0].map(h => String(h || '').trim().toLowerCase());
    const colFor = {};
    header.forEach((h, i) => { if (EXCEL_HEADER_MAP[h]) colFor[EXCEL_HEADER_MAP[h]] = i; });
    if (colFor.guest == null || colFor.checkin == null) return []; // not a bookings sheet

    const get = (row, key) => (colFor[key] != null ? row[colFor[key]] : '');
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const idVal = String(get(row, 'id') || '').trim();
      const guest = String(get(row, 'guest') || '').trim();
      if (!guest || idVal.toUpperCase() === 'TOTAL') continue; // skip blank rows and the export's own totals row

      const statusLabel = String(get(row, 'status') || '').toLowerCase();
      out.push({
        id: idVal,
        dateBooked: excelDateToIso(get(row, 'dateBooked')),
        guest,
        apartment: String(get(row, 'apartment') || '').trim(),
        checkin: excelDateToIso(get(row, 'checkin')),
        checkout: excelDateToIso(get(row, 'checkout')),
        total: Number(get(row, 'total')) || 0,
        hostShare: Number(get(row, 'hostShare')) || 0,
        commission: Number(get(row, 'commission')) || 0,
        amountPaid: Number(get(row, 'amountPaid')) || 0,
        remaining: Number(get(row, 'remaining')) || 0,
        hostPaid: String(get(row, 'hostPaid') || '').trim(),
        status: statusLabel.includes("didn't stay") || statusLabel.includes('didnt stay') ? "DIDN'T STAY" : '',
      });
    }
    return out;
  }

  async function importExcelBookings(file) {
    if (typeof XLSX === 'undefined') {
      showDataNote('Excel import isn’t available right now — the xlsx library failed to load.', true);
      return;
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });

    const parsedRows = [];
    wb.SheetNames.forEach(name => {
      if (name.trim().toLowerCase() === 'summary') return;
      parseBookingSheet(wb.Sheets[name]).forEach(r => parsedRows.push(r));
    });

    const withMonth = parsedRows
      .map(r => ({ row: r, month: bookingMonthKey(r) }))
      .filter(x => x.month); // a row with no check-in date can't be filed anywhere
    const skipped = parsedRows.length - withMonth.length;

    if (!withMonth.length) {
      showDataNote('No bookings found in that file — check it has Guest and Check-in columns filled in.', true);
      return;
    }

    if (!confirm(`Import ${withMonth.length} booking${withMonth.length === 1 ? '' : 's'} from this file? Rows matching an existing booking (same ID and month) will be updated; the rest will be added.`)) {
      return;
    }

    const usedIdsByMonth = {};
    let done = 0, failed = 0;
    for (const { row, month } of withMonth) {
      if (!row.id) row.id = nextIdForImport(month, usedIdsByMonth[month] || []);
      (usedIdsByMonth[month] = usedIdsByMonth[month] || []).push(row.id);

      const existing = findExistingBooking(row.id, month);
      if (existing) row._dbId = existing._dbId;

      try {
        const saved = await upsertBooking(row, month);
        const bucket = loadBookings();
        bucket[month] = (bucket[month] || []).filter(b => b.id !== row.id);
        bucket[month].push(saved);
        done++;
      } catch (err) {
        console.error('Excel row import failed:', row, err);
        failed++;
      }
      showDataNote(`Importing… ${done + failed}/${withMonth.length}`, false);
    }

    populateExportMonthSelect();
    const summary = `Imported ${done} booking${done === 1 ? '' : 's'}.` +
      (failed ? ` ${failed} failed — check the console for details.` : '') +
      (skipped ? ` ${skipped} row${skipped === 1 ? '' : 's'} skipped (no check-in date).` : '');
    showDataNote(summary, failed > 0);
  }

  if (importDataInput) {
    importDataInput.addEventListener('change', () => {
      const file = importDataInput.files[0];
      if (!file) return;
      const isExcel = /\.xlsx$/i.test(file.name);

      if (isExcel) {
        importExcelBookings(file).finally(() => { importDataInput.value = ''; });
        return;
      }

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
          setTimeout(() => location.reload(), 700);
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
        setTimeout(() => location.reload(), 700);
      } catch (err) {
        console.error('replaceAllData (reset) failed:', err);
        showDataNote('Reset failed: ' + (err && err.message ? err.message : err), true);
      }
    });
  }
})();
