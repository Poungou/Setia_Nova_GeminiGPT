-- Profil Nova-Setia : le role reste technique, le statut est editorial.
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'Membre';

-- Registre extensible : une nouvelle permission ne demande pas de nouvelle
-- colonne users. L'absence de ligne signifie que le droit est refuse.
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 0 CHECK (granted IN (0, 1)),
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- Lieux de comptes : les champs variables restent dans data, comme pour les
-- clans, afin de conserver la structure actuelle des fiches de lieux.
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL DEFAULT 'system',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_locations_owner ON locations(owner_user_id);

PRAGMA optimize;