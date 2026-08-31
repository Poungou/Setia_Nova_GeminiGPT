// worker/index.js
//
// Point d'entrée du Worker Cloudflare. Sert le build statique (dist/, via le
// binding ASSETS défini dans wrangler.jsonc) et route les quatre API sous
// /__auth, /__account, /__ai, /__public vers leurs handlers — équivalent
// production des plugins Vite plugins/woltar-{auth,account,ai,public}.js
// (qui restent la version utilisée par `npm run dev` en local, inchangés).
//
// Rappel : ne PAS lancer `wrangler deploy` sans avoir relu
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md et sans validation explicite de la
// propriétaire du site — voir ce document pour l'état d'avancement exact.

import { handleAccount } from './routes/account.js'
import { handleAi } from './routes/ai.js'
import { handleAuth } from './routes/auth.js'
import { handlePublic } from './routes/public.js'

const API_HANDLERS = {
  __auth: handleAuth,
  __account: handleAccount,
  __ai: handleAi,
  __public: handlePublic,
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    // /__auth/api/..., /__account/api/..., /__ai/api/..., /__public/api/...
    const handler = segments.length >= 2 && segments[1] === 'api' ? API_HANDLERS[segments[0]] : null
    if (handler) {
      return handler(request, env, segments.slice(2))
    }

    return env.ASSETS.fetch(request)
  },
}
