// ===== BINARIO 9 E 3/4 - Cappello Parlante (Sorting Hat) =====

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
  initCappello();
});

function initCappello() {
  const hatImage = document.querySelector('.hat-image');
  const hatSpeech = document.querySelector('.hat-speech');
  const sortingOptions = document.getElementById('sorting-options');
  const progressFill = document.getElementById('progress-fill');
  const questionNum = document.getElementById('question-num');
  const houseResult = document.getElementById('house-result');
  const houseCrest = document.querySelector('.house-crest');
  const houseName = document.querySelector('.house-name');
  const houseDesc = document.querySelector('.house-desc');
  const saveHouseBtn = document.getElementById('save-house-btn');
  const retryBtn = document.getElementById('retry-btn');

  let questions = [];
  let currentQuestion = 0;
  let scores = {
    grifondoro: 0,
    serpeverde: 0,
    corvonero: 0,
    tassorosso: 0
  };
  let winningHouse = null;

  const houseData = {
    grifondoro: {
      name: 'Grifondoro',
      image: '/images/houses/grifondoro.png',
      desc: 'Coraggio, determinazione e nobilt\u00e0 d\'animo ti contraddistinguono. Godric Grifondoro sarebbe fiero di te!',
      color: '#740001'
    },
    serpeverde: {
      name: 'Serpeverde',
      image: '/images/houses/serpeverde.png',
      desc: 'Ambizione, astuzia e intraprendenza sono le tue qualit\u00e0. Salazar Serpeverde ti accoglie!',
      color: '#1a472a'
    },
    corvonero: {
      name: 'Corvonero',
      image: '/images/houses/corvonero.png',
      desc: 'Saggezza, creativit\u00e0 e sete di conoscenza ti guidano. Priscilla Corvonero ti d\u00e0 il benvenuto!',
      color: '#0e1a40'
    },
    tassorosso: {
      name: 'Tassorosso',
      image: '/images/houses/tassorosso.png',
      desc: 'Lealt\u00e0, pazienza e senso di giustizia sono nel tuo cuore. Tosca Tassorosso ti aspettava!',
      color: '#372e29'
    }
  };

  showIntro();

  async function loadQuestions() {
    try {
      const res = await fetch('/data/cappello-questions.json');
      questions = await res.json();
    } catch (e) {
      console.error('Failed to load questions:', e);
      hatSpeech.textContent = 'Errore nel caricamento delle domande. Riprova pi\u00f9 tardi.';
    }
  }

  function showIntro() {
    if (houseResult) houseResult.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (questionNum) questionNum.textContent = '';
    sortingOptions.innerHTML = '';

    hatSpeech.textContent = 'Ah, un nuovo studente! Mettimi sulla tua testa e scoprir\u00f2 dove appartieni...';

    const startBtn = document.createElement('button');
    startBtn.className = 'sorting-option start-btn';
    startBtn.textContent = 'Inizia lo Smistamento';
    startBtn.addEventListener('click', startSorting);
    sortingOptions.appendChild(startBtn);
  }

  async function startSorting() {
    await loadQuestions();
    if (questions.length === 0) return;

    currentQuestion = 0;
    scores = { grifondoro: 0, serpeverde: 0, corvonero: 0, tassorosso: 0 };

    showQuestion();
  }

  function showQuestion() {
    if (currentQuestion >= questions.length) {
      showThinking();
      return;
    }

    const q = questions[currentQuestion];

    const progress = ((currentQuestion) / questions.length) * 100;
    if (progressFill) progressFill.style.width = progress + '%';
    if (questionNum) questionNum.textContent = `Domanda ${currentQuestion + 1} di ${questions.length}`;

    hatSpeech.textContent = q.question;

    // Shuffle options so house order is randomized
    const shuffledOptions = shuffleArray(q.options);

    sortingOptions.innerHTML = '';
    shuffledOptions.forEach((option) => {
      const btn = document.createElement('button');
      btn.className = 'sorting-option';
      btn.textContent = option.text;
      btn.addEventListener('click', () => {
        selectOption(option);
      });
      sortingOptions.appendChild(btn);
    });
  }

  function selectOption(option) {
    for (const house in option.scores) {
      if (scores.hasOwnProperty(house)) {
        scores[house] += option.scores[house];
      }
    }

    currentQuestion++;
    showQuestion();
  }

  function showThinking() {
    if (progressFill) progressFill.style.width = '100%';
    if (questionNum) questionNum.textContent = '';

    sortingOptions.innerHTML = '';
    hatSpeech.textContent = 'Mmm... interessante... vediamo un po\'...';
    hatSpeech.classList.add('thinking');

    setTimeout(() => {
      hatSpeech.classList.remove('thinking');
      if (typeof AudioManager !== 'undefined') AudioManager.play('victory');
      showCelebration();
      showResult();
    }, 2000);
  }

  function showResult() {
    // Calculate winner
    let maxScore = -1;
    winningHouse = 'grifondoro';

    for (const house in scores) {
      if (scores[house] > maxScore) {
        maxScore = scores[house];
        winningHouse = house;
      }
    }

    const data = houseData[winningHouse];

    // Hide question UI
    hatSpeech.textContent = '';
    sortingOptions.innerHTML = '';
    if (questionNum) questionNum.textContent = '';

    // Show result
    if (houseResult) {
      houseResult.style.display = 'block';
      houseResult.className = 'house-result ' + winningHouse;
    }

    // Use actual house images instead of emojis
    if (houseCrest) {
      houseCrest.innerHTML = `<img src="${data.image}" alt="${data.name}" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">`;
    }
    if (houseName) houseName.textContent = data.name;
    if (houseDesc) houseDesc.textContent = data.desc;

    // Score breakdown
    const breakdownDiv = document.getElementById('score-breakdown') || document.createElement('div');
    breakdownDiv.id = 'score-breakdown';
    breakdownDiv.className = 'result-detail';
    breakdownDiv.style.marginTop = '15px';
    const sortedHouses = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const totalPoints = sortedHouses.reduce((sum, [, s]) => sum + s, 0);
    let breakdownHtml = '<strong>Il tuo profilo magico:</strong><br>';
    sortedHouses.forEach(([house, sc]) => {
      const pct = totalPoints > 0 ? Math.round((sc / totalPoints) * 100) : 0;
      breakdownHtml += `${houseData[house].name}: ${pct}% `;
    });
    breakdownDiv.innerHTML = breakdownHtml;
    if (houseDesc && !document.getElementById('score-breakdown')) {
      houseDesc.after(breakdownDiv);
    }

    // Save house button - show with confirmation text
    if (saveHouseBtn) {
      if (window.currentUser) {
        saveHouseBtn.style.display = 'inline-block';
        saveHouseBtn.textContent = `Conferma: unisciti a ${data.name}!`;
        saveHouseBtn.disabled = false;
        saveHouseBtn.onclick = () => confirmAndSaveHouse(data.name);
      } else {
        saveHouseBtn.style.display = 'none';
        // Show login prompt
        let loginPrompt = document.getElementById('hat-login-prompt');
        if (!loginPrompt) {
          loginPrompt = document.createElement('div');
          loginPrompt.id = 'hat-login-prompt';
          loginPrompt.className = 'login-prompt';
          loginPrompt.innerHTML = '<strong>Registrati o fai login</strong> per salvare la tua casa e mostrare lo stemma in classifica! <a href="/login">Accedi qui</a>';
          const actionsEl = houseResult.querySelector('.result-actions');
          if (actionsEl) actionsEl.after(loginPrompt);
        }
      }
    }

    // Retry button
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => {
        if (houseResult) houseResult.style.display = 'none';
        retryBtn.style.display = 'none';
        if (saveHouseBtn) saveHouseBtn.style.display = 'none';
        const loginPrompt = document.getElementById('hat-login-prompt');
        if (loginPrompt) loginPrompt.remove();
        const breakdown = document.getElementById('score-breakdown');
        if (breakdown) breakdown.remove();
        showIntro();
      };
    }
  }

  async function confirmAndSaveHouse(house) {
    saveHouseBtn.textContent = 'Salvataggio...';
    saveHouseBtn.disabled = true;

    try {
      const res = await fetch('/auth/house', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house })
      });
      const data = await res.json();

      if (data.success || res.ok) {
        saveHouseBtn.textContent = `Benvenuto in ${house}!`;
        saveHouseBtn.style.background = 'rgba(26,71,42,0.15)';
        saveHouseBtn.style.color = '#1a472a';
        saveHouseBtn.style.borderColor = '#1a472a';
        if (typeof AudioManager !== 'undefined') AudioManager.play('correct');
        // Refresh auth to update nav badge
        checkAuth();
      } else {
        saveHouseBtn.textContent = 'Errore, riprova';
        saveHouseBtn.disabled = false;
      }
    } catch (e) {
      console.error('Failed to save house:', e);
      saveHouseBtn.textContent = 'Errore, riprova';
      saveHouseBtn.disabled = false;
    }
  }
}
