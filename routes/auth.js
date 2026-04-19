const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/database');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username o email già in uso' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hash]
    );

    req.session.user = { id: result.rows[0].id, username, email, house: null };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1', [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    req.session.user = { id: user.id, username: user.username, email: user.email, house: user.house };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Current user
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

// Update house after sorting hat
router.post('/house', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Devi essere loggato' });
  }
  const { house } = req.body;
  const validHouses = ['Grifondoro', 'Serpeverde', 'Corvonero', 'Tassorosso'];
  if (!validHouses.includes(house)) {
    return res.status(400).json({ error: 'Casa non valida' });
  }

  await pool.query('UPDATE users SET house = $1 WHERE id = $2', [house, req.session.user.id]);
  req.session.user.house = house;
  res.json({ success: true, house });
});

module.exports = router;
