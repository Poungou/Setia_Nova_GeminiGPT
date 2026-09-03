-- Profil createur + metadonnees publiques des images/personnages.
-- A appliquer apres 0001_init.sql. Ne contient aucune donnee distante.

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE characters ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN image_source TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN gallery_sources TEXT NOT NULL DEFAULT '{}';
ALTER TABLE characters ADD COLUMN managed_by_admin INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_characters_featured
ON characters(is_featured);

PRAGMA optimize;
