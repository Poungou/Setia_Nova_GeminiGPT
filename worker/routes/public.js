// worker/routes/public.js
//
// API publique, sans authentification : ce que le site public consomme en
// direct pour /personnages et /personnages/:id, plutôt que de dépendre
// uniquement du JSON figé au build. Ne touche jamais aux champs privés
// d'une Persona (voir worker/lib/publicStore.js) — /__ai/api/chat reste le
// seul endroit qui lit la fiche Persona complète.

import { getPublicCharacter, getPublicPersonaForCharacter, listPublicCharacters } from '../lib/publicStore.js'

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

    if (parts[0] === 'characters' && parts[1]) {
      const character = await getPublicCharacter(env, decodeURIComponent(parts[1]))
      if (!character) return json({ error: 'Personnage introuvable.' }, { status: 404 })
      return json({ data: character })
    }

    if (parts[0] === 'personas' && parts[1]) {
      const persona = await getPublicPersonaForCharacter(env, decodeURIComponent(parts[1]))
      return json({ data: persona })
    }

    return json({ error: 'Route inconnue' }, { status: 404 })
  } catch (err) {
    console.error('[worker/public]', err)
    return json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
