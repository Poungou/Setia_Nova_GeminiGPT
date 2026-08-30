// src/data/events.js
// Chronologie RP. Source de vérité : src/data/events.json (édité via /admin).
//
// Schéma d'un événement :
//   { id, title, dateRP, order, description, characters: [], locations: [], image, importance, tags: [] }

import eventsData from './events.json'

export const events = [...eventsData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

export function getEventById(id) {
  return events.find((e) => e.id === id)
}
