// ---------- Sidebar toggle (mobile) ----------
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const overlay = document.getElementById('overlay');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('show');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay.addEventListener('click', closeSidebar);

// ---------- Sidebar collapse (desktop) ----------
const sidebarCollapseToggle = document.getElementById('sidebarCollapseToggle');
const SIDEBAR_COLLAPSE_KEY = 'urbanhomes-sidebar-collapsed';
const SIDEBAR_HINT_KEY = 'urbanhomes-sidebar-hint-shown';

if (sidebarCollapseToggle) {
  if (localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true') {
    sidebar.classList.add('collapsed');
  }

  sidebarCollapseToggle.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed);
    sidebarCollapseToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    sidebarCollapseToggle.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');

    // Little pop + burst-ring on every click. Remove-then-reflow-then-add
    // so it replays even if the previous animation hasn't finished.
    sidebarCollapseToggle.classList.remove('pop');
    void sidebarCollapseToggle.offsetWidth;
    sidebarCollapseToggle.classList.add('pop');
  });

  // Once per browser session, a quick wiggle hints that it's clickable —
  // not on every page nav within the same session, so it doesn't nag.
  if (!sessionStorage.getItem(SIDEBAR_HINT_KEY)) {
    sessionStorage.setItem(SIDEBAR_HINT_KEY, 'true');
    setTimeout(() => sidebarCollapseToggle.classList.add('hint'), 900);
  }
}

// ---------- Floating glow on touch (hover already covered by CSS) ----------
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('touchstart', () => card.classList.add('touch-active'), { passive: true });
  card.addEventListener('touchend', () => card.classList.remove('touch-active'));
  card.addEventListener('touchcancel', () => card.classList.remove('touch-active'));
});

// ---------- Theme ----------
// Stored preference is 'light' | 'dark' | 'system' (default). Chart-
// bearing pages (finances.js) listen for 'themechange' to redraw with
// the new palette — script.js stays chart-agnostic on purpose so it's
// safe to include on any page. Settings' Appearance section listens
// for 'themeprefchange' to keep its own UI in sync.
const themeToggle = document.getElementById('themeToggle');
const THEME_KEY = 'dashboard-theme';
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getThemePreference() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

function resolveTheme(pref) {
  return pref === 'system' ? (darkMediaQuery.matches ? 'dark' : 'light') : pref;
}

function applyTheme(pref) {
  document.body.classList.toggle('dark-theme', resolveTheme(pref) === 'dark');
  document.dispatchEvent(new CustomEvent('themechange'));
}

function setThemePreference(pref) {
  localStorage.setItem(THEME_KEY, pref);
  applyTheme(pref);
  document.dispatchEvent(new CustomEvent('themeprefchange'));
}

function initTheme() {
  applyTheme(getThemePreference());
}

themeToggle.addEventListener('click', () => {
  // The quick topbar toggle always sets an explicit choice, bypassing
  // "system" — the 3-way choice lives in Settings > Appearance.
  const currentlyDark = resolveTheme(getThemePreference()) === 'dark';
  setThemePreference(currentlyDark ? 'light' : 'dark');
});

darkMediaQuery.addEventListener('change', () => {
  if (getThemePreference() === 'system') applyTheme('system');
});
initTheme();

// ---------- Profile (name shown in the sidebar user chip) ----------
// Reads from data.js's loadProfile() so a name change in Settings
// reflects on every page without needing separate wiring per page.
function applyProfile() {
  const profile = loadProfile();
  const nameEl = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');
  const welcomeEl = document.getElementById('welcomeText');
  if (nameEl) nameEl.textContent = profile.name;
  if (avatarEl) avatarEl.textContent = initials(profile.name);
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${profile.name}`;
}
applyProfile();

// ---------- Resize (debounced) ----------
// Chart-bearing pages listen for 'appresize' to redraw at the new size.
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => document.dispatchEvent(new CustomEvent('appresize')), 150);
});
