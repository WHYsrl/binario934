const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');
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

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: 'Username o email già in uso' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hash);

    req.session.user = { id: result.lastInsertRowid, username, email, house: null };
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

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
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
router.post('/house', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Devi essere loggato' });
  }
  const { house } = req.body;
  const validHouses = ['Grifondoro', 'Serpeverde', 'Corvonero', 'Tassorosso'];
  if (!validHouses.includes(house)) {
    return res.status(400).json({ error: 'Casa non valida' });
  }

  db.prepare('UPDATE users SET house = ? WHERE id = ?').run(house, req.session.user.id);
  req.session.user.house = house;
  res.json({ success: true, house });
});

module.exports = router;
