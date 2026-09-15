CREATE TABLE IF NOT EXISTS culture_posts (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_culture_owner ON culture_posts(owner_user_id);
CREATE TABLE IF NOT EXISTS culture_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE
);
CREATE TABLE IF NOT EXISTS culture_post_tags (
  post_id TEXT NOT NULL REFERENCES culture_posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES culture_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
INSERT OR IGNORE INTO culture_tags (id, name) VALUES
  ('coutumes', 'Coutumes'), ('croyances', 'Croyances'), ('cuisine', 'Cuisine'),
  ('fetes', 'Fêtes'), ('langues', 'Langues'), ('arts', 'Arts');
