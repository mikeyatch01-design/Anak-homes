// ---------- Finances dashboard, driven by real booking data ----------
// Data model/helpers live in data.js. This file computes every number on
// the page from loadBookings() — nothing here is hand-typed/mocked.
//
// Definitions used throughout (Mike is the middleman — the commission
// on each booking is his income, not the host's):
//   Net Income       = commission earned this month
//   Current Balance  = money actually in the account: everything guests have
//                      paid, minus what's already been paid out to hosts
//   Total Received   = commission + host payouts, across every month
//   Upcoming         = commission on bookings the guest hasn't fully paid
//   Paid bookings    = guest paid the full amount (remaining === 0)
//   Paid to Host     = host's share actually paid out this month
//   Unpaid to Host   = host's share not yet paid out this month

(async function () {
const session = await requireSession();
if (!session) return; // requireSession() is already redirecting to login.html
await initAppData();

const liveData = loadBookings();

// The dashboard shows one month at a time — or "All months" together —
// picked in the header (and remembered). Every calendar month from the
// first booking up to today can be picked, even ones with no bookings.
// By default it's the most recent month that has bookings. "Previous" is
// the calendar month before the one being viewed.
const dataMonthKeys = monthKeysOf(liveData);
const MONTH_KEY_STORE = 'anak-dashboard-month';
const ALL = 'all';
let CURRENT_MONTH, PREVIOUS_MONTH, CURRENT_LABEL;

function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function setMonth(key) {
  if (key === ALL && dataMonthKeys.length) {
    CURRENT_MONTH = ALL;
    PREVIOUS_MONTH = undefined;
    CURRENT_LABEL = 'All months';
    return;
  }
  CURRENT_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/.test(key || '') ? key : dataMonthKeys[dataMonthKeys.length - 1];
  PREVIOUS_MONTH = CURRENT_MONTH ? shiftMonth(CURRENT_MONTH, -1) : undefined;
  CURRENT_LABEL = CURRENT_MONTH ? monthLabel(CURRENT_MONTH) : 'No bookings yet';
}
// Every recorded month up to and including the one being viewed — "as of"
// figures (balance, total received) stop at the viewed month.
function monthsUpToCurrent() {
  if (CURRENT_MONTH === ALL) return dataMonthKeys;
  return dataMonthKeys.filter(k => k <= CURRENT_MONTH);
}
let storedMonth = null;
try { storedMonth = localStorage.getItem(MONTH_KEY_STORE); } catch (e) {}
setMonth(storedMonth);

const el = (id) => document.getElementById(id);

// ---------- Entrance animation fallback ----------
document.querySelectorAll('.appear').forEach(node => {
  node.addEventListener('animationend', () => node.classList.add('is-in'), { once: true });
});

// ---------- Aggregation helpers ----------
function sumField(rows, key) {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

function monthRows(month) {
  if (month === ALL) return allBookings(liveData);
  return (month && liveData[month]) || [];
}
function monthCommission(month) { return sumField(monthRows(month), 'commission'); }
function monthHostShare(month) { return sumField(monthRows(month), 'hostShare'); }
function monthHostPaid(month) { return monthRows(month).reduce((s, r) => s + parseHostPaid(r.hostPaid), 0); }

function pctDelta(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function paymentSplit(month) {
  const rows = monthRows(month);
  const full = rows.filter(r => Number(r.remaining) === 0);
  const half = rows.filter(r => Number(r.remaining) > 0);
  return {
    total: rows.length,
    fullCount: full.length,
    halfCount: half.length,
    fullPct: rows.length ? Math.round((full.length / rows.length) * 100) : 0,
    fullAmount: sumField(full, 'amountPaid'),
    halfAmount: sumField(half, 'remaining'),
  };
}

// Commission is only "fully paid" once the guest has cleared their full
// balance (remaining === 0); commission on a booking the guest still
// owes money on is still "upcoming".
function commissionSplit(month) {
  const rows = monthRows(month);
  return {
    paidAmount: sumField(rows.filter(r => Number(r.remaining) === 0), 'commission'),
    upcomingAmount: sumField(rows.filter(r => Number(r.remaining) > 0), 'commission'),
  };
}

function daysInMonth(month) {
  const [year, mo] = month.split('-').map(Number);
  return new Date(year, mo, 0).getDate();
}

function dailyCommission(month) {
  if (!month) return [];
  const arr = new Array(daysInMonth(month)).fill(0);
  monthRows(month).forEach(b => {
    if (!b.dateBooked) return;
    const day = Number(b.dateBooked.split('-')[2]);
    if (day >= 1 && day <= arr.length) arr[day - 1] += Number(b.commission) || 0;
  });
  return arr;
}

// Every booking with a check-in date, across all recorded months. Upcoming
// check-ins first (soonest first), then past ones (most recent first).
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
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// ---------- Small formatting helpers ----------
// Full figure ("TZS 2,000,000") with the currency set smaller.
function moneyHTML(val) {
  return '<span class="cur">TZS</span>' + escapeHtml(formatTZS(val).replace(/^TZS /, ''));
}

function setDelta(node, pct) {
  if (!node) return;
  if (pct == null || !isFinite(pct)) { node.className = ''; node.textContent = ''; return; }
  const rounded = Math.round(pct * 10) / 10;
  node.className = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  node.textContent = (rounded > 0 ? '+' : rounded < 0 ? '−' : '') + Math.abs(rounded).toFixed(1) + '%';
  node.title = 'Compared with last month';
}

// Catmull-Rom → cubic Bézier, for calm curves.
function smoothPath(pts) {
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function scalePoints(values, W, H, padTop, padBottom) {
  const vals = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  return vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    padTop + (1 - (v - min) / span) * (H - padTop - padBottom),
  ]);
}

function drawSquiggle(svgId, values) {
  const svg = el(svgId);
  if (!svg || values.length < 2) { if (svg) svg.innerHTML = ''; return; }
  svg.innerHTML = `<path d="${smoothPath(scalePoints(values, 76, 32, 4, 4).map(([x, y]) => [x + 2, y]))}"/>`;
}

// ---------- Rendering: header + row 1 ----------
function renderHeader() {
  // Greeting follows the time of day on this device.
  const h = new Date().getHours();
  const part = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 21 ? 'Good evening' : 'Good night';
  el('greetTitle').textContent = `${part}, Anak`;
}
// Keep it right if the tab stays open across a change (checked each minute).
setInterval(renderHeader, 60000);

function renderQuickFigures() {
  const netIncome = monthCommission(CURRENT_MONTH);
  el('netIncomeValue').innerHTML = moneyHTML(netIncome);
  setDelta(el('netIncomeDelta'), pctDelta(netIncome, monthCommission(PREVIOUS_MONTH)));

  // Mini bars: commission for the (up to) six months ending at this one.
  const upTo = monthsUpToCurrent();
  const recent = upTo.slice(-6).map(monthCommission);
  const peak = Math.max(...recent, 1);
  el('netIncomeBars').innerHTML = recent.map(v => `<i style="height:${Math.max(8, Math.round(v / peak * 100))}%"></i>`).join('');

  const bookingsCount = monthRows(CURRENT_MONTH).length;
  el('bookingsCountValue').textContent = bookingsCount;
  setDelta(el('bookingsCountDelta'), pctDelta(bookingsCount, monthRows(PREVIOUS_MONTH).length));
  drawSquiggle('bookingsSquiggle', upTo.map(m => monthRows(m).length));

  // Upcoming = commission on bookings the guest hasn't fully paid yet.
  const upcoming = commissionSplit(CURRENT_MONTH).upcomingAmount;
  el('upcomingStatValue').innerHTML = moneyHTML(upcoming);
  setDelta(el('upcomingDelta'), pctDelta(upcoming, commissionSplit(PREVIOUS_MONTH).upcomingAmount));

  // Total received = commission + host payouts, across every month up to
  // the one being viewed.
  let running = 0;
  const receivedSeries = upTo.map(m => (running += monthCommission(m) + monthHostPaid(m)));
  const receivedThisMonth = netIncome + monthHostPaid(CURRENT_MONTH);
  el('totalReceivedValue').innerHTML = moneyHTML(running);
  setDelta(el('totalReceivedDelta'), pctDelta(running, running - receivedThisMonth));
  drawSquiggle('receivedSquiggle', receivedSeries);
}

// ---------- Overall income (the one chart) ----------
const incomeMonthly = {
  labels: dataMonthKeys.map(monthLabel),
  data: dataMonthKeys.map(monthCommission),
};
let incomeDaily = { labels: [], data: [] };
function buildDaily() {
  // Day-by-day only makes sense for a single month.
  const single = CURRENT_MONTH && CURRENT_MONTH !== ALL;
  const dailyBtn = document.querySelector('.seg-btn[data-mode="daily"]');
  dailyBtn.disabled = !single;
  if (!single && incomeMode === 'daily') document.querySelector('.seg-btn[data-mode="monthly"]').click();
  const daily = single ? dailyCommission(CURRENT_MONTH) : [];
  incomeDaily = { labels: daily.map((_, i) => `${i + 1} ${CURRENT_LABEL}`), data: daily };
}
let incomeMode = 'monthly';
let incomePts = [];

function renderIncomeCard() {
  const netIncome = monthCommission(CURRENT_MONTH);
  const prevIncome = monthCommission(PREVIOUS_MONTH);
  const deltaPct = pctDelta(netIncome, prevIncome);

  // Current balance = the money actually in the account, as of the viewed
  // month: everything guests have paid in, minus every payout already made
  // to hosts. Paying a host lowers it; commission alone is Net income.
  const cashIn = (m) => sumField(monthRows(m), 'amountPaid') - monthHostPaid(m);
  const balance = monthsUpToCurrent().reduce((s, m) => s + cashIn(m), 0);
  const balanceBefore = CURRENT_MONTH === ALL ? null : balance - cashIn(CURRENT_MONTH);
  el('currentBalanceValue').textContent = formatTZS(balance);
  setDelta(el('currentBalanceDelta'), balanceBefore == null ? null : pctDelta(balance, balanceBefore));

  el('thisMonthLabel').textContent = CURRENT_MONTH === ALL ? 'All months'
    : CURRENT_MONTH ? MONTHS_FULL[Number(CURRENT_MONTH.slice(5)) - 1] : 'This month';
  el('thisMonthIncome').textContent = formatTZS(netIncome);
  setDelta(el('thisMonthDelta'), deltaPct);

  const badge = el('incomeBadge');
  if (deltaPct == null) {
    badge.innerHTML = '';
  } else if (deltaPct >= 0) {
    badge.className = 'badge-ok';
    badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg>On track';
  } else {
    badge.className = 'badge-ok is-down';
    badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8l8 8M16 8l-8 8"/></svg>Below last month';
  }
}

function drawIncomeChart() {
  const wrap = el('incomeChart');
  const set = incomeMode === 'monthly' ? incomeMonthly : incomeDaily;
  const tip = el('incomeTip');
  [...wrap.querySelectorAll('svg, .chart-dot')].forEach(n => n.remove());
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', incomeMode === 'monthly'
    ? 'Commission per month: ' + set.labels.map((l, i) => `${l} ${formatTZS(set.data[i])}`).join(', ')
    : `Commission per day in ${CURRENT_LABEL}`);
  if (!set.data.length) { incomePts = []; return; }

  const W = 600, H = 170;
  const pts = scalePoints(set.data, W, H, 62, 24);
  incomePts = pts;
  const line = smoothPath(pts);
  wrap.insertAdjacentHTML('afterbegin',
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">` +
      '<defs><linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#D2A059" stop-opacity=".28"/><stop offset="1" stop-color="#D2A059" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      `<path d="${line} L${W},${H} L0,${H} Z" fill="url(#areaGold)"/>` +
      `<path class="line" d="${line}"/>` +
    '</svg>');
  wrap.insertAdjacentHTML('beforeend', '<span class="chart-dot" id="incomeDot"></span>');
  tip.classList.remove('show');
}

function showIncomeTip(clientX) {
  const wrap = el('incomeChart');
  const set = incomeMode === 'monthly' ? incomeMonthly : incomeDaily;
  if (!incomePts.length || !set.data.length) return;
  const rect = wrap.getBoundingClientRect();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  const i = Math.round(ratio * (set.data.length - 1));
  const p = incomePts[Math.min(i, incomePts.length - 1)];
  const x = (p[0] / 600) * rect.width;
  const y = (p[1] / 170) * rect.height;
  const tip = el('incomeTip');
  const dot = el('incomeDot');
  tip.innerHTML = `<span>${escapeHtml(set.labels[i])}</span><b>${formatTZS(set.data[i])}</b>`;
  tip.style.left = Math.min(Math.max(x, 70), rect.width - 70) + 'px';
  tip.style.top = y + 'px';
  dot.style.left = x + 'px';
  dot.style.top = y + 'px';
  tip.classList.add('show');
  dot.classList.add('show');
}
function hideIncomeTip() {
  el('incomeTip').classList.remove('show');
  const dot = el('incomeDot');
  if (dot) dot.classList.remove('show');
}

// ---------- Paid bookings (gauge) ----------
function renderPaidBookings() {
  const split = paymentSplit(CURRENT_MONTH);
  el('paidPeriod').textContent = CURRENT_MONTH === ALL ? 'Fully paid, all months' : 'Fully paid this month';
  el('paidAmount').textContent = formatTZS(split.fullAmount);
  el('paidSub').textContent = split.total
    ? `${split.fullCount} of ${split.total} booking${split.total === 1 ? '' : 's'} fully paid`
    : 'No bookings in this month';
  el('paidPct').textContent = split.fullPct + '%';
  el('gaugeFill').style.setProperty('--p', split.fullPct);
  el('paidGauge').setAttribute('aria-label', `${split.fullPct} percent of this month's bookings are fully paid`);
  el('owedLine').innerHTML = split.halfCount
    ? `<b>${escapeHtml(formatTZS(split.halfAmount))}</b> still owed on ${split.halfCount} booking${split.halfCount === 1 ? '' : 's'}`
    : 'Nothing still owed';
}

// ---------- Commission ----------
function renderCommission() {
  const c = commissionSplit(CURRENT_MONTH);
  el('commTitle').textContent = CURRENT_MONTH === ALL ? 'Commission, all months' : 'Commission this month';
  el('paidCommissionValue').textContent = formatTZS(c.paidAmount);
  el('upcomingCommissionValue').textContent = formatTZS(c.upcomingAmount);
}

// ---------- Booking activity ----------
// The same feed as the old dashboard table: upcoming check-ins first
// (soonest at the top), then past ones (most recent first). The card
// scrolls inside itself rather than cutting the list short.
let lastFeedRenderDate = null;
function renderBookingsFeed() {
  const body = el('bookingsFeed');
  lastFeedRenderDate = new Date().toDateString();
  const rows = bookingsFeed(25);
  const upcomingCount = rows.filter(b => b.daysUntil >= 0).length;
  el('feedCount').textContent = upcomingCount ? `${upcomingCount} upcoming` : '';
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="feed-empty">No bookings to show yet.</td></tr>';
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  body.innerHTML = rows.map(b => {
    const when = b.daysUntil === 0 ? 'today' : b.daysUntil < 0 ? 'past' : 'soon';
    const status = STATUS_META[computeBookingStatus(b, today)] || STATUS_META.UPCOMING;
    return `
      <tr class="${b.daysUntil < 0 ? 'is-past' : ''}">
        <td><span class="feed-guest"><span class="mini-avatar" aria-hidden="true">${escapeHtml(initials(b.guest))}</span><b>${escapeHtml(b.guest || 'Guest')}</b></span></td>
        <td><span class="feed-apt">${escapeHtml(b.apartment) || '—'}</span></td>
        <td><span class="when ${when}">${checkinCountdownLabel(b.daysUntil)}</span></td>
        <td><span class="status ${status.cls}">${status.label}</span></td>
        <td class="num">${escapeHtml(formatTZS(b.total).replace(/^TZS /, ''))}</td>
      </tr>`;
  }).join('');
}

// Keep the countdown right as days pass with the tab left open.
function msUntilNextLocalMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5) - now;
}
(function scheduleFeedRefresh() {
  setTimeout(() => { renderBookingsFeed(); scheduleFeedRefresh(); }, msUntilNextLocalMidnight());
})();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && new Date().toDateString() !== lastFeedRenderDate) renderBookingsFeed();
});

