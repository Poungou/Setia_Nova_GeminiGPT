// src/data/archives.js
// Archives RP. Source de vérité : src/data/archives.json (édité via /admin).
//
// Schéma d'une archive :
//   { id, arc, title, dateRP, characters: [], locations: [], text }
//
// IMPORTANT : le texte RP fourni par la propriétaire ne doit jamais être réécrit
// sans demande explicite. Seules des corrections orthographiques légères sont tolérées.

import archivesData from './archives.json'

export const archives = archivesData

export function getArchiveById(id) {
  return archives.find((a) => a.id === id)
}
