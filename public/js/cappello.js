// ===== BINARIO 9 E 3/4 - Cappello Parlante (Sorting Hat) =====

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
  initCappello();
});

function initCappello() {
  const hatImage = document.querySelector('.hat-image');
  const hatSpeech = document.querySelector('.hat-speech');
  const sortingOptions = document.querySelector('.sorting-options');
  const progressFill = document.getElementById('progress-fill');
  const questionNum = document.getElementById('question-num');
  const houseResult = document.querySelector('.house-result');
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

  const houseData = {
    grifondoro: {
      emoji: '\u{1F981}',
      name: 'Grifondoro',
      desc: 'Coraggio, determinazione e nobilt\u00e0 d\'animo ti contraddistinguono. Godric Grifondoro sarebbe fiero di te!'
    },
    serpeverde: {
      emoji: '\u{1F40D}',
      name: 'Serpeverde',
      desc: 'Ambizione, astuzia e intraprendenza sono le tue qualit\u00e0. Salazar Serpeverde ti accoglie!'
    },
    corvonero: {
      emoji: '\u{1F985}',
      name: 'Corvonero',
      desc: 'Saggezza, creativit\u00e0 e sete di conoscenza ti guidano. Priscilla Corvonero ti d\u00e0 il benvenuto!'
    },
    tassorosso: {
      emoji: '\u{1F9A1}',
      name: 'Tassorosso',
      desc: 'Lealt\u00e0, pazienza e senso di giustizia sono nel tuo cuore. Tosca Tassorosso ti aspettava!'
    }
  };

  // Show intro screen
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

    // Update progress
    const progress = ((currentQuestion) / questions.length) * 100;
    if (progressFill) progressFill.style.width = progress + '%';
    if (questionNum) questionNum.textContent = `Domanda ${currentQuestion + 1} di ${questions.length}`;

    // Show question text
    hatSpeech.textContent = q.question;

    // Show options
    sortingOptions.innerHTML = '';
    q.options.forEach((option) => {
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
    // Accumulate scores
    for (const house in option.scores) {
      if (scores.hasOwnProperty(house)) {
        scores[house] += option.scores[house];
      }
    }

    currentQuestion++;
    showQuestion();
  }

  function showThinking() {
    // Fill progress bar
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
    let winningHouse = 'grifondoro';

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

    if (houseCrest) houseCrest.textContent = data.emoji;
    if (houseName) houseName.textContent = data.name;
    if (houseDesc) houseDesc.textContent = data.desc;

    // Save house button (only if logged in)
    if (saveHouseBtn) {
      if (window.currentUser) {
        saveHouseBtn.style.display = 'inline-block';
        saveHouseBtn.onclick = () => saveHouse(data.name);
      } else {
        saveHouseBtn.style.display = 'none';
      }
    }

    // Retry button
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => {
        if (houseResult) houseResult.style.display = 'none';
        retryBtn.style.display = 'none';
        if (saveHouseBtn) saveHouseBtn.style.display = 'none';
        showIntro();
      };
    }
  }

  async function saveHouse(house) {
    try {
      const res = await fetch('/auth/house', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house })
      });
      const data = await res.json();

      if (data.success || res.ok) {
        saveHouseBtn.textContent = 'Casa salvata!';
        saveHouseBtn.disabled = true;
        // Refresh auth to update nav badge
        checkAuth();
      } else {
        saveHouseBtn.textContent = 'Errore, riprova';
      }
    } catch (e) {
      console.error('Failed to save house:', e);
      saveHouseBtn.textContent = 'Errore, riprova';
    }
  }
}
