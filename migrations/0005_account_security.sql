-- Sécurisation du compte utilisateur : mot de passe oublié, changement de
-- mot de passe, changement d'adresse email, invalidation de sessions.
--
-- session_version : incrémenté à chaque changement de mot de passe ou
-- d'email confirmé (self-service ou via /admin). Le cookie de session porte
-- la valeur en vigueur au moment de la connexion (`ver` dans le payload
-- signé) — un jeton dont la valeur ne correspond plus à cette colonne est
-- traité comme invalide par getRequestUser (voir worker/lib/authStore.js).
-- Ça invalide toutes les AUTRES sessions actives sans avoir besoin d'une
-- table de sessions serveur à part. Les jetons émis avant cette migration
-- n'ont pas de `ver` : traité comme 0, comme la valeur par défaut de la
-- colonne — aucun compte existant n'est déconnecté par cette migration.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

-- Adresse en attente de confirmation (changement d'email demandé mais pas
-- encore validé par le lien envoyé à la nouvelle adresse). NULL si aucun
-- changement en cours. Affichée dans l'espace compte pour indiquer qu'une
-- confirmation est en attente.
ALTER TABLE users ADD COLUMN pending_email TEXT;

-- Jetons à usage unique pour "mot de passe oublié" et "confirmation de
-- nouvelle adresse email". Le jeton brut n'est JAMAIS stocké : seul son
-- hash SHA-256 (token_hash) l'est, comparé au hash du jeton reçu par lien.
-- `purpose` distingue les deux usages pour ne pas dupliquer le schéma ;
-- `payload` porte un JSON optionnel (ex. { "newEmail": "..." } pour
-- email_change). `used_at` marque l'usage unique — un jeton consommé ou
-- expiré (expires_at dépassé) n'est plus jamais accepté.
CREATE TABLE IF NOT EXISTS account_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  payload TEXT,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_tokens_hash ON account_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_account_tokens_user ON account_tokens(user_id);

-- Rate limiting / temporisation (connexion, mot de passe oublié, reset,
-- confirmation email) — compteur glissant par "bucket" (ex.
-- "login:email:x@y.tld", "reset:ip:1.2.3.4"). Les lignes hors fenêtre sont
-- supprimées à la volée par worker/lib/rateLimit.js à chaque vérification,
-- pas besoin de job de nettoyage séparé.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket ON rate_limit_log(bucket, created_at);
