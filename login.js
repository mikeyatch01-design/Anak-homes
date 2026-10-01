// ---------- Login page ----------
// Real server-verified auth via Supabase (sb.auth.signInWithPassword) —
// wrong credentials are rejected by Supabase itself, not a check that
// can be bypassed by editing localStorage in devtools.

const KNOWN_PAGES = ['index.html', 'bookings.html', 'host.html', 'settings.html'];

function getNextPage() {
  const next = new URLSearchParams(location.search).get('next');
  return KNOWN_PAGES.includes(next) ? next : 'index.html';
}

const nextPage = getNextPage();

// The background starts as a tiny inlined blurred placeholder (instant,
// no request) and swaps to the real photo once it's actually downloaded —
// avoids a blank/white flash while a ~580KB image is still loading.
(function loadBgPhoto() {
  const bgPhoto = document.getElementById('bgPhoto');
  if (!bgPhoto) return;
  const img = new Image();
  img.onload = () => bgPhoto.classList.add('is-loaded');
  img.src = 'assets/login-house.jpg';
})();

// The photo above is the permanent fallback; this layers a looping video
// on top once it's actually ready to play. Skipped entirely — never even
// requested — for prefers-reduced-motion, or when the browser reports a
// data-saver / 2G-class connection, since the video is a ~6MB request the
// photo already covers the same ground for.
(function loadBgVideo() {
  const bgVideo = document.getElementById('bgVideo');
  if (!bgVideo) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || ''))) return;

  bgVideo.addEventListener('playing', () => bgVideo.classList.add('is-playing'), { once: true });
  bgVideo.src = 'assets/login-house.mp4';
  bgVideo.preload = 'auto';
  bgVideo.play().catch(() => {}); // autoplay can be blocked by the browser — the photo stays visible either way
})();

(async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    location.replace(nextPage);
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginSubmitText = document.getElementById('loginSubmitText');
  const forgotBtn = document.getElementById('forgotBtn');

  function shakeForm() {
    loginForm.classList.remove('shake');
    void loginForm.offsetWidth; // restart the animation if it's already mid-play
    loginForm.classList.add('shake');
  }

  function succeedAndGo(label, destination) {
    loginSubmit.classList.add('success');
    loginSubmitText.textContent = label;
    setTimeout(() => { location.href = destination; }, 450);
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginSubmit.disabled) return;
    loginError.textContent = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      loginError.textContent = 'Enter your email and password.';
      return;
    }

    loginSubmit.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    loginSubmit.disabled = false;

    if (!error) {
      succeedAndGo('Welcome!', nextPage);
    } else {
      passwordInput.value = '';
      shakeForm();
      loginError.textContent = 'Incorrect email or password — try again.';
      passwordInput.focus();
    }
  });

  if (forgotBtn) {
    forgotBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        loginError.textContent = 'Enter your email above first, then tap "Forgot your password?" again.';
        emailInput.focus();
        return;
      }
      loginError.textContent = '';
      forgotBtn.disabled = true;
      const resetUrl = new URL('reset-password.html', location.href).href;
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
      forgotBtn.disabled = false;
      forgotBtn.textContent = error
        ? 'Something went wrong — try again shortly.'
        : 'Check your email for a reset link.';
    });
  }
})();