// ---------- Paid to host (this month only) ----------
function renderHost() {
  const paid = monthHostPaid(CURRENT_MONTH);
  const unpaid = Math.max(monthHostShare(CURRENT_MONTH) - paid, 0);
  el('paidToHostValue').textContent = formatTZS(paid);
  el('unpaidToHostValue').textContent = formatTZS(unpaid);
  el('hostMonthLabel').textContent = CURRENT_LABEL;
}

// ---------- Booking report (pops up from the Bookings card) ----------
// Every booking in the viewed month, by where it stands today. "Cancelled /
// removed" counts that month's bookings sitting in the Trash.
function renderReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = { UPCOMING: 0, ACTIVE: 0, COMPLETED: 0, "DIDN'T STAY": 0 };
  const rows = monthRows(CURRENT_MONTH);
  rows.forEach(b => { counts[computeBookingStatus(b, today)]++; });
  const removed = loadTrashedBookings().filter(b => CURRENT_MONTH === ALL || b._monthKey === CURRENT_MONTH).length;
  el('reportMonth').textContent = CURRENT_LABEL;
  el('repTotal').textContent = rows.length;
  el('repUpcoming').textContent = counts.UPCOMING;
  el('repActive').textContent = counts.ACTIVE;
  el('repCompleted').textContent = counts.COMPLETED;
  el('repNoShow').textContent = counts["DIDN'T STAY"];
  el('repRemoved').textContent = removed;
  el('repAllTime').textContent = allBookings(liveData).length;
}

