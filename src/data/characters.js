// src/data/characters.js
//
// Source de vérité : src/data/characters.json (édité via /admin en mode dev,
// ou à la main). Ce fichier ne contient QUE la logique de lecture.
//
// Champs d'un personnage :
//   canon        "confirmed" (vérifié par la propriétaire) | "draft" (à développer)
//   status       "active" | "to-develop" | "deceased" | "archived"
//   traits[]     caractéristiques visuelles/physiques connues
//   relations[]  { characterId, type, description } — uniquement des liens confirmés
//   locations[]  ids de lieux (voir data/locations.json)
//   tags[]       recherche et filtres
//
// Une valeur inconnue reste vide ("") plutôt qu'inventée : l'UI affiche alors "—".

import charactersData from './characters.json'

// Toutes les fiches (utile à l'admin / aux résolutions de liens internes).
export const allCharacters = charactersData

// Ce que le site public montre : les brouillons restent cachés.
export const characters = charactersData.filter((c) => c.visibility !== 'draft')

export function getCharacterById(id) {
  return allCharacters.find((c) => c.id === id)
}

export function getCharactersByStatus(status) {
  if (!status || status === 'all') return characters
  return characters.filter((c) => c.status === status)
}

// Résout les liens sortants d'un personnage vers les fiches cibles.
export function getRelationTargets(character) {
  return (character.relations || [])
    .map((rel) => ({ ...rel, character: getCharacterById(rel.characterId) }))
    .filter((rel) => Boolean(rel.character))
}
