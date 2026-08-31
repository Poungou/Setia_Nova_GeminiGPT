-- Schéma D1 initial : comptes, personnages et Personas IA.
-- Lieux / clans / chronologie / archives / journal restent en JSON statique
-- pour l'instant (voir docs/CLOUDFLARE_DEPLOYMENT_PLAN.md, section "Portée
-- retenue") — pas de table ici, ils sont lus depuis src/data/*.json au build.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  disabled INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Fiches personnages. `data` porte le JSON complet de la fiche (mêmes
-- champs que src/data/characters.json aujourd'hui : firstName, lastName,
-- traits[], relations[], gallery[], tags[]... — trop de champs variables
-- pour une colonne par champ, donc un blob JSON + colonnes indexées pour
-- filtrer). owner_user_id = 'system' pour les personnages canoniques créés
-- par l'administratrice, sinon l'id du compte propriétaire.
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL DEFAULT 'system',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_owner ON characters(owner_user_id);

-- Personas IA. Une seule par personnage pour l'instant (id == character_id,
-- imposé côté application — voir src/admin/schema.js `makeId`).
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL DEFAULT 'system',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_personas_owner ON personas(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_personas_character ON personas(character_id);
