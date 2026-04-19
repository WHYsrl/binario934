// ===== CRUCIVERBA (Crossword) Game =====

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
  initCruciverba();
});

let puzzles = [];
let currentPuzzle = null;
let grid = [];         // 2D array: null = black, { letter, number } = white
let currentDirection = 'across';
let timerInterval = null;
let startTime = null;
let elapsedSeconds = 0;
let gameComplete = false;

async function initCruciverba() {
  try {
    const res = await fetch('/api/cruciverba-puzzles');
    puzzles = await res.json();
  } catch (e) {
    console.error('Failed to load crossword data:', e);
    return;
  }

  document.getElementById('check-btn').addEventListener('click', checkAnswers);
  document.getElementById('new-btn').addEventListener('click', loadNewPuzzle);

  loadNewPuzzle();
}

function loadNewPuzzle() {
  // Pick a random puzzle different from the current one if possible
  let available = puzzles.filter(p => !currentPuzzle || p.id !== currentPuzzle.id);
  if (available.length === 0) available = puzzles;
  currentPuzzle = available[Math.floor(Math.random() * available.length)];

  gameComplete = false;
  hideOverlay();
  resetTimer();
  startTimer();
  buildGrid();
  renderGrid();
  renderClues();

  // Show timer display
  updateTimerDisplay();
}

// ---- Grid building ----

function buildGrid() {
  const rows = currentPuzzle.rows || currentPuzzle.size;
  const cols = currentPuzzle.cols || currentPuzzle.size;
  grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (const w of currentPuzzle.words) {
    const letters = w.word.split('');
    for (let i = 0; i < letters.length; i++) {
      const r = w.direction === 'down' ? w.row + i : w.row;
      const c = w.direction === 'across' ? w.col + i : w.col;
      if (r < rows && c < cols) {
        if (!grid[r][c]) {
          grid[r][c] = { letter: letters[i].toUpperCase(), number: null };
        }
      }
    }
    if (grid[w.row] && grid[w.row][w.col]) {
      grid[w.row][w.col].number = w.number;
    }
  }
}

// ---- Rendering ----

function renderGrid() {
  const container = document.getElementById('crossword-grid');
  container.innerHTML = '';
  container.classList.add('crossword-grid');
  const rows = currentPuzzle.rows || currentPuzzle.size;
  const cols = currentPuzzle.cols || currentPuzzle.size;
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      if (!grid[r][c]) {
        cell.className = 'cell black';
      } else {
        cell.className = 'cell';
        if (grid[r][c].number !== null) {
          const numSpan = document.createElement('span');
          numSpan.className = 'cell-number';
          numSpan.textContent = grid[r][c].number;
          cell.appendChild(numSpan);
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.dataset.row = r;
        input.dataset.col = c;
        input.autocomplete = 'off';
        input.addEventListener('input', onCellInput);
        input.addEventListener('keydown', onCellKeydown);
        input.addEventListener('focus', onCellFocus);
        cell.appendChild(input);
      }
      container.appendChild(cell);
    }
  }
}

function renderClues() {
  const acrossContainer = document.getElementById('clues-across');
  const downContainer = document.getElementById('clues-down');
  acrossContainer.innerHTML = '';
  downContainer.innerHTML = '';

  const acrossWords = currentPuzzle.words.filter(w => w.direction === 'across');
  const downWords = currentPuzzle.words.filter(w => w.direction === 'down');

  acrossWords.sort((a, b) => a.number - b.number);
  downWords.sort((a, b) => a.number - b.number);

  for (const w of acrossWords) {
    acrossContainer.appendChild(createClueItem(w));
  }
  for (const w of downWords) {
    downContainer.appendChild(createClueItem(w));
  }
}

function createClueItem(w) {
  const li = document.createElement('li');
  li.className = 'clue-item';
  li.dataset.direction = w.direction;
  li.dataset.row = w.row;
  li.dataset.col = w.col;
  li.dataset.length = w.word.length;
  li.innerHTML = `<strong>${w.number}.</strong> ${w.clue}`;
  li.addEventListener('click', () => onClueClick(w));
  return li;
}

// ---- Navigation & Input ----

function getInput(r, c) {
  return document.querySelector(`#crossword-grid input[data-row="${r}"][data-col="${c}"]`);
}

