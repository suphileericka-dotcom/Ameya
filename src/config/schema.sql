-- =====================
-- USERS
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  city TEXT,
  country TEXT,
  situation TEXT,
  language TEXT DEFAULT 'fr',
  dark_mode BOOLEAN DEFAULT false,
  show_chats BOOLEAN DEFAULT true,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- STORIES
-- =====================
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  published_at TIMESTAMP
);

-- =====================
-- MESSAGES (GROUP CHAT)
-- =====================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  room TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  audio_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  edited_at TIMESTAMP
);

-- =====================
-- JOURNAL
-- =====================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- STORY LIKES
-- =====================
CREATE TABLE IF NOT EXISTS story_likes (
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

-- =====================
-- STORY COMMENTS
-- =====================
CREATE TABLE IF NOT EXISTS story_comments (
  id UUID PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- REPORTS
-- =====================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- FRIENDS / MATCHES
-- =====================
CREATE TABLE IF NOT EXISTS friends (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- =====================
-- DM THREADS
-- =====================
CREATE TABLE IF NOT EXISTS dm_threads (
  id UUID PRIMARY KEY,
  user_a UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_a, user_b)
);

-- =====================
-- DM MESSAGES
-- =====================
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES dm_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- DM UNLOCKS (PAYMENTS)
-- =====================
CREATE TABLE IF NOT EXISTS dm_unlocks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  paid BOOLEAN DEFAULT false,
  provider TEXT,
  provider_ref TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, target_user_id)
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- =====================
-- FULL TEXT SEARCH
-- =====================
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS search tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,''))
) STORED;

CREATE INDEX IF NOT EXISTS idx_stories_search
ON stories USING GIN(search);
