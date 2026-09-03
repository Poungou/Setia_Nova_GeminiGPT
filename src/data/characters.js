// src/data/characters.js
//
// Source de vérité : src/data/characters.json (édité via /admin en mode dev,
// ou à la main). Ce fichier ne contient QUE la logique de lecture.
//
// Champs d'un personnage :
//   canon        "confirmed" (vérifié par la propriétaire) | "draft" (à développer)
//   status       "active" | "to-develop" | "deceased" | "archived"
//   traits[]     caractéristiques visuelles/physiques connues
//   quote        petite citation affichée dans le hero de la fiche (optionnel,
//                jamais inventée — masquée tant qu'elle n'est pas renseignée)
//   clan         nom de clan en texte libre, affiché tel quel
//   clanId       id d'une fiche de data/clans.json (optionnel). Sert à
//                construire un lien correct vers /clans/:id — voir
//                getClanByCharacter() dans data/clans.js. Rétrocompatible :
//                si absent, on retombe sur une correspondance texte entre
//                `clan` et le nom des clans existants ; si rien ne
//                correspond, le nom du clan reste affiché sans lien.
//   relations[]  { characterId, type, description } — uniquement des liens confirmés
//   locations[]  ids de lieux (voir data/locations.json)
//   tags[]       recherche et filtres
//   is_featured  true si le personnage apparait dans "Personnages en avant"
//   image_source credit facultatif affiche sous le portrait
//   ownerUserId  "system" pour les fiches historiques, ou id du compte createur
//
// Une valeur inconnue reste vide ("") plutôt qu'inventée : l'UI affiche alors "—".
//
// --- `visibility` : comportement ACTUEL (documenté, non modifié) ----------
// Seule la valeur littérale "draft" masque une fiche du site public
// (CharacterDetail redirige vers /personnages, `characters` ci-dessous
// l'exclut de la liste). Toute autre valeur — y compris l'ABSENCE du champ
// — est traitée comme publiée. Au 31/08/2026, Shizuka Nakamura, Isil et Myo
// Nakamura n'ont aucun champ `visibility` dans characters.json : ils sont
// donc publics par défaut, sans que ça ait été explicitement choisi. Ce
// n'est pas un bug corrigé ici — juste documenté, à valider par
// l'utilisatrice avant toute modification des données ou de la règle.
//
// --- Piste future (NON implémentée) : canon / draft / archived / deceased -
// Trois champs indépendants existent déjà et se chevauchent partiellement :
//   - `visibility` (published/draft)  -> affichée ou non sur le site public
//   - `canon` (confirmed/draft)       -> fiabilité narrative de l'info
//   - `status` (active/to-develop/deceased/archived) -> utilisé aujourd'hui
//     uniquement par le filtre de /personnages, jamais pour masquer une
//     fiche individuelle
// Piste à valider avec l'utilisatrice avant tout changement : garder
// `visibility` comme seul interrupteur "affiché / pas affiché", et laisser
// `status` piloter uniquement un badge visuel (ex. "Décédé", "Archivé") sur
// la fiche déjà visible, plutôt que de la masquer automatiquement — pour ne
// jamais faire disparaître une fiche existante sans décision explicite.

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
