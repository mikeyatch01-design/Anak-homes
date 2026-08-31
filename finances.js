// ---------- Finances dashboard, driven by real booking data ----------
// Data model/helpers live in data.js. Chart-drawing primitives live in
// charts.js. This file computes every number on the page from
// loadBookings() — nothing here is hand-typed/mocked.
//
// Definitions used throughout (Mike is the middleman — the commission
// on each booking is his income, not the host's):
//   Net Income       = commission earned this month
//   Current Balance  = cumulative commission across every recorded month
//   Expenditures     = host payouts made this month (money paid out to hosts)
//   Checked in       = bookings whose check-in date has passed (and
//                       weren't a no-show), for the given month
//   Paid bookings    = guest paid the full amount (remaining === 0)
//   Unpaid bookings  = guest still owes a balance (remaining > 0)
//   Paid to Host     = host's share actually paid out this month
//   Unpaid to Host   = host's share not yet paid out this month

(async function () {
const session = await requireSession();
if (!session) return; // requireSession() is already redirecting to login.html
await initAppData();

const liveData = loadBookings();

// The dashboard highlights the most recent recorded month and the one
// before it — not necessarily the literal current calendar month, since
// a fresh month has no data yet to summarize.
const dataMonthKeys = monthKeysOf(liveData);
const CURRENT_MONTH = dataMonthKeys[dataMonthKeys.length - 1];
const PREVIOUS_MONTH = dataMonthKeys[dataMonthKeys.length - 2];

// ---------- Aggregation helpers ----------
function sumField(rows, key) {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

function monthRows(month) { return liveData[month] || []; }
function monthCommission(month) { return sumField(monthRows(month), 'commission'); }
function monthHostShare(month) { return sumField(monthRows(month), 'hostShare'); }
function monthHostPaid(month) { return monthRows(month).reduce((s, r) => s + parseHostPaid(r.hostPaid), 0); }

function isCheckedIn(booking, today) {
  if (booking.status === "DIDN'T STAY") return false;
  if (!booking.checkin) return false;
  return new Date(booking.checkin + 'T00:00:00') <= today;
}
function monthCheckedInCount(month, today) {
  return monthRows(month).filter(b => isCheckedIn(b, today)).length;
}

function pctDelta(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function paymentSplit(month) {
  const rows = monthRows(month);
  const total = rows.length || 1;
  const full = rows.filter(r => Number(r.remaining) === 0);
  const half = rows.filter(r => Number(r.remaining) > 0);
  return {
    fullCount: full.length,
    halfCount: half.length,
    fullPct: Math.round((full.length / total) * 100),
    halfPct: Math.round((half.length / total) * 100),
    fullAmount: sumField(full, 'amountPaid'),
    halfAmount: sumField(half, 'remaining'),
  };
}

// Commission is only "fully paid" once the guest has cleared their full
// balance (remaining === 0); commission on a booking the guest still
// owes money on is still "upcoming".
function commissionSplit(month) {
  const rows = monthRows(month);
  const paid = rows.filter(r => Number(r.remaining) === 0);
  const upcoming = rows.filter(r => Number(r.remaining) > 0);
  return {
    paidAmount: sumField(paid, 'commission'),
    upcomingAmount: sumField(upcoming, 'commission'),
  };
}

// Per-host split of this month's payouts, grouped the same way the Host
// page groups bookings (by normalized apartment/property name) — how
// much has actually gone out to each host, and how much of their share
// is still outstanding.
function hostPaymentBreakdown(month) {
  const buckets = {};
  allHostDefs().forEach(h => { buckets[h.key] = { name: h.name, icon: h.icon, paid: 0, unpaid: 0 }; });

  monthRows(month).forEach(b => {
    const bucket = buckets[normalizeApartment(b.apartment)];
    const paid = parseHostPaid(b.hostPaid);
    const owed = Math.max((Number(b.hostShare) || 0) - paid, 0);
    bucket.paid += paid;
    bucket.unpaid += owed;
  });

  const hosts = Object.values(buckets);
  return {
    paid: hosts.filter(h => h.paid > 0).sort((a, b) => b.paid - a.paid),
    unpaid: hosts.filter(h => h.unpaid > 0).sort((a, b) => b.unpaid - a.unpaid),
  };
}

function weekdayDistribution() {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
  allBookings(liveData).forEach(b => {
    if (!b.checkin) return;
    const day = new Date(b.checkin + 'T00:00:00').getDay(); // 0=Sun..6=Sat
    counts[(day + 6) % 7]++; // shift so Mon=0..Sun=6
  });
  return counts;
}

function daysInMonth(month) {
  const [year, mo] = month.split('-').map(Number);
  return new Date(year, mo, 0).getDate();
}

function dailyCommission(month) {
  const arr = new Array(daysInMonth(month)).fill(0);
  monthRows(month).forEach(b => {
    if (!b.dateBooked) return;
    const day = Number(b.dateBooked.split('-')[2]);
    if (day >= 1 && day <= arr.length) arr[day - 1] += Number(b.commission) || 0;
  });
  return arr;
}

// Every booking with a check-in date, across all recorded months — not
// just CURRENT_MONTH, since an upcoming stay can be booked ahead into a
// future month. Ordered so the ones closest to "now" lead: upcoming
// check-ins first (soonest first), then past ones after (most recent
// first) — recently-checked-in and soon-to-check-in both bubble up.
function bookingsFeed(count) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return allBookings(liveData)
    .filter(b => b.checkin)
    .map(b => ({ ...b, daysUntil: Math.round((new Date(b.checkin + 'T00:00:00') - today) / 86400000) }))
    .sort((a, b) => {
      const aUpcoming = a.daysUntil >= 0, bUpcoming = b.daysUntil >= 0;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? a.daysUntil - b.daysUntil : b.daysUntil - a.daysUntil;
    })
    .slice(0, count);
}

function checkinCountdownLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `${days} days`;
  return `${Math.abs(days)} days ago`;
}

// ---------- Rendering: summary + KPI cards ----------
function setDelta(el, pct) {
  if (!el) return;
  if (pct == null || !isFinite(pct)) { el.innerHTML = ''; return; }
  const dir = pct >= 0 ? 'up' : 'down';
  const arrow = pct >= 0 ? '↑' : '↓';
  el.className = 'delta ' + dir;
  el.innerHTML = `${arrow} ${Math.abs(pct).toFixed(1)}% <span class="muted">since last month</span>`;
}

function renderSummary() {
  const today = new Date();

  const netIncome = monthCommission(CURRENT_MONTH);
  const netIncomePrev = monthCommission(PREVIOUS_MONTH);
  const el = (id) => document.getElementById(id);
  if (el('netIncomeValue')) el('netIncomeValue').textContent = formatTZS(netIncome);
  setDelta(el('netIncomeDelta'), pctDelta(netIncome, netIncomePrev));

  const cumulativeAll = dataMonthKeys.reduce((s, m) => s + monthCommission(m), 0);
  const cumulativePriorToThisMonth = cumulativeAll - netIncome;
  if (el('currentBalanceValue')) el('currentBalanceValue').textContent = formatTZS(cumulativeAll);
  // Growth of the balance itself (new total vs. prior total) — NOT
  // netIncome vs. prior total, which would compare a monthly flow
  // against a cumulative stock and produce a misleading percentage.
  setDelta(el('currentBalanceDelta'), pctDelta(cumulativeAll, cumulativePriorToThisMonth));

  // Total Received = commission (Mike's cut) + host payouts, summed
  // across every recorded month — the full amount that has moved
  // through the business, not just what came in this month.
  const totalHostPaidAll = dataMonthKeys.reduce((s, m) => s + monthHostPaid(m), 0);
  const totalReceivedAll = cumulativeAll + totalHostPaidAll;
  const totalReceivedThisMonth = netIncome + monthHostPaid(CURRENT_MONTH);
  const totalReceivedPriorToThisMonth = totalReceivedAll - totalReceivedThisMonth;
  if (el('totalReceivedValue')) el('totalReceivedValue').textContent = formatTZS(totalReceivedAll);
  setDelta(el('totalReceivedDelta'), pctDelta(totalReceivedAll, totalReceivedPriorToThisMonth));

  const bookingsCount = monthRows(CURRENT_MONTH).length;
  const bookingsCountPrev = monthRows(PREVIOUS_MONTH).length;
  if (el('bookingsCountValue')) el('bookingsCountValue').textContent = bookingsCount;
  setDelta(el('bookingsCountDelta'), pctDelta(bookingsCount, bookingsCountPrev));

  const checkedIn = monthCheckedInCount(CURRENT_MONTH, today);
  const checkedInPrev = monthCheckedInCount(PREVIOUS_MONTH, today);
  if (el('checkedInValue')) el('checkedInValue').textContent = checkedIn;
  setDelta(el('checkedInDelta'), pctDelta(checkedIn, checkedInPrev));

  const paidToHost = monthHostPaid(CURRENT_MONTH);
  const unpaidToHost = Math.max(monthHostShare(CURRENT_MONTH) - monthHostPaid(CURRENT_MONTH), 0);
  if (el('paidToHostValue')) el('paidToHostValue').textContent = formatTZS(paidToHost);
  if (el('unpaidToHostValue')) el('unpaidToHostValue').textContent = formatTZS(unpaidToHost);

  const commSplit = commissionSplit(CURRENT_MONTH);
  if (el('upcomingCommissionValue')) el('upcomingCommissionValue').textContent = formatTZS(commSplit.upcomingAmount);
  if (el('paidCommissionValue')) el('paidCommissionValue').textContent = formatTZS(commSplit.paidAmount);

  const currentMonthLabel = CURRENT_MONTH ? monthLabel(CURRENT_MONTH) : '—';
  ['ring1MonthLabel', 'ring2MonthLabel', 'comm1MonthLabel', 'comm2MonthLabel'].forEach(id => {
    if (el(id)) el(id).textContent = currentMonthLabel;
  });

  const split = paymentSplit(CURRENT_MONTH);
  if (el('paidDonutTotal')) el('paidDonutTotal').textContent = formatTZSCompact(split.fullAmount);
  if (el('unpaidDonutTotal')) el('unpaidDonutTotal').textContent = formatTZSCompact(split.halfAmount);
  if (el('paidLegendFullPct')) el('paidLegendFullPct').textContent = split.fullPct + '%';
  if (el('paidLegendHalfPct')) el('paidLegendHalfPct').textContent = split.halfPct + '%';
  if (el('unpaidLegendFullPct')) el('unpaidLegendFullPct').textContent = split.fullPct + '%';
  if (el('unpaidLegendHalfPct')) el('unpaidLegendHalfPct').textContent = split.halfPct + '%';
  if (el('unpaidFootnote')) {
    el('unpaidFootnote').textContent = `${split.halfCount} booking${split.halfCount === 1 ? '' : 's'} not fully paid`;
  }
}

function renderHostBreakdown() {
  const paidList = document.getElementById('paidHostList');
  const unpaidList = document.getElementById('unpaidHostList');
  if (!paidList && !unpaidList) return;

  const breakdown = hostPaymentBreakdown(CURRENT_MONTH);
  const row = (h, amount) => `
    <li class="host-mini-item">
      <span class="host-mini-name">${h.icon} ${escapeHtml(h.name)}</span>
      <span class="host-mini-amount">${formatTZS(amount)}</span>
    </li>
  `;

  if (paidList) {
    paidList.innerHTML = breakdown.paid.length
      ? breakdown.paid.map(h => row(h, h.paid)).join('')
      : `<li class="host-mini-empty">No payouts recorded yet.</li>`;
  }
  if (unpaidList) {
    unpaidList.innerHTML = breakdown.unpaid.length
      ? breakdown.unpaid.map(h => row(h, h.unpaid)).join('')
      : `<li class="host-mini-empty">Every host is fully paid.</li>`;
  }
}

let lastCheckinRenderDate = null;

function renderBookingsFeed() {
  const tbody = document.getElementById('bookingsFeedBody');
  if (!tbody) return;
  lastCheckinRenderDate = new Date().toDateString();

  const rows = bookingsFeed(8);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="checkin-empty">No bookings to show.</td></tr>`;
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  tbody.innerHTML = rows.map(b => {
    const pillClass = b.daysUntil === 0 ? ' today' : b.daysUntil < 0 ? ' past' : '';
    return `
    <tr>
      <td><span class="mini-avatar">${escapeHtml(initials(b.guest))}</span>${escapeHtml(b.guest)}</td>
      <td>${escapeHtml(b.apartment) || '—'}</td>
      <td><span class="checkin-countdown${pillClass}">${checkinCountdownLabel(b.daysUntil)}</span></td>
      <td>${statusPill(computeBookingStatus(b, today))}</td>
      <td>${formatTZS(b.total)}</td>
    </tr>
  `;
  }).join('');
}

// ---------- Keep the countdown correct as days pass, tab left open ----------
function msUntilNextLocalMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return next - now;
}

function scheduleCheckinRefresh() {
  setTimeout(() => {
    renderBookingsFeed();
    scheduleCheckinRefresh();
  }, msUntilNextLocalMidnight());
}

// A sleeping/backgrounded laptop can miss the midnight setTimeout entirely
// (it doesn't fire while suspended) — catch that on wake by re-rendering
// whenever the calendar day has moved on since the last render.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (new Date().toDateString() !== lastCheckinRenderDate) renderBookingsFeed();
});

// ---------- Charts ----------
const bookingsMonthsData = { labels: dataMonthKeys.map(monthShortLabel), data: dataMonthKeys.map(m => monthRows(m).length) };
const bookingsDaysData = { labels: WEEKDAY_LABELS, data: weekdayDistribution() };
const bookingsDataSets = { months: bookingsMonthsData, days: bookingsDaysData };

const incomeMonthlyData = { labels: dataMonthKeys.map(monthShortLabel), keys: dataMonthKeys, data: dataMonthKeys.map(m => monthCommission(m)), axisStep: 500000 };
const currentMonthDailyCommission = dailyCommission(CURRENT_MONTH);
const incomeDailyData = { labels: currentMonthDailyCommission.map((_, i) => String(i + 1)), data: currentMonthDailyCommission, axisStep: 50000 };
const incomeDataSets = { monthly: incomeMonthlyData, daily: incomeDailyData };

let bookingsMode = 'months';
let incomeMode = 'monthly';
let incomeHoverIndex = null;
let incomePoints = [];

function renderIncomeChart() {
  const income = incomeDataSets[incomeMode];
  incomePoints = drawLineChart('lineChart', income.labels, income.data, '#A78BFA', income.axisStep, incomeHoverIndex);
}

function redrawAllCharts() {
  const split = paymentSplit(CURRENT_MONTH);
  // Same underlying split feeds both donuts — they're two views of the
  // same booking pool (full paid vs half paid), so they stay in sync.
  const paymentSplitSegments = [
    { value: split.fullCount, color: '#3B82F6' }, // Full paid
    { value: split.halfCount, color: '#F5B942' }, // Half paid
  ];
  drawDonut('donutBookings', paymentSplitSegments);
  drawDonut('donutUnpaid', paymentSplitSegments);

  const bookings = bookingsDataSets[bookingsMode];
  drawBarChart('barChart', bookings.labels, bookings.data, '#3B82F6', 10);

  renderIncomeChart();
}

// ---------- Chart mode toggles (Months/Days, Monthly/Daily) ----------
document.querySelectorAll('.toggle-group').forEach(group => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn || btn.classList.contains('active')) return;

    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (group.dataset.chart === 'bookings') {
      bookingsMode = btn.dataset.mode;
    } else if (group.dataset.chart === 'income') {
      incomeMode = btn.dataset.mode;
      hideIncomeTooltip();
    }
    redrawAllCharts();
  });
});

// ---------- Income chart tooltip (hover / touch) ----------
const lineCanvas = document.getElementById('lineChart');
const incomeTooltip = document.getElementById('incomeTooltip');

function incomePointLabel(index) {
  const income = incomeDataSets[incomeMode];
  if (incomeMode === 'monthly') return monthLabel(income.keys[index]);
  return `${income.labels[index]} ${monthLabel(CURRENT_MONTH)}`;
}

function showIncomeTooltip(index) {
  if (!lineCanvas || !incomeTooltip) return;
  incomeHoverIndex = index;
  renderIncomeChart();

  const p = incomePoints[index];
  if (!p) return;

  const income = incomeDataSets[incomeMode];
  incomeTooltip.innerHTML =
    `<span class="tt-label">${incomePointLabel(index)}</span>` +
    `<span class="tt-value">${formatTZS(income.data[index])}</span>`;
  incomeTooltip.style.left = p.x + 'px';
  incomeTooltip.style.top = p.y + 'px';
  incomeTooltip.classList.add('show');
}

function hideIncomeTooltip() {
  if (!incomeTooltip) return;
  incomeHoverIndex = null;
  incomeTooltip.classList.remove('show');
  renderIncomeChart();
}

function nearestIncomeIndex(clientX) {
  const rect = lineCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  let nearest = 0, minDist = Infinity;
  incomePoints.forEach((p, i) => {
    const d = Math.abs(p.x - x);
    if (d < minDist) { minDist = d; nearest = i; }
  });
  return nearest;
}

if (lineCanvas) {
  lineCanvas.addEventListener('mousemove', (e) => showIncomeTooltip(nearestIncomeIndex(e.clientX)));
  lineCanvas.addEventListener('mouseleave', hideIncomeTooltip);

  lineCanvas.addEventListener('touchstart', (e) => {
    showIncomeTooltip(nearestIncomeIndex(e.touches[0].clientX));
  }, { passive: true });
  lineCanvas.addEventListener('touchmove', (e) => {
    showIncomeTooltip(nearestIncomeIndex(e.touches[0].clientX));
    e.preventDefault();
  }, { passive: false });
  lineCanvas.addEventListener('touchend', hideIncomeTooltip);
  lineCanvas.addEventListener('touchcancel', hideIncomeTooltip);
}

// ---------- React to theme/resize changes dispatched by script.js ----------
document.addEventListener('themechange', redrawAllCharts);
document.addEventListener('appresize', () => { hideIncomeTooltip(); redrawAllCharts(); });

// ---------- Init ----------
renderSummary();
renderHostBreakdown();
renderBookingsFeed();
scheduleCheckinRefresh();
redrawAllCharts();
})();