function onCellInput(e) {
  const input = e.target;
  input.value = input.value.toUpperCase();
  if (input.value.length === 1) {
    moveToNext(parseInt(input.dataset.row), parseInt(input.dataset.col));
  }
}

function onCellKeydown(e) {
  const r = parseInt(e.target.dataset.row);
  const c = parseInt(e.target.dataset.col);

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      currentDirection = 'across';
      moveTo(r, c + 1);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      currentDirection = 'across';
      moveTo(r, c - 1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      currentDirection = 'down';
      moveTo(r + 1, c);
      break;
    case 'ArrowUp':
      e.preventDefault();
      currentDirection = 'down';
      moveTo(r - 1, c);
      break;
    case 'Tab':
      e.preventDefault();
      moveToNext(r, c);
      break;
    case 'Backspace':
      if (!e.target.value) {
        e.preventDefault();
        moveToPrev(r, c);
      }
      break;
  }
}

function onCellFocus(e) {
  const r = parseInt(e.target.dataset.row);
  const c = parseInt(e.target.dataset.col);

  // Auto-detect direction: if cell only belongs to one word direction, use that
  const acrossWord = currentPuzzle.words.find(w =>
    w.direction === 'across' && w.row === r && c >= w.col && c < w.col + w.word.length
  );
  const downWord = currentPuzzle.words.find(w =>
    w.direction === 'down' && w.col === c && r >= w.row && r < w.row + w.word.length
  );

  if (acrossWord && !downWord) {
    currentDirection = 'across';
  } else if (downWord && !acrossWord) {
    currentDirection = 'down';
  }
  // If both exist (intersection), keep current direction — user can toggle with arrows

  highlightWord(r, c, currentDirection);
}

function moveTo(r, c) {
  const rows = currentPuzzle.rows || currentPuzzle.size;
  const cols = currentPuzzle.cols || currentPuzzle.size;
  if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c]) {
    const input = getInput(r, c);
    if (input) input.focus();
  }
}

function moveToNext(r, c) {
  const rows = currentPuzzle.rows || currentPuzzle.size;
  const cols = currentPuzzle.cols || currentPuzzle.size;
  if (currentDirection === 'across') {
    for (let nc = c + 1; nc < cols; nc++) {
      if (grid[r][nc]) { moveTo(r, nc); return; }
    }
  } else {
    for (let nr = r + 1; nr < rows; nr++) {
      if (grid[nr][c]) { moveTo(nr, c); return; }
    }
  }
}

function moveToPrev(r, c) {
  const cols = currentPuzzle.cols || currentPuzzle.size;
  if (currentDirection === 'across') {
    for (let nc = c - 1; nc >= 0; nc--) {
      if (grid[r][nc]) { moveTo(r, nc); return; }
    }
  } else {
    for (let nr = r - 1; nr >= 0; nr--) {
      if (grid[nr][c]) { moveTo(nr, c); return; }
    }
  }
}

// ---- Highlighting ----

function clearHighlights() {
  document.querySelectorAll('#crossword-grid .cell').forEach(cell => {
    cell.classList.remove('highlighted');
  });
  document.querySelectorAll('.clue-item').forEach(li => {
    li.classList.remove('active');
  });
}

function highlightWord(startRow, startCol, direction) {
  clearHighlights();

  const word = currentPuzzle.words.find(w => {
    if (w.direction !== direction) return false;
    if (direction === 'across') {
      return w.row === startRow && startCol >= w.col && startCol < w.col + w.word.length;
    } else {
      return w.col === startCol && startRow >= w.row && startRow < w.row + w.word.length;
    }
  });

  if (!word) return;

  for (let i = 0; i < word.word.length; i++) {
    const r = word.direction === 'down' ? word.row + i : word.row;
    const c = word.direction === 'across' ? word.col + i : word.col;
    const input = getInput(r, c);
    if (input) input.parentElement.classList.add('highlighted');
  }

  const clueItem = document.querySelector(
    `.clue-item[data-direction="${word.direction}"][data-row="${word.row}"][data-col="${word.col}"]`
  );
  if (clueItem) clueItem.classList.add('active');
}

function onClueClick(w) {
  currentDirection = w.direction;
  const input = getInput(w.row, w.col);
  if (input) input.focus();
  highlightWord(w.row, w.col, w.direction);
}

// ---- Check Answers ----

