-- Personnages choisis pour la fiche publique d'un joueur.
ALTER TABLE user_profiles ADD COLUMN linked_character_ids TEXT NOT NULL DEFAULT '[]';
PRAGMA optimize;