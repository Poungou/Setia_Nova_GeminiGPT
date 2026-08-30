// src/data/clans.js
// Source de vérité : src/data/clans.json (édité via /admin en mode dev).

import clansData from './clans.json'

export const clans = clansData

export function getClanById(id) {
  return clans.find((c) => c.id === id)
}
