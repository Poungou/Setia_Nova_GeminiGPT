// worker/routes/public.js
//
// API publique, sans authentification : ce que le site public consomme en
// direct pour /personnages et /personnages/:id, plutôt que de dépendre
// uniquement du JSON figé au build.
//
// Historique — tâche « Aether » : la route /personas/:characterId (Persona
// RP publique d'un personnage) a été retirée — le système de Personas est
// supprimé au profit d'AETHER, l'assistant IA central unique du site (voir
// worker/routes/aether.js, branché sur /__aether, pas /__public).

import {
  getPublicCharacter,
  getPublicClan,
  getPublicLocation,
  getPublicPost,
  getPublicTimeline,
  listPublicCharacterOwners,
  listPublicCharacters,
  listPublicClans,
  listPublicLocations,
  listPublicPosts,
  listPublicTimelines,
} from '../lib/publicStore.js'
import { listPublicPlayerProfiles } from '../lib/playerProfiles.js'

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

// `parts` = segments du chemin après /__public/api/ (ex: ['characters', 'fudo-nakamura']).
export async function handlePublic(request, env, parts) {
  try {
    if (request.method !== 'GET') return json({ error: 'Méthode non autorisée' }, { status: 405 })

    if (parts[0] === 'characters' && parts.length === 1) {
      return json({ data: await listPublicCharacters(env) })
    }

    if (parts[0] === 'character-owners' && parts.length === 1) {
      return json({ data: await listPublicCharacterOwners(env) })
    }

    if (parts[0] === 'players' && parts.length === 1) {
      return json({ data: await listPublicPlayerProfiles(env) })
    }

    if (parts[0] === 'clans' && parts.length === 1) {
      return json({ data: await listPublicClans(env) })
    }

    if (parts[0] === 'locations' && parts.length === 1) {
      return json({ data: await listPublicLocations(env) })
    }

    if (parts[0] === 'posts' && parts.length === 1) {
      return json({ data: await listPublicPosts(env) })
    }

    if (parts[0] === 'timelines' && parts.length === 1) {
      return json({ data: await listPublicTimelines(env) })
    }

    if (parts[0] === 'clans' && parts[1]) {
      const clan = await getPublicClan(env, decodeURIComponent(parts[1]))
      if (!clan) return json({ error: 'Clan introuvable.' }, { status: 404 })
      return json({ data: clan })
    }

    if (parts[0] === 'characters' && parts[1]) {
      const character = await getPublicCharacter(env, decodeURIComponent(parts[1]))
      if (!character) return json({ error: 'Personnage introuvable.' }, { status: 404 })
      return json({ data: character })
    }

    if (parts[0] === 'locations' && parts[1]) {
      const location = await getPublicLocation(env, decodeURIComponent(parts[1]))
      if (!location) return json({ error: 'Lieu introuvable.' }, { status: 404 })
      return json({ data: location })
    }

    if (parts[0] === 'posts' && parts[1]) {
      const post = await getPublicPost(env, decodeURIComponent(parts[1]))
      if (!post) return json({ error: 'Article introuvable.' }, { status: 404 })
      return json({ data: post })
    }

    if (parts[0] === 'timelines' && parts[1]) {
      const timeline = await getPublicTimeline(env, decodeURIComponent(parts[1]))
      if (!timeline) return json({ error: 'Chronologie introuvable.' }, { status: 404 })
      return json({ data: timeline })
    }

    return json({ error: 'Route inconnue' }, { status: 404 })
  } catch (err) {
    console.error('[worker/public]', err)
    return json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
