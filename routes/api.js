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

    // General leaderboard: sum of best scores per game per user
    if (game_type === 'generale') {
      const result = await pool.query(`
        SELECT u.username, u.house, SUM(best.best_score) as score
        FROM users u
        JOIN (
          SELECT user_id, game_type, MAX(score) as best_score
          FROM scores
          GROUP BY user_id, game_type
        ) best ON u.id = best.user_id
        GROUP BY u.id, u.username, u.house
        ORDER BY score DESC
        LIMIT 50
      `);
      return res.json(result.rows);
    }

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

// Get user profile data (scores, rankings)
router.get('/profilo', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Non loggato' });
    }

    const userId = req.session.user.id;

    // User info
    const userRes = await pool.query('SELECT id, username, house, created_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    const user = userRes.rows[0];

    // Best scores per game
    const scoresRes = await pool.query(`
      SELECT game_type, MAX(score) as best_score, COUNT(*) as times_played
      FROM scores WHERE user_id = $1
      GROUP BY game_type
    `, [userId]);

    // Total score (sum of best per game)
    const totalScore = scoresRes.rows.reduce((sum, r) => sum + parseInt(r.best_score), 0);

    // General ranking position
    const generalRankRes = await pool.query(`
      SELECT COUNT(*) + 1 as position FROM (
        SELECT SUM(best.best_score) as total
        FROM users u
        JOIN (
          SELECT user_id, game_type, MAX(score) as best_score
          FROM scores GROUP BY user_id, game_type
        ) best ON u.id = best.user_id
        WHERE u.id != $1
        GROUP BY u.id
        HAVING SUM(best.best_score) > $2
      ) ranked
    `, [userId, totalScore]);

    const totalPlayersRes = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as total FROM scores
    `);

    // Per-game ranking positions
    const gameRankings = {};
    for (const row of scoresRes.rows) {
      const rankRes = await pool.query(`
        SELECT COUNT(*) + 1 as position FROM (
          SELECT user_id, MAX(score) as best FROM scores
          WHERE game_type = $1 AND user_id != $2
          GROUP BY user_id
          HAVING MAX(score) > $3
        ) ranked
      `, [row.game_type, userId, row.best_score]);

      const gameTotalRes = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as total FROM scores WHERE game_type = $1
      `, [row.game_type]);

      gameRankings[row.game_type] = {
        best_score: parseInt(row.best_score),
        times_played: parseInt(row.times_played),
        position: parseInt(rankRes.rows[0].position),
        total: parseInt(gameTotalRes.rows[0].total)
      };
    }

    res.json({
      user,
      totalScore,
      generalPosition: parseInt(generalRankRes.rows[0].position),
      totalPlayers: parseInt(totalPlayersRes.rows[0].total),
      gameRankings
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Errore nel caricamento del profilo' });
  }
});

// Get quiz questions (from DB + JSON fallback)
router.get('/quiz-questions', async (req, res) => {
  try {
    const allQuestions = [];

    // Load from database first
    try {
      const result = await pool.query(
        'SELECT * FROM quiz_questions WHERE active = true ORDER BY created_at DESC'
      );
      for (const row of result.rows) {
        allQuestions.push({
          id: 'db_' + row.id,
          question: row.question,
          options: JSON.parse(row.options),
          correct: row.correct_index
        });
      }
    } catch (e) {
      console.error('DB quiz questions error:', e);
    }

    // Load from JSON file
    try {
      const jsonPath = path.join(__dirname, '..', 'data', 'quiz-questions.json');
      const data = fs.readFileSync(jsonPath, 'utf-8');
      const jsonQuestions = JSON.parse(data);
      allQuestions.push(...jsonQuestions);
    } catch (e) {}

    res.json(allQuestions);
  } catch (err) {
    console.error('Quiz questions error:', err);
    res.status(500).json([]);
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
