// ===== BINARIO 9 E 3/4 - Audio Manager =====

const AudioManager = (function () {
  let bgMusic = null;
  let sfxEnabled = true;
  let musicEnabled = false;
  let initialized = false;

  const sounds = {};

  function init() {
    if (initialized) return;
    initialized = true;

    // Preload sound effects
    const sfxFiles = {
      correct: '/audio/risposta_corretta.mp3',
      wrong: '/audio/errore.mp3',
      victory: '/audio/vittoria.mp3',
      lose: '/audio/hai_perso.mp3',
      warning: '/audio/tempo_sta_finendo.mp3'
    };

    for (const [name, src] of Object.entries(sfxFiles)) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.5;
      sounds[name] = audio;
    }

    // Background music
    bgMusic = new Audio('/audio/background.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.15;

    // Load preferences from memory (not localStorage)
    // Default: sfx on, music off (to avoid autoplay issues)

    createToggleUI();
  }

  function createToggleUI() {
    const container = document.createElement('div');
    container.className = 'audio-controls';
    container.innerHTML = `
      <button class="audio-btn" id="toggle-music" title="Musica di sottofondo">
        <span class="audio-icon">&#9835;</span>
        <span class="audio-label">Musica</span>
      </button>
      <button class="audio-btn active" id="toggle-sfx" title="Effetti sonori">
        <span class="audio-icon">&#128264;</span>
        <span class="audio-label">Suoni</span>
      </button>
    `;

    document.body.appendChild(container);

    document.getElementById('toggle-music').addEventListener('click', toggleMusic);
    document.getElementById('toggle-sfx').addEventListener('click', toggleSfx);
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('toggle-music');

    if (musicEnabled) {
      bgMusic.play().catch(() => {
        musicEnabled = false;
        btn.classList.remove('active');
      });
      btn.classList.add('active');
    } else {
      bgMusic.pause();
      btn.classList.remove('active');
    }
  }

  function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    const btn = document.getElementById('toggle-sfx');
    btn.classList.toggle('active', sfxEnabled);
  }

  function play(soundName) {
    if (!sfxEnabled || !sounds[soundName]) return;
    // Clone to allow overlapping playback
    const clone = sounds[soundName].cloneNode();
    clone.volume = sounds[soundName].volume;
    clone.play().catch(() => {});
  }

  function stopAll() {
    for (const sound of Object.values(sounds)) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { play, stopAll, toggleMusic, toggleSfx };
})();
