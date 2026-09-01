// worker/index.js
//
// Point d'entrée du Worker Cloudflare. Sert le build statique (dist/, via le
// binding ASSETS défini dans wrangler.jsonc) et route les quatre API sous
// /__auth, /__account, /__aether, /__public vers leurs handlers — équivalent
// production des plugins Vite plugins/woltar-{auth,account,aether,public}.js
// (qui restent la version utilisée par `npm run dev` en local, inchangés).
//
// Pas de route /__admin ici, volontairement (Phase 18 — « Séparer canon
// local et personnages utilisateurs D1 ») : l'admin (personnages canon
// inclus) reste un outil localhost uniquement, jamais un CMS de production.
// Les personnages créés en production passent par /__account (/compte),
// pas par /admin — voir worker/routes/account.js et
// worker/lib/contentStore.js pour la séparation canon (JSON) / utilisateur
// (D1). `worker/routes/admin.js` existe encore sur le disque mais n'est
// branché nulle part : voir le commentaire en tête de ce fichier pour le
// contexte, il peut être supprimé sans risque.
//
// /__ai n'existe plus (tâche « Aether » : le système de Personas RP liées à
// un personnage est supprimé) : l'ancien worker/routes/ai.js est remplacé par
// /__aether -> worker/routes/aether.js, l'assistant IA central unique du site.
// Voir ARCHITECTURE.md.
//
// Rappel : ne PAS lancer `wrangler deploy` sans avoir relu
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md et sans validation explicite de la
// propriétaire du site — voir ce document pour l'état d'avancement exact.

import { handleAccount } from './routes/account.js'
import { handleAether } from './routes/aether.js'
import { handleAuth } from './routes/auth.js'
import { handlePublic } from './routes/public.js'

const API_HANDLERS = {
  __auth: handleAuth,
  __account: handleAccount,
  __aether: handleAether,
  __public: handlePublic,
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    // /__auth/api/..., /__account/api/..., /__aether/api/..., /__public/api/...
    const handler = segments.length >= 2 && segments[1] === 'api' ? API_HANDLERS[segments[0]] : null
    if (handler) {
      return handler(request, env, segments.slice(2))
    }

    return env.ASSETS.fetch(request)
  },
}
