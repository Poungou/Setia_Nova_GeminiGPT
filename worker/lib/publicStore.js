// worker/lib/publicStore.js
//
// Lecture PUBLIQUE (sans authentification) des personnages publiés et de
// leur Persona IA active, pour le site public (/personnages, /personnages/:id).
// S'appuie sur les lecteurs D1 + repli statique de contentStore.js — ce qui
// garantit que les personnages historiques (Fudo, Kazuko...) restent
// visibles même si D1 n'est pas encore peuplé, tout en donnant la priorité
// aux fiches créées/modifiées depuis /compte dès qu'elles existent en D1.
//
// Règle de sécurité : ne renvoie JAMAIS les champs privés d'une Persona
// (personnalité, secrets, limites RP, instructions personnalisées...) —
// seul /__ai/api/chat lit la fiche complète, côté serveur, pour construire
// le prompt système. Voir PUBLIC_PERSONA_FIELDS ci-dessous.

import {
  getCharacterWithFallback,
  getPersonaWithFallback,
  listCharactersWithFallback,
} from './contentStore.js'

const PUBLIC_PERSONA_FIELDS = ['id', 'characterId', 'name', 'avatar', 'enabled', 'greeting']

function isPublished(character) {
  return Boolean(character) && character.visibility !== 'draft'
}

function publicPersona(persona) {
  if (!persona) return null
  const safe = {}
  for (const key of PUBLIC_PERSONA_FIELDS) safe[key] = persona[key]
  return safe
}

export async function listPublicCharacters(env) {
  const all = await listCharactersWithFallback(env)
  return all.filter(isPublished)
}

export async function getPublicCharacter(env, id) {
  const character = await getCharacterWithFallback(env, id)
  return isPublished(character) ? character : null
}

// `id` d'une Persona == `characterId` (une seule Persona par personnage,
// voir src/data/personas.js) — donc getPersonaWithFallback(env, characterId)
// résout directement la bonne fiche.
export async function getPublicPersonaForCharacter(env, characterId) {
  const persona = await getPersonaWithFallback(env, characterId)
  if (!persona || persona.enabled !== 'true') return null
  return publicPersona(persona)
}
