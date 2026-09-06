// worker/routes/media.js
//
// Sert en lecture publique les fichiers uploadés à l'exécution (musique,
// avatars...) et stockés dans R2 par worker/lib/mediaStore.js — chemin
// `/uploads/<clé>`, distinct de `/media/...` qui reste servi statiquement
// depuis `dist/` (fichiers empaquetés au build, voir public/media/). Monté
// directement dans worker/index.js (pas de préfixe /__xxx/api : c'est un
// simple GET de fichier, pas une API JSON).

import { readMedia } from '../lib/mediaStore.js'

export async function handleMediaGet(request, env, key) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Méthode non autorisée', { status: 405 })
  }
  if (!key) return new Response('Introuvable', { status: 404 })

  const object = await readMedia(env, key)
  if (!object) return new Response('Introuvable', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  if (request.method === 'HEAD') return new Response(null, { headers })
  return new Response(object.body, { headers })
}
