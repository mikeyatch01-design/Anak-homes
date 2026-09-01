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
