const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

// Save score
router.post('/scores', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Devi essere loggato per salvare il punteggio' });
  }

  const { game_type, score, time_seconds } = req.body;
  const validGames = ['crucipuzzle', 'cruciverba', 'quiz'];

  if (!validGames.includes(game_type)) {
    return res.status(400).json({ error: 'Tipo di gioco non valido' });
  }

  await pool.query(
    'INSERT INTO scores (user_id, game_type, score, time_seconds) VALUES ($1, $2, $3, $4)',
    [req.session.user.id, game_type, score, time_seconds || null]
  );

  res.json({ success: true });
});

// Get leaderboard
router.get('/classifiche/:game_type', async (req, res) => {
  const { game_type } = req.params;
  const validGames = ['crucipuzzle', 'cruciverba', 'quiz'];

  if (!validGames.includes(game_type)) {
    return res.status(400).json({ error: 'Tipo di gioco non valido' });
  }

  const result = await pool.query(`
    SELECT s.score, s.time_seconds, s.played_at, u.username, u.house
    FROM scores s
    JOIN users u ON s.user_id = u.id
    WHERE s.game_type = $1
    ORDER BY s.score DESC, s.time_seconds ASC
    LIMIT 50
  `, [game_type]);

  res.json(result.rows);
});

// Get user's personal best scores
router.get('/my-scores', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Non loggato' });
  }

  const result = await pool.query(`
    SELECT game_type, MAX(score) as best_score, COUNT(*) as times_played
    FROM scores
    WHERE user_id = $1
    GROUP BY game_type
  `, [req.session.user.id]);

  res.json(result.rows);
});

// House statistics
router.get('/houses', async (req, res) => {
  const result = await pool.query(`
    SELECT house, COUNT(*) as members
    FROM users
    WHERE house IS NOT NULL
    GROUP BY house
    ORDER BY members DESC
  `);

  res.json(result.rows);
});

module.exports = router;
