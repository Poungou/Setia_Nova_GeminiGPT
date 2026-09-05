-- Chronologies (timelines) créées par un compte joueur, en plus de la
-- chronologie canon (clan Nakamura). Même principe que `locations`/`posts`
-- (voir 0006/0010) : owner_user_id + data JSON. La chronologie canon
-- Nakamura n'a PAS de ligne ici tant qu'aucun compte ne la revendique — ses
-- métadonnées vivent dans src/data/timelines.json et ses événements dans
-- src/data/events.json (édités via l'admin local existant), voir
-- worker/lib/contentStore.js#getTimelineWithFallback et
-- src/lib/timelineEvents.js.
--
-- Volontairement PAS de table séparée pour les événements (contrairement à
-- clan_members, voir 0004) : un événement de chronologie n'est jamais
-- partagé entre plusieurs chronologies ni entre plusieurs comptes, alors
-- qu'un même personnage peut apparaître dans plusieurs clans. L'embarquer
-- dans `data` (tableau `events`, réordonnable) évite une table et une API
-- supplémentaires pour un gain de simplicité — voir la doc de session.
CREATE TABLE IF NOT EXISTS timelines (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL DEFAULT 'system',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_timelines_owner ON timelines(owner_user_id);

PRAGMA optimize;
