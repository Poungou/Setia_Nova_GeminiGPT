// worker/lib/publicStore.js
//
// Lecture PUBLIQUE (sans authentification) des personnages publiés, pour le
// site public (/personnages, /personnages/:id). S'appuie sur les lecteurs
// D1 + repli statique de contentStore.js — ce qui garantit que les
// personnages historiques (Fudo, Kazuko...) restent visibles même si D1
// n'est pas encore peuplé, tout en donnant la priorité aux fiches
// créées/modifiées depuis /compte dès qu'elles existent en D1.
//
// Historique — tâche « Aether » : la projection publique d'une Persona RP
// (PUBLIC_PERSONA_FIELDS, getPublicPersonaForCharacter) a été retirée — le
// système de Personas est supprimé. Voir worker/routes/aether.js pour
// l'assistant IA central unique du site, qui n'est pas exposé via cette API
// publique (il a sa propre route, /__aether).

import { getCharacterWithFallback, getCreatorProfile, listCharactersWithFallback } from './contentStore.js'

function isPublished(character) {
  return Boolean(character) && character.visibility !== 'draft'
}

function publicCharacter(character) {
  if (!character) return null
  const clean = { ...character }
  delete clean.__managedByAdmin
  return clean
}

export async function listPublicCharacters(env) {
  const all = await listCharactersWithFallback(env)
  return all.filter(isPublished).map(publicCharacter)
}

export async function getPublicCharacter(env, id) {
  const character = await getCharacterWithFallback(env, id)
  return isPublished(character) ? publicCharacter(character) : null
}

export async function getPublicCreatorProfile(env) {
  return getCreatorProfile(env)
}
