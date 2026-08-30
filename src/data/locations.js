// src/data/locations.js
//
// Source de vérité : src/data/locations.json (édité via /admin en mode dev).
// canon: "confirmed" | "draft" — un lieu "draft" est prévu mais pas encore décrit.

import locationsData from './locations.json'

export const locations = locationsData

export function getLocationById(id) {
  return locations.find((l) => l.id === id)
}
