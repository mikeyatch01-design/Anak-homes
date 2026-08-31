// ---------- Auth wiring (shared across dashboard pages) ----------
// Real, server-verified sessions via Supabase Auth — replacing the old
// client-side-only password check. Every protected page's own script
// (finances.js/bookings.js/host.js/settings.js) starts with:
//   const session = await requireSession();
//   if (!session) return; // requireSession() is already redirecting
// before touching any data, so an unauthenticated visitor never sees the
// page and — more importantly — never gets data back from Supabase either,
// since Row Level Security independently enforces the same rule server-side.

// The <head> of every protected page sets `html.auth-checking { visibility:
// hidden }` (see style.css) so nothing flashes on screen while the session
// check is in flight; this reveals the page once it resolves to "signed in".
function revealPage() {
  document.documentElement.classList.remove('auth-checking');
}

async function requireSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const here = location.pathname.split('/').pop() || 'index.html';
    location.replace('login.html?next=' + encodeURIComponent(here));
    return null;
  }
  revealPage();
  return session;
}

// ---------- Re-check on back/forward (bfcache) navigation ----------
// A bfcache restore doesn't re-run the page's initial async bootstrap, so
// without this, pressing Back after Sign Out could show the last-rendered
// page from memory. `pageshow` fires again on a bfcache restore (with
// `persisted: true`); re-validate the real session there too.
window.addEventListener('pageshow', async (e) => {
  if (!e.persisted) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const here = location.pathname.split('/').pop() || 'index.html';
    location.replace('login.html?next=' + encodeURIComponent(here));
  }
});

// ---------- Sign out ----------
const signOutLink = document.getElementById('signOutLink');
if (signOutLink) {
  signOutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await sb.auth.signOut();
    location.href = 'login.html';
  });
}
