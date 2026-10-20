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

// Signed out or signing in fresh: drop any bookings this tab kept between pages.
try { sessionStorage.removeItem('anak-data-v1'); } catch (e) {}

// The background starts as a tiny inlined blurred placeholder (instant,
// no request) and swaps to the real photo once it's actually downloaded.
// Phones get a smaller copy; bigger screens get the 4K one.
(function loadBgPhoto() {
  const bgPhoto = document.getElementById('bgPhoto');
  if (!bgPhoto) return;
  const big = window.matchMedia('(min-width: 900px)').matches;
  const src = big ? 'assets/login-villa.jpg' : 'assets/login-villa-1800.jpg';
  const img = new Image();
  img.onload = () => { bgPhoto.style.setProperty('--photo', `url("${src}")`); bgPhoto.classList.add('is-loaded'); };
  img.src = src;
})();

// Eye button: show or hide the password while typing it.
(function passwordToggle() {
  const btn = document.getElementById('pwToggle');
  const input = document.getElementById('passwordInput');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    input.focus();
  });
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
