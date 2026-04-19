const express = require('express');
const db = require('../db/database');
const router = express.Router();

// Save score
router.post('/scores', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Devi essere loggato per salvare il punteggio' });
  }

  const { game_type, score, time_seconds } = req.body;
  const validGames = ['crucipuzzle', 'cruciverba', 'quiz'];

  if (!validGames.includes(game_type)) {
    return res.status(400).json({ error: 'Tipo di gioco non valido' });
  }

  db.prepare('INSERT INTO scores (user_id, game_type, score, time_seconds) VALUES (?, ?, ?, ?)')
    .run(req.session.user.id, game_type, score, time_seconds || null);

  res.json({ success: true });
});

// Get leaderboard
router.get('/classifiche/:game_type', (req, res) => {
  const { game_type } = req.params;
  const validGames = ['crucipuzzle', 'cruciverba', 'quiz'];

  if (!validGames.includes(game_type)) {
    return res.status(400).json({ error: 'Tipo di gioco non valido' });
  }

  const scores = db.prepare(`
    SELECT s.score, s.time_seconds, s.played_at, u.username, u.house
    FROM scores s
    JOIN users u ON s.user_id = u.id
    WHERE s.game_type = ?
    ORDER BY s.score DESC, s.time_seconds ASC
    LIMIT 50
  `).all(game_type);

  res.json(scores);
});

// Get user's personal best scores
router.get('/my-scores', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Non loggato' });
  }

  const scores = db.prepare(`
    SELECT game_type, MAX(score) as best_score, COUNT(*) as times_played
    FROM scores
    WHERE user_id = ?
    GROUP BY game_type
  `).all(req.session.user.id);

  res.json(scores);
});

// House statistics
router.get('/houses', (req, res) => {
  const stats = db.prepare(`
    SELECT house, COUNT(*) as members
    FROM users
    WHERE house IS NOT NULL
    GROUP BY house
    ORDER BY members DESC
  `).all();

  res.json(stats);
});

module.exports = router;
