-- Articles de journal créés depuis les comptes utilisateurs.
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_owner ON posts(owner_user_id);
PRAGMA optimize;