const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables on startup
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        house VARCHAR(20) DEFAULT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        game_type VARCHAR(20) NOT NULL CHECK(game_type IN ('crucipuzzle', 'cruciverba', 'quiz')),
        score INTEGER NOT NULL,
        time_seconds INTEGER DEFAULT NULL,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_type, score DESC);
      CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);

      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        PRIMARY KEY (sid)
      );

      CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

      CREATE TABLE IF NOT EXISTS word_sets (
        id SERIAL PRIMARY KEY,
        theme VARCHAR(100) NOT NULL,
        words TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_index INTEGER NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS crossword_puzzles (
        id SERIAL PRIMARY KEY,
        theme VARCHAR(200) NOT NULL,
        rows INTEGER NOT NULL DEFAULT 13,
        cols INTEGER NOT NULL DEFAULT 13,
        words TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables ready');

    // Auto-import crossword puzzles from JSON if DB table is empty
    try {
      const cwCountRes = await client.query('SELECT COUNT(*) as c FROM crossword_puzzles');
      if (parseInt(cwCountRes.rows[0].c) === 0) {
        const cwJsonPath = path.join(__dirname, '..', 'data', 'cruciverba-data.json');
        const cwData = fs.readFileSync(cwJsonPath, 'utf-8');
        const puzzles = JSON.parse(cwData);
        if (puzzles.length > 0) {
          for (const p of puzzles) {
            await client.query(
              'INSERT INTO crossword_puzzles (theme, rows, cols, words) VALUES ($1, $2, $3, $4)',
              [p.theme, p.size, p.size, JSON.stringify(p.words)]
            );
          }
          console.log(`Imported ${puzzles.length} crossword puzzles from JSON to DB`);
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('Crossword import note:', e.message);
    }

    // Auto-import quiz questions from JSON if DB table is empty
    try {
      const countRes = await client.query('SELECT COUNT(*) as c FROM quiz_questions');
      if (parseInt(countRes.rows[0].c) === 0) {
        const jsonPath = path.join(__dirname, '..', 'data', 'quiz-questions.json');
        const data = fs.readFileSync(jsonPath, 'utf-8');
        const questions = JSON.parse(data);
        if (questions.length > 0) {
          for (const q of questions) {
            await client.query(
              'INSERT INTO quiz_questions (question, options, correct_index) VALUES ($1, $2, $3)',
              [q.question, JSON.stringify(q.options), q.correct]
            );
          }
          console.log(`Imported ${questions.length} quiz questions from JSON to DB`);
        }
      }
    } catch (e) {
      // Silently skip if JSON doesn't exist or is empty
      if (e.code !== 'ENOENT') console.error('Quiz import note:', e.message);
    }
  } catch (err) {
    console.error('DB init error:', err);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
