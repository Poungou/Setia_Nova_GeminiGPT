-- Les comptes peuvent être identifiés par leur pseudo : l'email devient
-- facultatif. SQLite ne permet pas de retirer NOT NULL directement, on
-- reconstruit la table en conservant les colonnes et les lignes existantes.
PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'Membre',
  disabled INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 0,
  pending_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users_new (id, email, name, role, status, disabled, password_hash, session_version, pending_email, created_at, updated_at)
SELECT id, NULLIF(email, ''), name, role, COALESCE(status, 'Membre'), disabled, password_hash,
       COALESCE(session_version, 0), pending_email, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

PRAGMA foreign_keys = ON;
PRAGMA optimize;