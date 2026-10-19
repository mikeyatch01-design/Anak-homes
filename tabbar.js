// ---------- Phone tab bar: tuck it away ----------
// A small button at the end of the floating bar (phones only) tucks the bar
// into one round icon in the bottom-right corner, so it doesn't cover the
// work. Tap the icon to bring the bar back. Remembered across pages.
(function () {
  const bar = document.querySelector('.tabbar');
  if (!bar) return;
  const KEY = 'anak-tabbar-tucked';
  let tucked = false;
  try { tucked = localStorage.getItem(KEY) === '1'; } catch (e) {}

  const hide = document.createElement('button');
  hide.type = 'button';
  hide.className = 'tabbar-hide';
  hide.setAttribute('aria-label', 'Hide the menu bar');
  hide.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  bar.appendChild(hide);

  // The round icon shows the page you're on.
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'tabbar-fab';
  fab.setAttribute('aria-label', 'Show the menu bar');
  const current = bar.querySelector('a.active svg');
  fab.innerHTML = current ? current.outerHTML : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  bar.after(fab);

  function set(v, save) {
    tucked = v;
    document.documentElement.classList.toggle('tabbar-tucked', v);
    hide.setAttribute('aria-expanded', String(!v));
    fab.setAttribute('aria-expanded', String(v));
    if (save) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }
  }
  // first paint: no animation
  document.documentElement.classList.add('tabbar-instant');
  set(tucked, false);
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('tabbar-instant')));

  hide.addEventListener('click', () => { set(true, true); fab.focus({ preventScroll: true }); });
  fab.addEventListener('click', () => { set(false, true); });
})();
