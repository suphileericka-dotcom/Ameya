import Database from "better-sqlite3";
import path from "path";

// chemin vers la base SQLite
const dbPath = path.join(__dirname, "../../data/app.db");

// instance unique de la base
export const db = new Database(dbPath);

// création des tables au démarrage
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  city TEXT,
  country TEXT,
  situation TEXT,
  dark_mode INTEGER DEFAULT 0,
  show_chats INTEGER DEFAULT 1,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  body TEXT,
  tags TEXT,
  shared INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room TEXT,
  user_id TEXT,
  content TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);



CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);
