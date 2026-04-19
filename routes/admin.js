const express = require('express');
const { pool } = require('../db/database');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'binario934admin';

// Middleware: check admin session
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }
  res.status(401).json({ error: 'Accesso non autorizzato' });
}

// Admin login page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;
  console.log('Admin login attempt, password match:', password === ADMIN_PASSWORD);
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    // Explicitly save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Errore di sessione' });
      }
      res.json({ success: true });
    });
  } else {
    res.status(401).json({ error: 'Password non corretta' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

// Check admin status
router.get('/status', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// ===== CRUCIPUZZLE Word Sets =====

// Get all word sets (from DB + JSON fallback)
router.get('/word-sets', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM word_sets ORDER BY created_at DESC'
    );

    // Also include the static JSON sets
    let staticSets = [];
    try {
      const jsonPath = path.join(__dirname, '..', 'data', 'crucipuzzle-words.json');
      const data = fs.readFileSync(jsonPath, 'utf-8');
      staticSets = JSON.parse(data).map(s => ({
        ...s,
        source: 'file',
        active: true,
        words: s.words.join(', ')
      }));
    } catch (e) {}

    const dbSets = result.rows.map(r => ({
      ...r,
      source: 'database'
    }));

    res.json({ dbSets, staticSets });
  } catch (err) {
    console.error('Admin word-sets error:', err);
    res.status(500).json({ error: 'Errore nel caricamento' });
  }
});

// Create a new word set
router.post('/word-sets', requireAdmin, async (req, res) => {
  try {
    const { theme, words } = req.body;

    if (!theme || !words) {
      return res.status(400).json({ error: 'Tema e parole sono obbligatori' });
    }

    // Words is a comma-separated string, clean it up
    const wordList = words.split(',')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0);

    if (wordList.length < 3) {
      return res.status(400).json({ error: 'Inserisci almeno 3 parole' });
    }

    if (wordList.some(w => w.length > 12)) {
      return res.status(400).json({ error: 'Le parole non possono superare 12 caratteri (dimensione griglia)' });
    }

    const result = await pool.query(
      'INSERT INTO word_sets (theme, words) VALUES ($1, $2) RETURNING *',
      [theme, wordList.join(',')]
    );

    res.json({ success: true, wordSet: result.rows[0] });
  } catch (err) {
    console.error('Admin create word-set error:', err);
    res.status(500).json({ error: 'Errore nel salvataggio' });
  }
});

// Update a word set
router.put('/word-sets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { theme, words, active } = req.body;

    const wordList = words.split(',')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0);

    if (wordList.length < 3) {
      return res.status(400).json({ error: 'Inserisci almeno 3 parole' });
    }

    await pool.query(
      'UPDATE word_sets SET theme = $1, words = $2, active = $3 WHERE id = $4',
      [theme, wordList.join(','), active !== false, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Admin update word-set error:', err);
    res.status(500).json({ error: 'Errore nell\'aggiornamento' });
  }
});

// Delete a word set
router.delete('/word-sets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM word_sets WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete word-set error:', err);
    res.status(500).json({ error: 'Errore nell\'eliminazione' });
  }
});

module.exports = router;
