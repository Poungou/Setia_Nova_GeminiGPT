-- Multi-utilisateur : clans crees par un compte joueur, et membres de clan.
--
-- Meme principe que la table `characters` (voir 0001_init.sql) : chaque
-- clan a un owner_user_id ('system' pour un clan canon comme Nakamura, sinon
-- l'id du compte createur) et ses champs metier vivent dans `data` (JSON),
-- lu/ecrit par worker/lib/contentStore.js. Un clan canon (defini dans
-- src/data/clans.json, ex. Nakamura) n'a PAS de ligne ici tant qu'aucun
-- compte ne le revendique : la lecture publique fusionne canon + D1, voir
-- getClanWithFallback/listClansWithFallback dans contentStore.js.
--
-- clan_members : appartenance d'un personnage a un clan de compte. Un clan
-- canon garde ses membres embarques dans clans.json (`members: [...]`,
-- edite depuis /admin) plutot que d'utiliser cette table -- voir
-- resolveClanMembers() dans contentStore.js.

CREATE TABLE IF NOT EXISTS clans (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL DEFAULT 'system',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clans_owner ON clans(owner_user_id);

CREATE TABLE IF NOT EXISTS clan_members (
  clan_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL,
  PRIMARY KEY (clan_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_character ON clan_members(character_id);

PRAGMA optimize;
