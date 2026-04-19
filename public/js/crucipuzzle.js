// ===== CRUCIPUZZLE (Word Search) Game =====

(function () {
  const GRID_SIZE = 12;
  const DIRECTIONS = [
    { dr: 0, dc: 1 },   // horizontal right
    { dr: 0, dc: -1 },  // horizontal left
    { dr: 1, dc: 0 },   // vertical down
    { dr: -1, dc: 0 },  // vertical up
    { dr: 1, dc: 1 },   // diagonal down-right
    { dr: -1, dc: -1 }, // diagonal up-left
    { dr: 1, dc: -1 },  // diagonal down-left
    { dr: -1, dc: 1 }   // diagonal up-right
  ];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let grid = [];
  let words = [];
  let foundWords = new Set();
  let timerInterval = null;
  let elapsedSeconds = 0;
  let selectionStart = null;
  let puzzleData = null;
  let currentSet = null;

  // DOM references
  const puzzleGrid = document.getElementById('puzzle-grid');
  const wordListEl = document.getElementById('word-list');
  const timerEl = document.getElementById('timer');
  const scoreEl = document.getElementById('score');
  const startBtn = document.getElementById('start-btn');
  const resultOverlay = document.querySelector('.result-overlay');
  const finalScoreEl = document.getElementById('final-score');
  const finalTimeEl = document.getElementById('final-time');

  // --- Init ---
  document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    setupNav();
    await loadPuzzleData();
    startBtn.addEventListener('click', startGame);
  });

  async function loadPuzzleData() {
    try {
      const res = await fetch('/data/crucipuzzle-words.json');
      puzzleData = await res.json();
    } catch (e) {
      console.error('Failed to load puzzle data:', e);
    }
  }

  // --- Game start ---
  function startGame() {
    if (!puzzleData || puzzleData.length === 0) return;

    // Pick a random puzzle set
    currentSet = puzzleData[Math.floor(Math.random() * puzzleData.length)];
    words = currentSet.words.map(w => w.toUpperCase());
    foundWords = new Set();
    selectionStart = null;

    // Generate grid
    grid = generateGrid(words);

    // Render
    renderGrid();
    renderWordList();

    // Start timer
    elapsedSeconds = 0;
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);

    // Hide result overlay
    if (resultOverlay) resultOverlay.classList.remove('visible');
    if (scoreEl) scoreEl.textContent = '';

    startBtn.textContent = 'Ricomincia';
  }

  // --- Grid generation ---
  function generateGrid(wordList) {
    const g = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));

    // Sort words longest first for better placement
    const sorted = [...wordList].sort((a, b) => b.length - a.length);

    for (const word of sorted) {
      placeWord(g, word);
    }

    // Fill empty cells with random letters
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!g[r][c]) {
          g[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        }
      }
    }

    return g;
  }

  function placeWord(g, word) {
    const dirs = shuffleArray([...DIRECTIONS]);
    const positions = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        positions.push({ r, c });
      }
    }

    const shuffledPos = shuffleArray(positions);

    for (const dir of dirs) {
      for (const pos of shuffledPos) {
        if (canPlace(g, word, pos.r, pos.c, dir)) {
          for (let i = 0; i < word.length; i++) {
            g[pos.r + i * dir.dr][pos.c + i * dir.dc] = word[i];
          }
          return true;
        }
      }
    }

    console.warn('Could not place word:', word);
    return false;
  }

  function canPlace(g, word, row, col, dir) {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * dir.dr;
      const c = col + i * dir.dc;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
      if (g[r][c] && g[r][c] !== word[i]) return false;
    }
    return true;
  }

  // --- Rendering ---
  function renderGrid() {
    puzzleGrid.innerHTML = '';
    puzzleGrid.classList.add('word-grid');
    puzzleGrid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.textContent = grid[r][c];
        cell.addEventListener('click', () => handleCellClick(r, c));
        puzzleGrid.appendChild(cell);
      }
    }
  }

  function renderWordList() {
    wordListEl.innerHTML = '';
    for (const word of words) {
      const span = document.createElement('span');
      span.classList.add('word');
      span.textContent = word;
      span.dataset.word = word;
      wordListEl.appendChild(span);
    }
  }

  // --- Selection logic ---
  function handleCellClick(row, col) {
    if (!words.length) return;

    if (!selectionStart) {
      // First click — start selection
      selectionStart = { row, col };
      clearHighlights();
      getCell(row, col).classList.add('selected');
    } else {
      // Second click — end selection
      const start = selectionStart;
      selectionStart = null;

      const cells = getCellsInLine(start.row, start.col, row, col);

      if (!cells) {
        // Not a valid straight line
        clearHighlights();
        return;
      }

      const selectedWord = cells.map(({ r, c }) => grid[r][c]).join('');
      const reversedWord = [...selectedWord].reverse().join('');

      let matchedWord = null;
      if (words.includes(selectedWord) && !foundWords.has(selectedWord)) {
        matchedWord = selectedWord;
      } else if (words.includes(reversedWord) && !foundWords.has(reversedWord)) {
        matchedWord = reversedWord;
      }

      clearHighlights();

      if (matchedWord) {
        foundWords.add(matchedWord);

        // Highlight found cells
        for (const { r, c } of cells) {
          getCell(r, c).classList.add('found');
        }

        // Mark word in list
        const wordSpan = wordListEl.querySelector(`[data-word="${matchedWord}"]`);
        if (wordSpan) wordSpan.classList.add('found');

        // Check win
        if (foundWords.size === words.length) {
          endGame();
        }
      }
    }
  }

  function getCell(row, col) {
    return puzzleGrid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  function clearHighlights() {
    puzzleGrid.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
  }

  function getCellsInLine(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;

    // Must be a straight line: horizontal, vertical, or diagonal (45 degrees)
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    if (absDr !== 0 && absDc !== 0 && absDr !== absDc) return null;
    if (absDr === 0 && absDc === 0) return null;

    const steps = Math.max(absDr, absDc);
    const stepR = dr === 0 ? 0 : dr / absDr;
    const stepC = dc === 0 ? 0 : dc / absDc;

    const cells = [];
    for (let i = 0; i <= steps; i++) {
      cells.push({ r: r1 + i * stepR, c: c1 + i * stepC });
    }

    return cells;
  }

  // --- Timer ---
  function updateTimerDisplay() {
    if (timerEl) timerEl.textContent = formatTime(elapsedSeconds);
  }

  // --- End game ---
  function endGame() {
    clearInterval(timerInterval);

    // Score: base 1000, lose points for time
    const score = Math.max(100, 1000 - elapsedSeconds * 5);

    if (scoreEl) scoreEl.textContent = score;
    if (finalScoreEl) finalScoreEl.textContent = score;
    if (finalTimeEl) finalTimeEl.textContent = formatTime(elapsedSeconds);
    if (resultOverlay) resultOverlay.classList.add('visible');

    // Try to save score
    try {
      saveScore('crucipuzzle', score, elapsedSeconds);
    } catch (e) {
      console.log('Score save not available');
    }
  }
})();