function checkAnswers() {
  const rows = currentPuzzle.rows || currentPuzzle.size;
  const cols = currentPuzzle.cols || currentPuzzle.size;
  let allCorrect = true;
  let filledCount = 0;
  let correctCount = 0;
  let totalWhite = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      totalWhite++;
      const input = getInput(r, c);
      if (!input) continue;

      const cell = input.parentElement;
      cell.classList.remove('correct', 'wrong');

      const userVal = input.value.toUpperCase();
      if (!userVal) {
        allCorrect = false;
        continue;
      }

      filledCount++;
      if (userVal === grid[r][c].letter) {
        cell.classList.add('correct');
        correctCount++;
      } else {
        cell.classList.add('wrong');
        allCorrect = false;
      }
    }
  }

  // Feedback banner
  let oldFeedback = document.getElementById('check-feedback');
  if (oldFeedback) oldFeedback.remove();

  const feedbackDiv = document.createElement('div');
  feedbackDiv.id = 'check-feedback';
  feedbackDiv.className = 'feedback-banner';

  if (allCorrect && filledCount === totalWhite) {
    onPuzzleComplete();
    return;
  } else if (filledCount === 0) {
    feedbackDiv.classList.add('info');
    feedbackDiv.textContent = 'Compila almeno qualche casella prima di verificare!';
    if (typeof AudioManager !== 'undefined') AudioManager.play('wrong');
  } else {
    const wrongCount = filledCount - correctCount;
    const emptyCount = totalWhite - filledCount;
    feedbackDiv.classList.add(wrongCount > 0 ? 'wrong' : 'info');
    let msg = `${correctCount} corrette, ${wrongCount} errate`;
    if (emptyCount > 0) msg += `, ${emptyCount} da completare`;
    feedbackDiv.textContent = msg;
    if (wrongCount > 0 && typeof AudioManager !== 'undefined') AudioManager.play('wrong');
    else if (typeof AudioManager !== 'undefined') AudioManager.play('correct');
  }

  const gridEl = document.getElementById('crossword-grid');
  gridEl.parentNode.insertBefore(feedbackDiv, gridEl.nextSibling);
}

async function onPuzzleComplete() {
  if (gameComplete) return;
  gameComplete = true;
  stopTimer();

  const score = Math.max(100, 1000 - elapsedSeconds * 2);
  const timeStr = formatTime(elapsedSeconds);

  // Play victory
  if (typeof AudioManager !== 'undefined') AudioManager.play('victory');
  showCelebration();

  document.getElementById('final-score').textContent = score;
  document.getElementById('final-time').textContent = timeStr;

  // Save score FIRST
  await saveScore('cruciverba', score, elapsedSeconds);

  // Build result modal with feedback
  const overlay = document.querySelector('.result-overlay');
  const modal = overlay ? overlay.querySelector('.result-modal') : null;

  if (modal) {
    modal.querySelectorAll('.result-detail, .login-prompt').forEach(el => el.remove());

    const detailDiv = document.createElement('div');
    detailDiv.className = 'result-detail';
    detailDiv.innerHTML = `Cruciverba completato in <strong>${timeStr}</strong>! Tutte le <strong>${currentPuzzle.words.length} parole</strong> sono corrette.`;
    const actionsEl = modal.querySelector('.result-actions');
    if (actionsEl) actionsEl.before(detailDiv);

    // Leaderboard position (after save)
    const rankInfo = await getLeaderboardPosition('cruciverba', score);
    if (rankInfo) {
      const rankDiv = document.createElement('div');
      rankDiv.className = 'result-detail';
      rankDiv.innerHTML = `Sei al <span class="rank">${rankInfo.position}° posto</span> su ${rankInfo.total} giocatori!`;
      detailDiv.after(rankDiv);
    }

    showLoginPrompt(modal);
  }

  showOverlay();
}

// ---- Timer ----

function startTimer() {
  startTime = Date.now();
  elapsedSeconds = 0;
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('crossword-timer');
  if (timerEl) timerEl.textContent = formatTime(elapsedSeconds);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  stopTimer();
  elapsedSeconds = 0;
}

// ---- Overlay ----

function showOverlay() {
  const overlay = document.querySelector('.result-overlay');
  if (overlay) overlay.classList.add('show');
}

function hideOverlay() {
  const overlay = document.querySelector('.result-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.classList.remove('visible');
  }
}
