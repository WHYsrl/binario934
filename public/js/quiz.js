// ===== BINARIO 9 E 3/4 - Quiz Game =====

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
  initQuiz();
});

const TOTAL_QUESTIONS = 10;
const POINTS_PER_QUESTION = 10;
const ADVANCE_DELAY = 1500;

let questions = [];
let currentIndex = 0;
let totalScore = 0;
let correctCount = 0;

async function initQuiz() {
  try {
    const res = await fetch('/data/quiz-questions.json');
    const allQuestions = await res.json();
    questions = shuffleArray(allQuestions).slice(0, TOTAL_QUESTIONS);
    currentIndex = 0;
    totalScore = 0;
    correctCount = 0;

    // Hide result overlay
    const overlay = document.querySelector('.result-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.classList.remove('active');
      overlay.classList.remove('visible');
    }

    showQuestion();
  } catch (e) {
    console.error('Failed to load quiz questions:', e);
  }
}

function showQuestion() {
  const q = questions[currentIndex];

  const questionNum = document.getElementById('question-num');
  const progressFill = document.getElementById('progress-fill');
  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('quiz-options');

  if (questionNum) {
    questionNum.textContent = `Domanda ${currentIndex + 1} di ${TOTAL_QUESTIONS}`;
  }

  if (progressFill) {
    progressFill.style.width = `${((currentIndex + 1) / TOTAL_QUESTIONS) * 100}%`;
  }

  if (questionText) {
    questionText.textContent = q.question;
  }

  if (optionsContainer) {
    optionsContainer.innerHTML = '';
    q.options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = option;
      btn.addEventListener('click', () => handleAnswer(index));
      optionsContainer.appendChild(btn);
    });
  }
}

function handleAnswer(selectedIndex) {
  const q = questions[currentIndex];
  const optionsContainer = document.getElementById('quiz-options');
  const buttons = optionsContainer.querySelectorAll('.quiz-option');

  // Disable all options
  buttons.forEach(btn => btn.classList.add('disabled'));

  if (selectedIndex === q.correct) {
    buttons[selectedIndex].classList.add('correct');
    totalScore += POINTS_PER_QUESTION;
    correctCount++;

    // Audio + feedback
    if (typeof AudioManager !== 'undefined') AudioManager.play('correct');
    showScorePopup('+10 punti!');
  } else {
    buttons[selectedIndex].classList.add('wrong');
    buttons[q.correct].classList.add('correct');

    // Audio
    if (typeof AudioManager !== 'undefined') AudioManager.play('wrong');
  }

  // Auto-advance after delay
  setTimeout(() => {
    currentIndex++;
    if (currentIndex < TOTAL_QUESTIONS) {
      showQuestion();
    } else {
      showResults();
    }
  }, ADVANCE_DELAY);
}

async function showResults() {
  const overlay = document.querySelector('.result-overlay');
  const finalScore = document.getElementById('final-score');
  const modal = overlay ? overlay.querySelector('.result-modal') : null;

  if (finalScore) {
    finalScore.textContent = `${totalScore}/${TOTAL_QUESTIONS * POINTS_PER_QUESTION}`;
  }

  // Remove old dynamic content
  if (modal) {
    modal.querySelectorAll('.result-detail, .login-prompt').forEach(el => el.remove());
  }

  // Choose title and sound based on performance
  const titleEl = modal ? modal.querySelector('h2') : null;
  if (correctCount >= 8) {
    if (titleEl) titleEl.textContent = 'Eccezionale!';
    if (typeof AudioManager !== 'undefined') AudioManager.play('victory');
    showCelebration();
  } else if (correctCount >= 5) {
    if (titleEl) titleEl.textContent = 'Ben fatto!';
    if (typeof AudioManager !== 'undefined') AudioManager.play('victory');
  } else {
    if (titleEl) titleEl.textContent = 'Quiz Completato';
    if (typeof AudioManager !== 'undefined') AudioManager.play('lose');
  }

  // Add detail text
  if (modal) {
    const detailDiv = document.createElement('div');
    detailDiv.className = 'result-detail';
    const msgs = [];
    if (correctCount === TOTAL_QUESTIONS) {
      msgs.push('Perfetto! Conosci il mondo magico alla perfezione!');
    } else if (correctCount >= 8) {
      msgs.push('Quasi perfetto! Sei un vero mago!');
    } else if (correctCount >= 5) {
      msgs.push(`${correctCount} risposte corrette su ${TOTAL_QUESTIONS}. Buona conoscenza!`);
    } else {
      msgs.push(`${correctCount} risposte corrette su ${TOTAL_QUESTIONS}. Riprova per migliorare!`);
    }
    detailDiv.innerHTML = msgs.join('<br>');
    const actionsEl = modal.querySelector('.result-actions');
    if (actionsEl) actionsEl.before(detailDiv);

    // Leaderboard position
    const rankInfo = await getLeaderboardPosition('quiz', totalScore);
    if (rankInfo) {
      const rankDiv = document.createElement('div');
      rankDiv.className = 'result-detail';
      rankDiv.innerHTML = `Sei al <span class="rank">${rankInfo.position}° posto</span> su ${rankInfo.total} giocatori!`;
      detailDiv.after(rankDiv);
    }

    // Login prompt
    showLoginPrompt(modal);
  }

  if (overlay) {
    overlay.classList.add('show');
  }

  // Save score to server
  saveScore('quiz', totalScore, null);
}

function restartQuiz() {
  initQuiz();
}
