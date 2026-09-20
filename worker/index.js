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
import { handleCulture } from './routes/culture.js'

const API_HANDLERS = {
  __culture: handleCulture,
  __auth: handleAuth,
  __account: handleAccount,
  __admin: handleAdmin,
  __aether: handleAether,
  __public: handlePublic,
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' https://challenges.cloudflare.com 'sha256-kMXki7b/R1Zkcao1yRUNbViBAOoZFlmVxr76sad751Q='",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "form-action 'self'",
].join('; ')

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (!headers.has('Content-Security-Policy')) headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    // /__auth/api/..., /__account/api/..., /__admin/api/..., /__aether/api/..., /__public/api/...
    const handler = segments.length >= 2 && segments[1] === 'api' ? API_HANDLERS[segments[0]] : null
    if (handler) {
      return withSecurityHeaders(await handler(request, env, segments.slice(2)))
    }

    // /uploads/<clé> — fichiers médias uploadés à l'exécution, servis depuis
    // R2 (voir worker/lib/mediaStore.js). Distinct de /media/... (statique,
    // empaqueté au build) : ne passe donc jamais par env.ASSETS.
    if (segments[0] === 'uploads' && segments.length >= 2) {
      return withSecurityHeaders(await handleMediaGet(request, env, segments.slice(1).join('/')))
    }

    const response = await env.ASSETS.fetch(request)
    const contentType = response.headers.get('content-type') || ''
    if (request.method === 'GET' && contentType.includes('text/html')) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      headers.set('CDN-Cache-Control', 'no-store')
      return withSecurityHeaders(new Response(response.body, { status: response.status, statusText: response.statusText, headers }))
    }
    return withSecurityHeaders(response)
  },
}
