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

import {
  getCharacterWithFallback,
  getClanWithFallback,
  getLocationWithFallback,
  getPostWithFallback,
  getTimelineWithFallback,
  listCharactersWithFallback,
  listClansWithFallback,
  listLocationsWithFallback,
  listPostsWithFallback,
  listTimelinesWithFallback,
} from './contentStore.js'

// Un contenu est public s'il n'est pas en brouillon (règle historique
// `visibility`) ET si sa relecture est terminée : seul `published` est
// exposé (draft, pending, needs_changes et hidden ne le sont jamais). Un
// contenu canon n'a pas de `reviewStatus` : il reste public.
export function isLive(record) {
  if (!record || record.visibility === 'draft') return false
  return record.reviewStatus === undefined || record.reviewStatus === 'published'
}

// Le message de l'équipe et l'identité du relecteur ne sortent jamais côté public.
function withoutReview(record) {
  if (!record) return null
  const clean = { ...record }
  delete clean.reviewNote
  delete clean.reviewedBy
  delete clean.submittedAt
  delete clean.reviewedAt
  delete clean.reviewStatus
  return clean
}

function isPublished(character) {
  return isLive(character)
}

function publicCharacter(character) {
  if (!character) return null
  const clean = withoutReview(character)
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

// Pseudo des joueuses/joueurs propriétaires de personnages publiés — pour
// afficher un hashtag `#Pseudo` (voir carrousel d'accueil) SANS dépendre du
// profil RP public (listPublicPlayerProfiles), qui n'existe que pour les
// comptes ayant explicitement publié un profil. Un pseudo n'est pas une
// donnée sensible (déjà visible ailleurs : identifiant de connexion, filtre
// "Joueur"...) : un compte qui possède au moins un personnage publié voit
// son pseudo exposé ici, qu'il ait ou non rempli un profil RP.
export async function listPublicCharacterOwners(env) {
  const all = await listCharactersWithFallback(env)
  const ownerIds = [...new Set(all.filter(isPublished).map((c) => c.ownerUserId).filter((id) => id && id !== 'system'))]
  if (!ownerIds.length) return []
  const placeholders = ownerIds.map(() => '?').join(',')
  const { results } = await env.WOLTAR_DB
    .prepare(`SELECT id, name FROM users WHERE disabled = 0 AND id IN (${placeholders})`)
    .bind(...ownerIds)
    .all()
  return (results || []).map((row) => ({ userId: row.id, name: row.name }))
}

// Un clan de compte peut rester "draft" (visibility) tant que sa proprietaire
// ne l'a pas publie -- meme logique que les personnages. Un clan canon
// (Nakamura) n'a pas ce champ dans clans.json : il reste donc public par
// defaut (visibility !== 'draft' est vrai pour undefined).
function isPublishedClan(clan) {
  return isLive(clan)
}

export async function listPublicClans(env) {
  const all = await listClansWithFallback(env)
  return all.filter(isPublishedClan).map(withoutReview)
}

export async function getPublicClan(env, id) {
  const clan = await getClanWithFallback(env, id)
  return isPublishedClan(clan) ? withoutReview(clan) : null
}

function isPublishedLocation(location) {
  return isLive(location)
}

export async function listPublicLocations(env) {
  return (await listLocationsWithFallback(env)).filter(isPublishedLocation).map(withoutReview)
}

export async function getPublicLocation(env, id) {
  const location = await getLocationWithFallback(env, id)
  return isPublishedLocation(location) ? withoutReview(location) : null
}

function isPublishedPost(post) {
  return isLive(post)
}

export async function listPublicPosts(env) {
  return (await listPostsWithFallback(env)).filter(isPublishedPost).map(withoutReview)
}

export async function getPublicPost(env, id) {
  const post = await getPostWithFallback(env, id)
  return isPublishedPost(post) ? withoutReview(post) : null
}

// Une chronologie de compte peut rester "draft" tant que sa proprietaire ne
// l'a pas publiee — meme logique que les personnages/clans/lieux/articles.
// La chronologie canon (Nakamura) n'a pas ce champ : elle reste donc
// publique par defaut (visibility !== 'draft' est vrai pour undefined).
function isPublishedTimeline(timeline) {
  return isLive(timeline)
}

export async function listPublicTimelines(env) {
  return (await listTimelinesWithFallback(env)).filter(isPublishedTimeline).map(withoutReview)
}

export async function getPublicTimeline(env, id) {
  const timeline = await getTimelineWithFallback(env, id)
  return isPublishedTimeline(timeline) ? withoutReview(timeline) : null
}
