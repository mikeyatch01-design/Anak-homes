// ---------- Login page ----------

const KNOWN_PAGES = ['index.html', 'bookings.html', 'host.html', 'settings.html'];

function getNextPage() {
  const next = new URLSearchParams(location.search).get('next');
  return KNOWN_PAGES.includes(next) ? next : 'index.html';
}

const nextPage = getNextPage();

if (isUnlocked()) {
  // Already signed in (or got here some other way) — nothing to do.
  location.replace(nextPage);
} else {
  initLoginForm();
}

function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const passwordField = document.getElementById('passwordField');
  const passwordInput = document.getElementById('passwordInput');
  const recoveryField = document.getElementById('recoveryField');
  const recoveryInput = document.getElementById('recoveryInput');
  const loginError = document.getElementById('loginError');
  const loginSub = document.getElementById('loginSub');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginSubmitText = document.getElementById('loginSubmitText');
  const loginHint = document.getElementById('loginHint');
  const forgotBtn = document.getElementById('forgotBtn');
  const backToPasswordBtn = document.getElementById('backToPasswordBtn');

  const CRYPTO_AVAILABLE = !!(window.crypto && window.crypto.subtle);
  const locked = hasPassword();
  let lockoutTimer = null;
  let mode = 'password';

  // Returns true (and keeps the form disabled) while a lockout from too
  // many failed attempts is active; ticks a live countdown until it
  // lifts. Password and recovery-code attempts share one lockout pool.
  function checkLockout() {
    const remaining = lockoutRemainingMs();
    if (remaining <= 0) {
      if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null; }
      return false;
    }
    loginSubmit.disabled = true;
    loginError.textContent = `Too many attempts — try again in ${Math.ceil(remaining / 1000)}s.`;
    if (!lockoutTimer) {
      lockoutTimer = setInterval(() => {
        if (!checkLockout()) loginSubmit.disabled = false;
      }, 1000);
    }
    return true;
  }

  function showPasswordMode() {
    mode = 'password';
    passwordField.hidden = false;
    recoveryField.hidden = true;
    forgotBtn.hidden = false;
    backToPasswordBtn.hidden = true;
    loginSubmitText.textContent = 'Sign in';
    loginError.textContent = '';
    loginSubmit.disabled = false;
    checkLockout();
    passwordInput.focus();
  }

  // Not a bypass — proving you hold the recovery code (shown once, when
  // the password was set) is required before the lock comes off.
  function showRecoveryMode() {
    mode = 'recovery';
    passwordField.hidden = true;
    recoveryField.hidden = false;
    forgotBtn.hidden = true;
    backToPasswordBtn.hidden = false;
    loginSubmitText.textContent = 'Verify code';
    loginSubmit.disabled = false;
    loginError.textContent = hasRecoveryCode()
      ? ''
      : 'No recovery code was saved for this password — the only way back in is clearing this device’s browser storage.';
    checkLockout();
    recoveryInput.focus();
  }

  if (!locked) {
    passwordField.hidden = true;
    recoveryField.hidden = true;
    loginSub.textContent = 'No password is set yet — you can continue straight in.';
    loginSubmitText.textContent = 'Continue';
    loginHint.innerHTML = 'Want a password lock on this device? <a href="settings.html">Set one up in Settings</a>.';
  } else if (!CRYPTO_AVAILABLE) {
    passwordField.hidden = true;
    recoveryField.hidden = true;
    loginError.textContent = 'This browser doesn’t support the security features needed to unlock (Web Crypto API).';
    loginSubmit.disabled = true;
  } else {
    showPasswordMode();
  }

  if (forgotBtn) forgotBtn.addEventListener('click', showRecoveryMode);
  if (backToPasswordBtn) backToPasswordBtn.addEventListener('click', showPasswordMode);

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

    if (!locked) {
      markUnlocked();
      succeedAndGo('Welcome!', nextPage);
      return;
    }

    if (checkLockout()) return;

    if (mode === 'recovery') {
      if (!hasRecoveryCode()) {
        loginError.textContent = 'No recovery code was saved for this password — the only way back in is clearing this device’s browser storage.';
        return;
      }
      const ok = await verifyRecoveryCode(recoveryInput.value);
      if (ok) {
        clearFailedAttempts();
        clearPassword(); // also clears the now-used recovery code
        succeedAndGo('Verified!', 'settings.html'); // straight to setting a fresh password
      } else {
        recordFailedAttempt();
        recoveryInput.value = '';
        shakeForm();
        if (!checkLockout()) {
          loginError.textContent = 'That recovery code doesn’t match.';
          recoveryInput.focus();
        }
      }
      return;
    }

    const ok = await verifyPassword(passwordInput.value);
    if (ok) {
      clearFailedAttempts();
      markUnlocked();
      succeedAndGo('Welcome!', nextPage);
    } else {
      recordFailedAttempt();
      passwordInput.value = '';
      shakeForm();
      if (!checkLockout()) {
        loginError.textContent = 'Incorrect password — try again.';
        passwordInput.focus();
      }
    }
  });
}
