import Database from "better-sqlite3";
import path from "path";

// =====================
// DB INIT
// =====================

const dbPath = path.join(__dirname, "../../data/app.db");
export const db = new Database(dbPath);

// Recommandé : quelques pragmas SQLite
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// =====================
// SAFE MIGRATIONS (ALTER)
// =====================

// users.language
try {
  db.exec(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'fr'`);
} catch {}

// users.dark_mode
try {
  db.exec(`ALTER TABLE users ADD COLUMN dark_mode INTEGER DEFAULT 0`);
} catch {}

// users.show_chats
try {
  db.exec(`ALTER TABLE users ADD COLUMN show_chats INTEGER DEFAULT 1`);
} catch {}

// users.avatar
try {
  db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
} catch {}

// messages.audio_path
try {
  db.exec(`ALTER TABLE messages ADD COLUMN audio_path TEXT`);
} catch {}

// messages.edited_at
try {
  db.exec(`ALTER TABLE messages ADD COLUMN edited_at INTEGER`);
} catch {}

// stories.status
try {
  db.exec(`ALTER TABLE stories ADD COLUMN status TEXT DEFAULT 'draft'`);
} catch {}

// stories.updated_at
try {
  db.exec(`ALTER TABLE stories ADD COLUMN updated_at INTEGER`);
} catch {}

// stories.published_at
try {
  db.exec(`ALTER TABLE stories ADD COLUMN published_at INTEGER`);
} catch {}

// stories.shared
try {
  db.exec(`ALTER TABLE stories ADD COLUMN shared INTEGER DEFAULT 0`);
} catch {}

// =====================
// TABLES
// =====================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  city TEXT,
  country TEXT,
  situation TEXT,
  language TEXT DEFAULT 'fr',
  dark_mode INTEGER DEFAULT 0,
  show_chats INTEGER DEFAULT 1,
  avatar TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  tags TEXT DEFAULT '[]',            -- JSON string: ["burnout","solitude",...]
  status TEXT DEFAULT 'draft',       -- 'draft' | 'published'
  shared INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  published_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT,
  audio_path TEXT,
  created_at INTEGER NOT NULL,
  edited_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// =====================
// LIKES / COMMENTS
// =====================

db.exec(`
CREATE TABLE IF NOT EXISTS story_likes (
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (story_id, user_id),
  FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS story_comments (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// =====================
// REPORTS
// =====================

db.exec(`
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,         -- 'story' | 'comment' | 'user' | 'dm'
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,              -- 'harassment' | 'hate' | 'self-harm' etc.
  details TEXT,
  status TEXT DEFAULT 'open',        -- 'open' | 'reviewed' | 'closed'
  created_at INTEGER NOT NULL,
  FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// =====================
// FRIENDS / MATCHES
// =====================

db.exec(`
CREATE TABLE IF NOT EXISTS friends (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',     -- 'pending' | 'accepted' | 'blocked'
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, friend_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// =====================
// DM (THREADS / MESSAGES / UNLOCKS)
// =====================

db.exec(`
CREATE TABLE IF NOT EXISTS dm_threads (
  id TEXT PRIMARY KEY,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_a, user_b),
  FOREIGN KEY(user_a) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(user_b) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES dm_threads(id) ON DELETE CASCADE,
  FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dm_unlocks (
  user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  paid INTEGER DEFAULT 0,
  provider TEXT,                    -- 'stripe'
  provider_ref TEXT,                -- session_id / payment_intent
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, target_user_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// =====================
// INDEXES
// =====================

db.exec(`
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_published_at ON stories(published_at);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_story_likes_story ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user ON story_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_story ON story_comments(story_id);

CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_thread ON dm_messages(thread_id);
`);

// =====================
// FTS5 (OPTIONNEL)
// =====================

try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS stories_fts
    USING fts5(id, title, body, tags_text, content='');
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS stories_ai AFTER INSERT ON stories BEGIN
      INSERT INTO stories_fts(id, title, body, tags_text)
      VALUES (new.id, new.title, new.body, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS stories_au AFTER UPDATE ON stories BEGIN
      UPDATE stories_fts
      SET title = new.title,
          body = new.body,
          tags_text = new.tags
      WHERE id = new.id;
    END;

    CREATE TRIGGER IF NOT EXISTS stories_ad AFTER DELETE ON stories BEGIN
      DELETE FROM stories_fts WHERE id = old.id;
    END;
  `);
} catch {
  // FTS5 non dispo -> ignorer
}
