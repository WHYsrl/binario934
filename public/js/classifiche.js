// ===== BINARIO 9 E 3/4 - Classifiche (Leaderboard) =====

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
  setupTabs();

  // Check URL params for specific game tab
  const params = new URLSearchParams(window.location.search);
  const gameParam = params.get('game');
  const validGames = ['generale', 'crucipuzzle', 'cruciverba', 'quiz'];

  if (gameParam && validGames.includes(gameParam)) {
    // Activate the correct tab
    const tabs = document.querySelectorAll('.lb-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const targetTab = document.querySelector(`.lb-tab[data-game="${gameParam}"]`);
    if (targetTab) targetTab.classList.add('active');
    loadLeaderboard(gameParam);
  } else {
    loadLeaderboard('crucipuzzle');
  }
});

function setupTabs() {
  const tabs = document.querySelectorAll('.lb-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const game = tab.dataset.game;
      loadLeaderboard(game);
    });
  });
}

async function loadLeaderboard(gameType) {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  const isGeneral = gameType === 'generale';

  // Update table header based on type
  const thead = tbody.closest('table').querySelector('thead tr');
  if (thead) {
    if (isGeneral) {
      thead.innerHTML = `
        <th>#</th>
        <th>Mago</th>
        <th>Casa</th>
        <th>Punteggio Totale</th>
      `;
    } else {
      thead.innerHTML = `
        <th>#</th>
        <th>Mago</th>
        <th>Casa</th>
        <th>Punteggio</th>
        <th>Tempo</th>
      `;
    }
  }

  tbody.innerHTML = `<tr><td colspan="${isGeneral ? 4 : 5}" style="text-align:center;">Caricamento...</td></tr>`;

  try {
    const res = await fetch(`/api/classifiche/${gameType}`);
    if (!res.ok) throw new Error('Errore nel caricamento');

    const scores = await res.json();

    if (!scores || scores.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isGeneral ? 4 : 5}" style="text-align:center;">Nessun punteggio ancora. Sii il primo!</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    scores.forEach((entry, index) => {
      const rank = index + 1;
      const tr = document.createElement('tr');

      if (rank <= 3) {
        tr.classList.add(`rank-${rank}`);
      }

      const houseBadge = entry.house
        ? `<span class="house-badge ${entry.house.toLowerCase()}">${entry.house}</span>`
        : '-';

      if (isGeneral) {
        tr.innerHTML = `
          <td>${rank}</td>
          <td>${entry.username}</td>
          <td>${houseBadge}</td>
          <td>${entry.score}</td>
        `;
      } else {
        tr.innerHTML = `
          <td>${rank}</td>
          <td>${entry.username}</td>
          <td>${houseBadge}</td>
          <td>${entry.score}</td>
          <td>${formatTime(entry.time_seconds)}</td>
        `;
      }

      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Leaderboard fetch error:', e);
    tbody.innerHTML = `<tr><td colspan="${isGeneral ? 4 : 5}" style="text-align:center;">Errore nel caricamento della classifica.</td></tr>`;
  }
}
