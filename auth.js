// ---------- Auth wiring (shared across dashboard pages) ----------
// The actual lock gate is a redirect: the inline <head> script on every
// protected page sends locked visitors to login.html before anything
// here even loads (see the note in data.js for what the lock does and
// doesn't protect against). This file just wires up Sign Out.

// ---------- Re-lock on back/forward (bfcache) navigation ----------
// The inline <head> guard on each protected page only runs once, at
// initial parse. Pressing Back after Sign Out can restore the page
// straight from the browser's bfcache instead of re-parsing it — which
// would show the already-rendered dashboard even though sessionStorage's
// unlock flag was just cleared. `pageshow` fires again on a bfcache
// restore (with `persisted: true`), so re-check the lock there too.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  try {
    if (hasPassword() && !isUnlocked()) {
      const here = location.pathname.split('/').pop() || 'index.html';
      location.replace('login.html?next=' + encodeURIComponent(here));
    }
  } catch (err) {}
});

// ---------- Sign out ----------
// Always sends you back to the login screen. If a password is set,
// this also re-locks the device so login.html actually asks for it
// again; if not, login.html falls back to its "Continue" flow.
const signOutLink = document.getElementById('signOutLink');
if (signOutLink) {
  signOutLink.addEventListener('click', (e) => {
    e.preventDefault();
    lockNow();
    location.href = 'login.html';
  });
}
