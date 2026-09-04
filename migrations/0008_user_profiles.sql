-- Profil RP public séparé des identifiants techniques de users.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar TEXT NOT NULL DEFAULT '',
  image_source TEXT NOT NULL DEFAULT '',
  player_intro TEXT NOT NULL DEFAULT '',
  writing_style TEXT NOT NULL DEFAULT '',
  univers TEXT NOT NULL DEFAULT '',
  tw TEXT NOT NULL DEFAULT '',
  rhythm TEXT NOT NULL DEFAULT '',
  ig_username TEXT NOT NULL DEFAULT '',
  profile_public INTEGER NOT NULL DEFAULT 0 CHECK (profile_public IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_public ON user_profiles(profile_public);
PRAGMA optimize;