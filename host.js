// ---------- Host page ----------
// Host grouping (BUILTIN_HOST_DEFS, allHostDefs, normalizeApartment) lives
// in data.js — shared with the Finances dashboard's per-host breakdowns.
// Built-in hosts cover what's already in the sheet; new ones can be added
// from this page instead of needing a code change every time a new host
// comes on board.

(async function () {
  const session = await requireSession();
  if (!session) return; // requireSession() is already redirecting to login.html
  await initAppData();

  const liveData = loadBookings();

  // Cycled through for new custom hosts so they don't all look identical.
  const NEW_HOST_ICONS = ['🏡', '🏛️', '🏬', '🌇', '🏝️', '🏦', '🏰', '🗼'];

  function computeHostStats() {
    const stats = {};
    allHostDefs().forEach(h => { stats[h.key] = { months: {}, bookings: 0 }; });

    allBookings(liveData).forEach(b => {
      const bucket = stats[normalizeApartment(b.apartment)];
      bucket.months[b.month] = (bucket.months[b.month] || 0) + (Number(b.hostShare) || 0);
      bucket.bookings += 1;
    });

    return stats;
  }

  const hostGrid = document.getElementById('hostGrid');

  function renderHosts() {
    if (!hostGrid) return;

    const stats = computeHostStats();
    const monthKeys = monthKeysOf(liveData);

    hostGrid.innerHTML = allHostDefs().map(h => {
      const s = stats[h.key];
      const total = monthKeys.reduce((sum, m) => sum + (s.months[m] || 0), 0);
      const monthRow = (label, val) => `
        <div class="host-popup-row"><span>${label}</span><span>${val ? formatTZS(val) : '—'}</span></div>
      `;
      // "Other units" is a catch-all bucket, not a real host — not deletable.
      const deleteBtn = h.key === 'other' ? '' : `
        <button type="button" class="host-delete-btn" data-key="${h.key}" title="Delete host" aria-label="Delete ${escapeHtml(h.name)}">&times;</button>
      `;

      return `
        <div class="host-card" tabindex="0" data-key="${h.key}">
          ${deleteBtn}
          <div class="host-icon">${h.icon}</div>
          <div class="host-name">${escapeHtml(h.name)}</div>
          <div class="host-count">${s.bookings} booking${s.bookings === 1 ? '' : 's'}</div>
          <div class="host-popup">
            <div class="host-popup-title">${escapeHtml(h.name)}</div>
            <div class="host-popup-row"><span>Location</span><span>Dar es Salaam</span></div>
            ${monthKeys.map(m => monthRow(monthLabel(m), s.months[m])).join('')}
            <div class="host-popup-total">Earned for host: ${formatTZS(total)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function deleteHost(key) {
    const def = allHostDefs().find(h => h.key === key);
    if (!def) return;
    if (!confirm(`Delete "${def.name}"? Its past bookings will be grouped under "Other units" instead.`)) return;

    try {
      const isCustom = loadCustomHosts().some(c => c.key === key);
      if (isCustom) {
        await deleteCustomHostRemote(key);
      } else {
        await hideHostRemote(key);
      }
      renderHosts();
    } catch (err) {
      alert('Could not delete this host — please try again.');
    }
  }

  // Delegated listeners set up once (not re-attached on every render):
  // - tap/click a delete button removes that host
  // - tap/click a card (mouse hover already shows the quick-totals popup on
  //   its own, via CSS) opens the full booking calendar for that host
  if (hostGrid) {
    hostGrid.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.host-delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        deleteHost(deleteBtn.dataset.key);
        return;
      }

      const card = e.target.closest('.host-card');
      if (!card) return;
      openHostCalendar(card.dataset.key);
    });
  }

  // ---------- Host calendar ----------
  // Shows, day by day for a chosen month, which days a guest checked in
  // with this host — so it's easy to see how many days a month a guest
  // was actually given to them.
  const hostCalendarOverlay = document.getElementById('hostCalendarOverlay');
  const hostCalendarClose = document.getElementById('hostCalendarClose');
  const hostCalendarTitle = document.getElementById('hostCalendarTitle');
  const hostCalendarMonthLabel = document.getElementById('hostCalendarMonthLabel');
  const hostCalendarPrev = document.getElementById('hostCalendarPrev');
  const hostCalendarNext = document.getElementById('hostCalendarNext');
  const hostCalendarGrid = document.getElementById('hostCalendarGrid');
  const hostCalendarSummary = document.getElementById('hostCalendarSummary');

  let calendarHostKey = null;
  let calendarMonthKey = null;

  // day-of-month -> guest names checked in with this host that day
  function hostCheckinsByDay(hostKey, monthKey) {
    const byDay = {};
    allBookings(liveData).forEach(b => {
      if (!b.checkin || bookingMonthKey(b) !== monthKey) return;
      if (normalizeApartment(b.apartment) !== hostKey) return;
      const day = Number(b.checkin.slice(8, 10));
      (byDay[day] = byDay[day] || []).push(b.guest);
    });
    return byDay;
  }

  function openHostCalendar(hostKey) {
    if (!hostCalendarOverlay) return;
    const def = allHostDefs().find(h => h.key === hostKey);
    if (!def) return;

    calendarHostKey = hostKey;
    calendarMonthKey = todayMonthKey();
    if (hostCalendarTitle) hostCalendarTitle.textContent = `${def.icon} ${def.name}`;
    renderHostCalendar();
    hostCalendarOverlay.classList.add('show');
  }

  function closeHostCalendar() {
    if (!hostCalendarOverlay) return;
    hostCalendarOverlay.classList.remove('show');
    calendarHostKey = null;
    calendarMonthKey = null;
  }

  function shiftCalendarMonth(delta) {
    const [year, month] = calendarMonthKey.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    calendarMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    renderHostCalendar();
  }

  function renderHostCalendar() {
    if (!calendarHostKey || !calendarMonthKey || !hostCalendarGrid) return;

    if (hostCalendarMonthLabel) hostCalendarMonthLabel.textContent = monthLabel(calendarMonthKey);

    const byDay = hostCheckinsByDay(calendarHostKey, calendarMonthKey);
    const dayCount = Object.keys(byDay).length;

    const [year, month] = calendarMonthKey.split('-').map(Number);
    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon=0..Sun=6
    const totalDays = new Date(year, month, 0).getDate();
    const todayIso = todayIsoString();

    let cells = '';
    for (let i = 0; i < firstWeekday; i++) cells += `<div class="hcal-cell empty"></div>`;
    for (let day = 1; day <= totalDays; day++) {
      const iso = `${calendarMonthKey}-${String(day).padStart(2, '0')}`;
      const guests = byDay[day];
      const title = guests ? guests.map(escapeHtml).join(', ') : '';
      cells += `<div class="hcal-cell${guests ? ' has-guest' : ''}${iso === todayIso ? ' today' : ''}" title="${title}">
        <span class="hcal-day">${day}</span>${guests ? '<span class="hcal-dot"></span>' : ''}
      </div>`;
    }
    hostCalendarGrid.innerHTML = cells;

    hostCalendarSummary.textContent = dayCount
      ? `${dayCount} day${dayCount === 1 ? '' : 's'} with a guest checked in this month`
      : 'No guests checked in with this host this month';
  }

  function todayIsoString() {
    return todayIsoLocal();
  }

  if (hostCalendarPrev) hostCalendarPrev.addEventListener('click', () => shiftCalendarMonth(-1));
  if (hostCalendarNext) hostCalendarNext.addEventListener('click', () => shiftCalendarMonth(1));
  if (hostCalendarClose) hostCalendarClose.addEventListener('click', closeHostCalendar);
  if (hostCalendarOverlay) {
    hostCalendarOverlay.addEventListener('click', (e) => {
      if (e.target === hostCalendarOverlay) closeHostCalendar();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hostCalendarOverlay && hostCalendarOverlay.classList.contains('show')) closeHostCalendar();
  });

  // ---------- Add host modal ----------
  const addHostBtn = document.getElementById('addHostBtn');
  const hostModalOverlay = document.getElementById('hostModalOverlay');
  const hostModalClose = document.getElementById('hostModalClose');
  const hostModalCancel = document.getElementById('hostModalCancel');
  const hostForm = document.getElementById('hostForm');
  const fHostName = document.getElementById('fHostName');
  const fHostKeywords = document.getElementById('fHostKeywords');
  const hostSubmitBtn = hostForm ? hostForm.querySelector('button[type="submit"]') : null;

  function openHostModal() {
    hostModalOverlay.classList.add('show');
    fHostName.focus();
  }

  function closeHostModal() {
    hostModalOverlay.classList.remove('show');
    hostForm.reset();
  }

  function slugify(name) {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
    return `custom-${base || 'host'}-${Date.now()}`;
  }

  if (addHostBtn) addHostBtn.addEventListener('click', openHostModal);
  if (hostModalClose) hostModalClose.addEventListener('click', closeHostModal);
  if (hostModalCancel) hostModalCancel.addEventListener('click', closeHostModal);
  if (hostModalOverlay) {
    hostModalOverlay.addEventListener('click', (e) => {
      if (e.target === hostModalOverlay) closeHostModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hostModalOverlay && hostModalOverlay.classList.contains('show')) closeHostModal();
  });

  if (hostForm) {
    hostForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = fHostName.value.trim();
      const keywords = fHostKeywords.value
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);

      if (!name || !keywords.length) return;

      const newHost = {
        key: slugify(name),
        name,
        icon: NEW_HOST_ICONS[loadCustomHosts().length % NEW_HOST_ICONS.length],
        keywords,
      };

      if (hostSubmitBtn) hostSubmitBtn.disabled = true;
      try {
        await insertCustomHost(newHost);
        renderHosts();
        closeHostModal();
      } catch (err) {
        alert('Could not add this host — please try again.');
      } finally {
        if (hostSubmitBtn) hostSubmitBtn.disabled = false;
      }
    });
  }

  renderHosts();
})();