// ---------- Rolling paper: cards curl back into the top bar ----------
// As a card's top edge reaches the bar, it tips back (rotateX around its
// bottom edge, so the top recedes into the bar), shrinks a touch and fades — as if the page were a sheet being
// rolled up into the bar. Purely visual; skipped for reduced motion.
const rollCards = [...document.querySelectorAll('.bento > .card, .bento > .stat-slot')];
const topbarEl = el('topbar');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let rollQueued = false;
function roll() {
  rollQueued = false;
  if (reduceMotion.matches) return;
  const edge = topbarEl.getBoundingClientRect().bottom;
  rollCards.forEach(card => {
    const r = card.getBoundingClientRect();
    // 0 while the card is clear of the bar, rising to 1 as most of it has
    // slid underneath.
    const p = Math.min(Math.max((edge + 24 - r.top) / Math.max(r.height * 0.85, 120), 0), 1);
    if (p === 0) {
      if (card.style.transform) { card.style.transform = ''; card.style.opacity = ''; }
      return;
    }
    const eased = p * p * (3 - 2 * p);
    card.style.transform = `perspective(1100px) rotateX(${(eased * 38).toFixed(2)}deg) scale(${(1 - eased * 0.07).toFixed(3)})`;
    card.style.opacity = (1 - eased * 0.75).toFixed(3);
  });
}
function queueRoll() { if (!rollQueued) { rollQueued = true; requestAnimationFrame(roll); } }
window.addEventListener('scroll', queueRoll, { passive: true });
window.addEventListener('resize', queueRoll);

