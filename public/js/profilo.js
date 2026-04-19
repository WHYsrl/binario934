// ===== BINARIO 9 E 3/4 - Profilo Utente =====

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  await checkAuth();
  loadProfile();
});

const GAME_LABELS = {
  crucipuzzle: 'Crucipuzzle',
  cruciverba: 'Cruciverba',
  quiz: 'Mini Quiz'
};

const HOUSE_COLORS = {
  grifondoro: '#740001',
  serpeverde: '#1a472a',
  corvonero: '#0e1a40',
  tassorosso: '#ecb939'
};

async function loadProfile() {
  const loginPrompt = document.getElementById('profile-login-prompt');
  const profileContent = document.getElementById('profile-content');

  if (!window.currentUser) {
    loginPrompt.style.display = 'block';
    profileContent.style.display = 'none';
    return;
  }

  loginPrompt.style.display = 'none';
  profileContent.style.display = 'block';

  try {
    const res = await fetch('/api/profilo');
    if (!res.ok) throw new Error('Errore nel caricamento');
    const data = await res.json();

    renderHouse(data.user);
    renderTotalScore(data);
    renderGameScores(data);
  } catch (e) {
    console.error('Profile load error:', e);
    profileContent.innerHTML = '<p style="text-align:center; color:#740001;">Errore nel caricamento del profilo. Riprova.</p>';
  }
}

function renderHouse(user) {
  const houseDisplay = document.getElementById('house-display');

  if (user.house) {
    const houseLower = user.house.toLowerCase();
    const color = HOUSE_COLORS[houseLower] || '#4a2c10';
    houseDisplay.innerHTML = `
      <img src="/images/houses/${houseLower}.png" alt="${user.house}"
        style="width:120px; height:120px; border-radius:50%; border:4px solid ${color}; margin-bottom:10px;">
      <div style="font-family:Cinzel,serif; font-size:1.5rem; color:${color}; font-weight:bold;">
        ${user.house}
      </div>
      <div style="font-family:Lora,serif; color:#6b4e2e; margin-top:5px;">
        Mago: <strong>${user.username}</strong>
      </div>
    `;
  } else {
    houseDisplay.innerHTML = `
      <div style="font-family:Cinzel,serif; font-size:1.2rem; color:#4a2c10; margin-bottom:15px;">
        Mago: <strong>${user.username}</strong>
      </div>
      <div style="font-family:Lora,serif; color:#6b4e2e; margin-bottom:15px;">
        Non hai ancora scoperto la tua casata!
      </div>
      <a href="/cappello" class="btn btn-primary">Scopri la tua Casata</a>
    `;
  }
}

function renderTotalScore(data) {
  const totalScoreEl = document.getElementById('total-score');
  const generalRankEl = document.getElementById('general-rank');

  totalScoreEl.textContent = data.totalScore;

  if (data.totalPlayers > 0) {
    generalRankEl.innerHTML = `<strong>${data.generalPosition}° posto</strong> su ${data.totalPlayers} maghi nella classifica generale`;
  } else {
    generalRankEl.textContent = 'Gioca per entrare in classifica!';
  }
}

function renderGameScores(data) {
  const container = document.getElementById('game-scores');
  const games = ['crucipuzzle', 'cruciverba', 'quiz'];

  container.innerHTML = '';

  for (const game of games) {
    const info = data.gameRankings[game];
    const card = document.createElement('div');
    card.className = 'profile-game-card';

    if (info) {
      card.innerHTML = `
        <h3>${GAME_LABELS[game]}</h3>
        <div class="profile-game-score">${info.best_score}</div>
        <div class="profile-game-detail">Miglior punteggio</div>
        <div class="profile-game-rank">${info.position}° su ${info.total}</div>
        <div class="profile-game-detail">Partite giocate: ${info.times_played}</div>
      `;
    } else {
      card.innerHTML = `
        <h3>${GAME_LABELS[game]}</h3>
        <div class="profile-game-score" style="font-size:1rem; color:#6b4e2e;">Non ancora giocato</div>
        <a href="/${game}" class="btn btn-secondary" style="margin-top:10px; font-size:0.85rem;">Gioca ora</a>
      `;
    }

    container.appendChild(card);
  }
}
