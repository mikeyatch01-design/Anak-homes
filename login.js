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
