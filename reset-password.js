// ---------- Reset-password page ----------
// Reached only via the link Supabase emails from resetPasswordForEmail()
// (see login.js). The Supabase client auto-detects the recovery token in
// the URL and establishes a temporary session for it, firing a
// PASSWORD_RECOVERY event — that's the signal this page is safe to show
// the "set a new password" form.

const resetSub = document.getElementById('resetSub');
const resetForm = document.getElementById('resetForm');
const newPassInput = document.getElementById('newPassInput');
const confirmPassInput = document.getElementById('confirmPassInput');
const resetError = document.getElementById('resetError');
const resetSubmit = document.getElementById('resetSubmit');
const resetSubmitText = document.getElementById('resetSubmitText');
const resetHint = document.getElementById('resetHint');

let recoveryReady = false;

function showForm() {
  if (recoveryReady) return;
  recoveryReady = true;
  resetSub.textContent = 'Choose a new password below.';
  resetForm.hidden = false;
}

sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') showForm();
});

// Fallback: some browsers fire PASSWORD_RECOVERY before this listener is
// attached — if a session already exists by the time we check, show the
// form instead of waiting on an event that already happened.
sb.auth.getSession().then(({ data: { session } }) => {
  if (session) showForm();
  else setTimeout(() => {
    if (!recoveryReady) {
      resetSub.textContent = 'This reset link is invalid or has expired.';
      resetHint.innerHTML = '<a href="login.html">Back to sign in</a> to request a new one.';
    }
  }, 4000);
});

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetError.textContent = '';

  if (newPassInput.value.length < 6) {
    resetError.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (newPassInput.value !== confirmPassInput.value) {
    resetError.textContent = 'Passwords don’t match.';
    return;
  }

  resetSubmit.disabled = true;
  const { error } = await sb.auth.updateUser({ password: newPassInput.value });
  resetSubmit.disabled = false;

  if (error) {
    resetError.textContent = 'Couldn’t update your password — try the reset link again.';
    return;
  }

  resetSubmit.classList.add('success');
  resetSubmitText.textContent = 'Password updated!';
  setTimeout(() => { location.href = 'index.html'; }, 700);
});
