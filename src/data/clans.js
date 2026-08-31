// src/data/clans.js
// Source de vérité : src/data/clans.json (édité via /admin en mode dev).

import clansData from './clans.json'

export const clans = clansData

export function getClanById(id) {
  return clans.find((c) => c.id === id)
}

// Slug minimal, local à ce fichier (évite de faire dépendre data/ de admin/
// pour une simple comparaison de texte — voir src/admin/slug.js pour
// l'équivalent utilisé par les formulaires).
function slugify(input) {
  return (input || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Résout le clan (fiche complète) associé à un personnage, pour construire
// un lien correct vers /clans/:id.
//   1. `character.clanId` si renseigné (cas normalisé, préférable).
//   2. sinon, tentative de correspondance entre le texte libre
//      `character.clan` et le nom d'un clan existant (rétrocompatibilité
//      avec les fiches qui n'ont que ce champ texte).
// Retourne `null` si aucun clan correspondant n'existe encore — dans ce cas
// l'UI doit afficher le nom du clan en texte simple plutôt que de créer un
// lien vers une page inexistante.
export function getClanByCharacter(character) {
  if (!character) return null
  if (character.clanId) {
    const byId = getClanById(character.clanId)
    if (byId) return byId
  }
  if (character.clan) {
    const target = slugify(character.clan)
    return clans.find((c) => slugify(c.name).includes(target) || target.includes(slugify(c.name))) || null
  }
  return null
}
