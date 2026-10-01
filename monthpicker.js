// ---------- Month picker (shared by the dashboard and Bookings) ----------
// A pill button that opens a small panel: the year with ‹ › arrows, then
// the twelve months in a 3-column grid. Months that have bookings get a
// gold dot; the selected one is filled gold. Optionally an "All months"
// button sits on top.
//
// createMonthPicker(root, {
//   getValue()            -> 'YYYY-MM' or 'all'
//   hasData(key)          -> true when that month has bookings
//   onSelect(key)         -> called with 'YYYY-MM' or 'all'
//   allowAll              -> show the "All months" button
// }) -> { refresh() }
function createMonthPicker(root, opts) {
  const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  root.classList.add('month-picker');
  root.innerHTML = `
    <button type="button" class="month-picker-btn" aria-haspopup="dialog" aria-expanded="false">
      <svg class="mp-cal" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
      <span class="mp-label">—</span>
      <svg class="month-picker-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>
    </button>
    <div class="month-picker-menu" role="dialog" aria-label="Choose a month">
      ${opts.allowAll ? '<button type="button" class="mp-all">All months</button>' : ''}
      <div class="mp-year">
        <button type="button" class="mp-nav" data-step="-1" aria-label="Previous year"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
        <span class="mp-year-label"></span>
        <button type="button" class="mp-nav" data-step="1" aria-label="Next year"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
      <div class="mp-grid"></div>
    </div>`;

  const btn = root.querySelector('.month-picker-btn');
  const label = root.querySelector('.mp-label');
  const yearLabel = root.querySelector('.mp-year-label');
  const grid = root.querySelector('.mp-grid');
  const allBtn = root.querySelector('.mp-all');
  let viewYear = new Date().getFullYear();

  function currentYear() {
    const v = opts.getValue();
    return v && v !== 'all' ? Number(v.slice(0, 4)) : new Date().getFullYear();
  }

  function refresh() {
    const v = opts.getValue();
    label.textContent = v === 'all' ? 'All months' : v ? `${FULL[Number(v.slice(5)) - 1]} ${v.slice(0, 4)}` : '—';
    yearLabel.textContent = viewYear;
    if (allBtn) allBtn.classList.toggle('active', v === 'all');
    grid.innerHTML = SHORT.map((name, i) => {
      const key = `${viewYear}-${String(i + 1).padStart(2, '0')}`;
      const cls = ['month-picker-item'];
      if (key === v) cls.push('active');
      if (opts.hasData(key)) cls.push('has-data');
      return `<button type="button" class="${cls.join(' ')}" data-key="${key}" aria-pressed="${key === v}">${name}</button>`;
    }).join('');
  }

  function open() {
    viewYear = currentYear();
    refresh();
    root.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function close() {
    root.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    root.classList.contains('open') ? close() : open();
  });
  root.querySelector('.month-picker-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    const nav = e.target.closest('.mp-nav');
    if (nav) { viewYear += Number(nav.dataset.step); refresh(); return; }
    const item = e.target.closest('.month-picker-item');
    if (item) { close(); opts.onSelect(item.dataset.key); refresh(); return; }
    if (e.target.closest('.mp-all')) { close(); opts.onSelect('all'); refresh(); }
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) { close(); btn.focus(); }
  });

  refresh();
  return { refresh };
}
