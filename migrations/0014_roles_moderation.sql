-- Rôles, droits précis et modération.
--
-- 1. Rôles : users.role passe de ('admin','user') à
--    ('admin','creator','journalist','guest'). `users.status` (Membre /
--    RPiste / Invité) n'est plus lu par le Worker : la colonne reste en base,
--    inutilisée, pour permettre un retour arrière sans perte.
-- 2. Droits retirés : table dédiée `user_revoked_rights`. `user_permissions`
--    reste intacte (elle porte les droits AJOUTÉS, conservés tels quels).
-- 3. Modération : colonnes review_* sur les contenus de comptes, tous les
--    contenus existants restent visibles (`published`), sauf les brouillons.
-- 4. Signalements : table `content_reports`.
--
-- À appliquer UNE seule fois (les ALTER TABLE ne sont pas rejouables).

-- 1. Rôles -------------------------------------------------------------------
-- Seuls les comptes encore en 'user' sont convertis ; 'admin' ne change jamais.
--   creator    : statut RPiste, ou au moins un droit de création
--                (personnage / clan / lieu) déjà accordé
--   journalist : aucun droit de création ci-dessus mais le droit d'écrire des
--                articles
--   guest      : tous les autres (Membre, Invité)
-- Les droits `user_permissions` restent, eux, exactement comme avant : un
-- compte ne perd aucun droit (ex. `create_timeline` reste « ajouté »).
UPDATE users SET role = CASE
  WHEN status = 'RPiste'
    OR EXISTS (
      SELECT 1 FROM user_permissions p
      WHERE p.user_id = users.id AND p.granted = 1
        AND p.permission IN ('create_character', 'create_clan', 'create_location')
    ) THEN 'creator'
  WHEN EXISTS (
      SELECT 1 FROM user_permissions p
      WHERE p.user_id = users.id AND p.granted = 1 AND p.permission = 'create_journal_article'
    ) THEN 'journalist'
  ELSE 'guest'
END
WHERE role = 'user';

-- 2. Droits retirés ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_revoked_rights (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  right_key TEXT NOT NULL,
  revoked_by TEXT,
  revoked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, right_key)
);
CREATE INDEX IF NOT EXISTS idx_user_revoked_rights_user ON user_revoked_rights(user_id);

-- 3. États de modération ---------------------------------------------------------
-- review_status : draft | pending | published | needs_changes | hidden
-- Défaut 'published' : un ancien Worker qui écrit encore ces tables reste
-- compatible, et rien de ce qui est déjà en ligne ne disparaît.
ALTER TABLE characters ADD COLUMN review_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE characters ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN submitted_at TEXT;
ALTER TABLE characters ADD COLUMN reviewed_at TEXT;
ALTER TABLE characters ADD COLUMN reviewed_by TEXT;

ALTER TABLE clans ADD COLUMN review_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE clans ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE clans ADD COLUMN submitted_at TEXT;
ALTER TABLE clans ADD COLUMN reviewed_at TEXT;
ALTER TABLE clans ADD COLUMN reviewed_by TEXT;

ALTER TABLE locations ADD COLUMN review_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE locations ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE locations ADD COLUMN submitted_at TEXT;
ALTER TABLE locations ADD COLUMN reviewed_at TEXT;
ALTER TABLE locations ADD COLUMN reviewed_by TEXT;

ALTER TABLE posts ADD COLUMN review_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE posts ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN submitted_at TEXT;
ALTER TABLE posts ADD COLUMN reviewed_at TEXT;
ALTER TABLE posts ADD COLUMN reviewed_by TEXT;

ALTER TABLE timelines ADD COLUMN review_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE timelines ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE timelines ADD COLUMN submitted_at TEXT;
ALTER TABLE timelines ADD COLUMN reviewed_at TEXT;
ALTER TABLE timelines ADD COLUMN reviewed_by TEXT;

-- Les brouillons existants (visibility = 'draft' dans le JSON) restent des
-- brouillons. Tout le reste est déjà en ligne : `published` (valeur par défaut).
-- Le contenu canon / géré par l'admin (owner 'system') et celui des comptes admin
-- (publication directe : c'est `visibility` qui gouverne) ne passe jamais par le
-- circuit : il reste `published`.
UPDATE characters SET review_status = 'draft'
  WHERE json_extract(data, '$.visibility') = 'draft' AND owner_user_id <> 'system' AND managed_by_admin = 0 AND owner_user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
UPDATE clans SET review_status = 'draft'
  WHERE json_extract(data, '$.visibility') = 'draft' AND owner_user_id <> 'system' AND owner_user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
UPDATE locations SET review_status = 'draft'
  WHERE json_extract(data, '$.visibility') = 'draft' AND owner_user_id <> 'system' AND owner_user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
UPDATE posts SET review_status = 'draft'
  WHERE json_extract(data, '$.visibility') = 'draft' AND owner_user_id <> 'system' AND owner_user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
UPDATE timelines SET review_status = 'draft'
  WHERE json_extract(data, '$.visibility') = 'draft' AND owner_user_id <> 'system' AND owner_user_id NOT IN (SELECT id FROM users WHERE role = 'admin');

CREATE INDEX IF NOT EXISTS idx_characters_review ON characters(review_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_clans_review ON clans(review_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_locations_review ON locations(review_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_posts_review ON posts(review_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_timelines_review ON timelines(review_status, submitted_at);

-- 4. Signalements ------------------------------------------------------------------
-- Aucune donnée sur la personne qui signale : ni compte, ni IP (la limitation
-- par IP passe par rate_limit_log, purgée à la volée).
CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  handled_at TEXT,
  handled_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);

PRAGMA optimize;
