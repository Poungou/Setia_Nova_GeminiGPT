// worker/index.js
//
// Point d'entree du Worker Cloudflare. Sert le build statique (dist/, via le
// binding ASSETS defini dans wrangler.jsonc) et route les API sous /__auth,
// /__account, /__admin, /__aether, /__public vers leurs handlers.
//
// /__admin est protege par session + role admin. Il sert les nouvelles
// donnees persistantes D1 du profil createur et des metadonnees publiques
// de personnages ; les collections non migrees restent statiques.
//
// Rappel : ne PAS lancer `wrangler deploy` sans validation explicite de la
// proprietaire du site.

import { handleAccount } from './routes/account.js'
import { handleAdmin } from './routes/admin.js'
import { handleAether } from './routes/aether.js'
import { handleAuth } from './routes/auth.js'
import { handleMediaGet } from './routes/media.js'
import { handlePublic } from './routes/public.js'

const API_HANDLERS = {
  __auth: handleAuth,
  __account: handleAccount,
  __admin: handleAdmin,
  __aether: handleAether,
  __public: handlePublic,
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    // /__auth/api/..., /__account/api/..., /__admin/api/..., /__aether/api/..., /__public/api/...
    const handler = segments.length >= 2 && segments[1] === 'api' ? API_HANDLERS[segments[0]] : null
    if (handler) {
      return handler(request, env, segments.slice(2))
    }

    // /uploads/<clé> — fichiers médias uploadés à l'exécution, servis depuis
    // R2 (voir worker/lib/mediaStore.js). Distinct de /media/... (statique,
    // empaqueté au build) : ne passe donc jamais par env.ASSETS.
    if (segments[0] === 'uploads' && segments.length >= 2) {
      return handleMediaGet(request, env, segments.slice(1).join('/'))
    }

    return env.ASSETS.fetch(request)
  },
}
