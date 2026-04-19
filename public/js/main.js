// ===== BINARIO 9 E 3/4 - Main JS =====

// Check auth status on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
});

async function checkAuth() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();
    const authLink = document.getElementById('auth-link');

    if (data.user) {
      window.currentUser = data.user;
      if (authLink) {
        const houseBadge = data.user.house
          ? ` <span class="house-badge ${data.user.house.toLowerCase()}">${data.user.house}</span>`
          : '';
        authLink.innerHTML = `<span class="user-nav"><span class="username">${data.user.username}</span>${houseBadge} <button class="logout-btn" onclick="logout(event)">Esci</button></span>`;
        authLink.href = '#';
        authLink.onclick = (e) => e.preventDefault();
      }
    }
  } catch (e) {
    console.log('Auth check failed');
  }
}

async function logout(e) {
  e.preventDefault();
  e.stopPropagation();
  await fetch('/auth/logout', { method: 'POST' });
  window.currentUser = null;
  window.location.reload();
}

function setupNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');

  if (toggle && navList) {
    toggle.addEventListener('click', () => {
      navList.classList.toggle('open');
    });

    // Close nav when clicking a link on mobile
    navList.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navList.classList.remove('open');
      });
    });
  }
}

// Utility: save score to server
async function saveScore(gameType, score, timeSeconds) {
  if (!window.currentUser) return false;

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: gameType, score, time_seconds: timeSeconds })
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to save score:', e);
    return false;
  }
}

// Utility: format time
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Utility: shuffle array
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
