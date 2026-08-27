// ---------- Settings page ----------

// ===== Profile =====
const profileForm = document.getElementById('profileForm');
const fProfileName = document.getElementById('fProfileName');
const profileSaved = document.getElementById('profileSaved');

fProfileName.value = loadProfile().name;

let profileSavedTimer;
if (profileForm) {
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = fProfileName.value.trim();
    if (!name) return;

    saveProfile({ name });
    applyProfile(); // refresh sidebar chip immediately (defined in script.js, loaded before this file)

    profileSaved.textContent = 'Saved';
    clearTimeout(profileSavedTimer);
    profileSavedTimer = setTimeout(() => { profileSaved.textContent = ''; }, 2000);
  });
}

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

// ===== Security (password lock) =====
// The password hash relies on the Web Crypto API, which requires a
// "secure context" — supported on file:// in most modern browsers, but
// not guaranteed everywhere. Detect it rather than let a missing API
// throw partway through a form submit.
const CRYPTO_AVAILABLE = !!(window.crypto && window.crypto.subtle);

const passwordForm = document.getElementById('passwordForm');
const currentPassRow = document.getElementById('currentPassRow');
const fCurrentPass = document.getElementById('fCurrentPass');
const fNewPass = document.getElementById('fNewPass');
const fConfirmPass = document.getElementById('fConfirmPass');
const securityError = document.getElementById('securityError');
const securityStatus = document.getElementById('securityStatus');
const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');
const removePassBtn = document.getElementById('removePassBtn');

let securityLockoutTimer = null;

// Same throttling as the login page — deters casual guessing at the
// "current password" field through this form (not through devtools).
function checkSecurityLockout() {
  const remaining = lockoutRemainingMs();
  if (remaining <= 0) {
    if (securityLockoutTimer) { clearInterval(securityLockoutTimer); securityLockoutTimer = null; }
    return false;
  }
  passwordSubmitBtn.disabled = true;
  securityError.textContent = `Too many attempts — try again in ${Math.ceil(remaining / 1000)}s.`;
  if (!securityLockoutTimer) {
    securityLockoutTimer = setInterval(() => {
      if (!checkSecurityLockout()) passwordSubmitBtn.disabled = false;
    }, 1000);
  }
  return true;
}

function refreshSecurityUI() {
  if (!CRYPTO_AVAILABLE) {
    securityStatus.textContent = 'Unavailable';
    securityStatus.className = 'security-status';
    fNewPass.disabled = true;
    fConfirmPass.disabled = true;
    fCurrentPass.disabled = true;
    passwordSubmitBtn.disabled = true;
    securityError.textContent = 'This browser doesn’t support the security features needed for the password lock (Web Crypto API).';
    removePassBtn.hidden = !hasPassword();
    return;
  }

  const locked = hasPassword();
  securityStatus.textContent = locked ? 'Lock enabled' : 'Lock off';
  securityStatus.className = 'security-status' + (locked ? ' on' : '');
  currentPassRow.hidden = !locked;
  fCurrentPass.required = locked;
  passwordSubmitBtn.textContent = locked ? 'Change password' : 'Set password';
  removePassBtn.hidden = !locked;
  securityError.textContent = '';
  if (locked) checkSecurityLockout();
}

if (passwordForm) {
  refreshSecurityUI();

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!CRYPTO_AVAILABLE || passwordSubmitBtn.disabled) return;
    securityError.textContent = '';

    if (hasPassword()) {
      if (checkSecurityLockout()) return;
      const ok = await verifyPassword(fCurrentPass.value);
      if (!ok) {
        recordFailedAttempt();
        if (!checkSecurityLockout()) securityError.textContent = 'Current password is incorrect.';
        return;
      }
      clearFailedAttempts();
    }

    if (fNewPass.value.length < 6) {
      securityError.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (fNewPass.value !== fConfirmPass.value) {
      securityError.textContent = 'Passwords don’t match.';
      return;
    }

    const code = await setPassword(fNewPass.value);
    passwordForm.reset();
    refreshSecurityUI();
    showRecoveryCode(code);
  });

  removePassBtn.addEventListener('click', () => {
    if (!confirm('Remove the password lock? Anyone with access to this browser will be able to open the dashboard.')) return;
    clearPassword();
    passwordForm.reset();
    refreshSecurityUI();
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

// Rebuilt each time the Data card is shown fresh (page load) from
// whatever's actually in storage right now — so a month added on the
// Bookings page shows up here without any extra wiring.
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
      profile: loadProfile(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urbanhomes-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
    reader.onload = () => {
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

      if (!confirm('Import this backup? It will overwrite your current bookings, hosts, and profile on this device.')) {
        importDataInput.value = '';
        return;
      }

      saveBookings(parsed.bookings);
      saveCustomHosts(Array.isArray(parsed.customHosts) ? parsed.customHosts : []);
      saveHiddenHostKeys(Array.isArray(parsed.hiddenHostKeys) ? parsed.hiddenHostKeys : []);
      if (parsed.profile && parsed.profile.name) saveProfile(parsed.profile);

      showDataNote('Backup imported — reloading…', false);
      setTimeout(() => location.reload(), 700);
    };
    reader.readAsText(file);
  });
}

if (resetDataBtn) {
  resetDataBtn.addEventListener('click', () => {
    if (!confirm('Reset bookings, hosts, and profile back to the original sample data? This can’t be undone (export a backup first if you want to keep anything).')) return;

    saveBookings(cloneSeed());
    saveCustomHosts([]);
    saveHiddenHostKeys([]);
    saveProfile({ ...DEFAULT_PROFILE });

    showDataNote('Reset — reloading…', false);
    setTimeout(() => location.reload(), 700);
  });
}

// ===== Recovery code modal =====
// Shown once, right after a password is set (see the passwordForm
// submit handler above). Deliberately has no close button and no
// click-outside-to-dismiss — the checkbox forces acknowledgment before
// "Done" unlocks, since this code can never be shown again.
const recoveryModalOverlay = document.getElementById('recoveryModalOverlay');
const recoveryCodeDisplay = document.getElementById('recoveryCodeDisplay');
const copyRecoveryBtn = document.getElementById('copyRecoveryBtn');
const recoverySavedCheck = document.getElementById('recoverySavedCheck');
const recoveryModalDone = document.getElementById('recoveryModalDone');

function showRecoveryCode(code) {
  if (!recoveryModalOverlay) return;
  recoveryCodeDisplay.textContent = code;
  recoverySavedCheck.checked = false;
  recoveryModalDone.disabled = true;
  recoveryModalOverlay.classList.add('show');
}

if (recoverySavedCheck) {
  recoverySavedCheck.addEventListener('change', () => {
    recoveryModalDone.disabled = !recoverySavedCheck.checked;
  });
}

if (recoveryModalDone) {
  recoveryModalDone.addEventListener('click', () => {
    recoveryModalOverlay.classList.remove('show');
  });
}

if (copyRecoveryBtn) {
  copyRecoveryBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodeDisplay.textContent);
      copyRecoveryBtn.textContent = 'Copied!';
      setTimeout(() => { copyRecoveryBtn.textContent = 'Copy code'; }, 1500);
    } catch (e) {
      // Clipboard API unavailable/blocked — the code is still visible to select and copy by hand.
    }
  });
}
