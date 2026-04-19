const express = require('express');
const { pool } = require('../db/database');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Save score
router.post('/scores', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Devi essere loggato per salvare il punteggio' });
    }

    const { game_type, score, time_seconds } = req.body;
    const validGames = ['crucipuzzle', 'cruciverba', 'quiz'];

    if (!validGames.includes(game_type)) {
      return res.status(400).json({ error: 'Tipo di gioco non valido' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Punteggio non valido' });
    }

    await pool.query(
      'INSERT INTO scores (user_id, game_type, score, time_seconds) VALUES ($1, $2, $3, $4)',
      [req.session.user.id, game_type, score, time_seconds || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Score save error:', err);
    res.status(500).json({ error: 'Errore nel salvataggio del punteggio' });
  }
});

// Get leaderboard
router.get('/classifiche/:game_type', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Errore nel caricamento della classifica' });
  }
});

// Get user's personal best scores
router.get('/my-scores', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('My scores error:', err);
    res.status(500).json({ error: 'Errore nel caricamento dei punteggi' });
  }
});

// House statistics
router.get('/houses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT house, COUNT(*) as members
      FROM users
      WHERE house IS NOT NULL
      GROUP BY house
      ORDER BY members DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Houses error:', err);
    res.status(500).json({ error: 'Errore' });
  }
});

// Get crucipuzzle word sets (DB + JSON combined)
router.get('/crucipuzzle-words', async (req, res) => {
  try {
    const allSets = [];

    // Load from JSON file
    try {
      const jsonPath = path.join(__dirname, '..', 'data', 'crucipuzzle-words.json');
      const data = fs.readFileSync(jsonPath, 'utf-8');
      const jsonSets = JSON.parse(data);
      allSets.push(...jsonSets);
    } catch (e) {}

    // Load from database
    try {
      const result = await pool.query(
        'SELECT * FROM word_sets WHERE active = true ORDER BY created_at DESC'
      );
      for (const row of result.rows) {
        allSets.push({
          id: 'db_' + row.id,
          theme: row.theme,
          words: row.words.split(',').map(w => w.trim())
        });
      }
    } catch (e) {
      console.error('DB word sets error:', e);
    }

    res.json(allSets);
  } catch (err) {
    console.error('Crucipuzzle words error:', err);
    res.status(500).json([]);
  }
});

module.exports = router;
