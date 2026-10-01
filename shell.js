// ---------- Shared page shell (Bookings / Hosts / Settings) ----------
// The black + gold top bar's profile menu. Replaces script.js on these
// pages: there's no sidebar or light/dark switch anymore.
(function () {
  const btn = document.getElementById('profileBtn');
  const menu = document.getElementById('profileMenu');
  if (!btn || !menu) return;
  function setMenu(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', e => { e.stopPropagation(); setMenu(menu.hidden); });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); }
  });
})();
