// src/data/events.js
// Chronologie RP. Volontairement vide pour l'instant (Phase 7) — la page Chronologie
// affiche un état vide plutôt que d'inventer des événements.
//
// Schéma attendu par event :
//   { id, title, dateRP, order, description, characters: [], locations: [], image, importance, tags: [] }

export const events = []

export function getEventById(id) {
  return events.find((e) => e.id === id)
}
