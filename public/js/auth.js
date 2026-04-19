// ===== Auth (Login / Register) =====

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (tab.dataset.tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    });
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = loginForm.querySelector('.error-msg');
    errEl.style.display = 'none';

    const username = loginForm.querySelector('[name="username"]').value.trim();
    const password = loginForm.querySelector('[name="password"]').value;

    if (!username || !password) {
      errEl.textContent = 'Compila tutti i campi';
      errEl.style.display = 'block';
      return;
    }

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = '/';
      } else {
        errEl.textContent = data.error || 'Errore durante il login';
        errEl.style.display = 'block';
      }
    } catch (err) {
      errEl.textContent = 'Errore di connessione';
      errEl.style.display = 'block';
    }
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = registerForm.querySelector('.error-msg');
    errEl.style.display = 'none';

    const username = registerForm.querySelector('[name="username"]').value.trim();
    const email = registerForm.querySelector('[name="email"]').value.trim();
    const password = registerForm.querySelector('[name="password"]').value;
    const confirm = registerForm.querySelector('[name="confirm"]').value;

    if (!username || !email || !password || !confirm) {
      errEl.textContent = 'Compila tutti i campi';
      errEl.style.display = 'block';
      return;
    }

    if (password !== confirm) {
      errEl.textContent = 'Le password non coincidono';
      errEl.style.display = 'block';
      return;
    }

    if (password.length < 6) {
      errEl.textContent = 'La password deve avere almeno 6 caratteri';
      errEl.style.display = 'block';
      return;
    }

    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = '/';
      } else {
        errEl.textContent = data.error || 'Errore durante la registrazione';
        errEl.style.display = 'block';
      }
    } catch (err) {
      errEl.textContent = 'Errore di connessione';
      errEl.style.display = 'block';
    }
  });

  // Check if already logged in
  checkAuth();
});
