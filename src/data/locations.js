// src/data/locations.js
//
// Source de vérité : src/data/locations.json (édité via /admin en mode dev).
// canon: "confirmed" | "draft" — un lieu "draft" est prévu mais pas encore décrit.

import locationsData from './locations.json'

export const locations = locationsData

export function getLocationById(id) {
  return locations.find((l) => l.id === id)
}

export function getLocationParent(location) {
  return location?.parentId ? getLocationById(location.parentId) : null
}

export function getLocationChildren(parentId) {
  return locations.filter((l) => l.parentId === parentId)
}

export function isTopLevelLocation(location) {
  return !location.parentId
}
