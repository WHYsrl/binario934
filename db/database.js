const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'binario934.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    house TEXT DEFAULT NULL,
    avatar TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_type TEXT NOT NULL CHECK(game_type IN ('crucipuzzle', 'cruciverba', 'quiz')),
    score INTEGER NOT NULL,
    time_seconds INTEGER DEFAULT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_type, score DESC);
  CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
`);

module.exports = db;