// ---------- Interactions ----------
const reportBtn = el('reportBtn');
const reportPop = el('reportPop');
function setReport(open) {
  reportPop.hidden = !open;
  reportBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
reportBtn.addEventListener('click', e => { e.stopPropagation(); setReport(reportPop.hidden); });
el('reportClose').addEventListener('click', () => { setReport(false); reportBtn.focus(); });
document.addEventListener('click', e => { if (!reportPop.hidden && !reportPop.contains(e.target)) setReport(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !reportPop.hidden) { setReport(false); reportBtn.focus(); }
});

document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    document.querySelectorAll('.seg-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    incomeMode = btn.dataset.mode;
    drawIncomeChart();
  });
});

const chartWrap = el('incomeChart');
chartWrap.addEventListener('mousemove', e => showIncomeTip(e.clientX));
chartWrap.addEventListener('mouseleave', hideIncomeTip);
chartWrap.addEventListener('touchstart', e => showIncomeTip(e.touches[0].clientX), { passive: true });
chartWrap.addEventListener('touchmove', e => showIncomeTip(e.touches[0].clientX), { passive: true });
chartWrap.addEventListener('touchend', hideIncomeTip);

const profileBtn = el('profileBtn');
const profileMenu = el('profileMenu');
function setMenu(open) {
  profileMenu.hidden = !open;
  profileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
profileBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(profileMenu.hidden); });
document.addEventListener('click', e => { if (!profileMenu.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !profileMenu.hidden) { setMenu(false); profileBtn.focus(); }
});
// (The menu's "Sign out" is #signOutLink, which auth.js wires up.)

// ---------- Month picker (grid panel, shared with Bookings) ----------
const monthPicker = createMonthPicker(el('monthPicker'), {
  allowAll: true,
  getValue: () => CURRENT_MONTH,
  hasData: (key) => !!(liveData[key] || []).length,
  onSelect: (key) => {
    setMonth(key);
    try { localStorage.setItem(MONTH_KEY_STORE, CURRENT_MONTH); } catch (e) {}
    renderMonth();
  },
});

// ---------- Init ----------
function renderMonth() {
  buildDaily();
  renderHeader();
  renderQuickFigures();
  renderIncomeCard();
  drawIncomeChart();
  renderPaidBookings();
  renderCommission();
  renderHost();
  renderReport();
}
renderMonth();
renderBookingsFeed();
})();
