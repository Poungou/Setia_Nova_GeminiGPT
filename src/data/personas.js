// src/data/personas.js
//
// Source de vérité : src/data/personas.json (édité via /admin → « Compagnons
// IA », en mode dev, ou à la main). Ce fichier ne contient QUE la logique de
// lecture — même principe que characters.js.
//
// Une Persona IA est TOUJOURS liée à une fiche personnage existante via
// `characterId`. Elle ne duplique jamais les informations canoniques (nom,
// âge, historique…) : ces champs restent dans data/characters.json, la
// Persona ne porte que l'interprétation comportementale (personnalité,
// manière de parler, secrets, limites RP…) utilisée pour construire le
// prompt envoyé à l'IA côté serveur (voir plugins/woltar-ai.js).
//
// `id` d'une Persona == `characterId` : un seul « Woltarien IA » par fiche
// personnage pour l'instant (contrainte imposée par /admin, pas par ce
// fichier — voir src/admin/schema.js).
//
// `ownerUserId` vaut "system" pour les Personas historiques/admin, ou l'id du
// compte createur pour les Personas utilisateur.

import personasData from './personas.json'

export const personas = personasData

export function getPersonaById(id) {
  return personas.find((p) => p.id === id)
}

export function getPersonaByCharacterId(characterId) {
  return personas.find((p) => p.characterId === characterId)
}

export function isPersonaEnabled(persona) {
  return persona?.enabled === 'true'
}
