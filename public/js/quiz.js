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

async function initQuiz() {
  try {
    const res = await fetch('/data/quiz-questions.json');
    const allQuestions = await res.json();
    questions = shuffleArray(allQuestions).slice(0, TOTAL_QUESTIONS);
    currentIndex = 0;
    totalScore = 0;
    showQuestion();
  } catch (e) {
    console.error('Failed to load quiz questions:', e);
  }
}

function showQuestion() {
  const q = questions[currentIndex];

  // Update progress text and bar
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

  // Render options
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
    // Correct answer
    buttons[selectedIndex].classList.add('correct');
    totalScore += POINTS_PER_QUESTION;
  } else {
    // Wrong answer - highlight selected as wrong, show correct
    buttons[selectedIndex].classList.add('wrong');
    buttons[q.correct].classList.add('correct');
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

function showResults() {
  const overlay = document.querySelector('.result-overlay');
  const finalScore = document.getElementById('final-score');

  if (finalScore) {
    finalScore.textContent = totalScore;
  }

  if (overlay) {
    overlay.classList.add('active');
  }

  // Save score to server
  saveScore('quiz', totalScore, null);
}

function restartQuiz() {
  const overlay = document.querySelector('.result-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  initQuiz();
}
