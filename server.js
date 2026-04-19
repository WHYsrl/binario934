require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const { pool, initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Render, Heroku, etc. use reverse proxies)
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sessions with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false
  }),
  secret: process.env.SESSION_SECRET || 'binario-9-e-tre-quarti-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Make user available to all responses
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Serve game data
app.use('/data', express.static(path.join(__dirname, 'data')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/crucipuzzle', (req, res) => res.sendFile(path.join(__dirname, 'views', 'crucipuzzle.html')));
app.get('/cruciverba', (req, res) => res.sendFile(path.join(__dirname, 'views', 'cruciverba.html')));
app.get('/quiz', (req, res) => res.sendFile(path.join(__dirname, 'views', 'quiz.html')));
app.get('/cappello', (req, res) => res.sendFile(path.join(__dirname, 'views', 'cappello.html')));
app.get('/classifiche', (req, res) => res.sendFile(path.join(__dirname, 'views', 'classifiche.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));

// Init DB then start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🧙 Binario 9 e 3/4 attivo su http://localhost:${PORT}`);
  });
});
