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
        const houseLabel = data.user.house
          ? `<span class="user-house">(${data.user.house})</span>`
          : '';
        authLink.innerHTML = `<span class="user-nav"><a href="/profilo" class="username-link"><span class="username">${data.user.username}</span>${houseLabel}</a> <button class="logout-btn" onclick="logout(event)">Esci</button></span>`;
        authLink.href = '/profilo';
        authLink.onclick = null;
      }
    } else {
      window.currentUser = null;
    }
  } catch (e) {
    window.currentUser = null;
    console.log('Auth check failed');
  }
  // Signal that auth check is complete
  window.dispatchEvent(new Event('authReady'));
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

// Utility: format time (handles null/undefined)
function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '--:--';
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

// Utility: get leaderboard position for a score
async function getLeaderboardPosition(gameType, score) {
  try {
    const res = await fetch(`/api/classifiche/${gameType}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    // Find position (1-based) - data is sorted by score DESC
    let pos = 1;
    for (const entry of data) {
      if (entry.score > score) {
        pos++;
      } else {
        break;
      }
    }
    return { position: pos, total: data.length };
  } catch (e) {
    return null;
  }
}

// Utility: show login prompt in a container
function showLoginPrompt(container) {
  if (window.currentUser || !container) return;
  const div = document.createElement('div');
  div.className = 'login-prompt';
  div.innerHTML = '<strong>Registrati o fai login</strong> per salvare il tuo punteggio e comparire in classifica! <a href="/login">Accedi qui</a>';
  container.appendChild(div);
}

// Utility: show celebration sparkles
function showCelebration() {
  const container = document.createElement('div');
  container.className = 'celebration';
  document.body.appendChild(container);

  const colors = ['#c9a84c', '#e8d48b', '#d3a625', '#fff', '#740001', '#1a472a'];
  for (let i = 0; i < 30; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.animationDelay = (Math.random() * 0.8) + 's';
    sparkle.style.width = sparkle.style.height = (5 + Math.random() * 10) + 'px';
    container.appendChild(sparkle);
  }

  setTimeout(() => container.remove(), 2000);
}

// Utility: score popup animation
function showScorePopup(text) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);
}
