// worker/routes/auth.js
//
// Port Cloudflare Worker de plugins/woltar-auth.js. Même contrat pour le
// front (routes et réponses JSON identiques), deux différences volontaires :
//   - PAS de route « admin local » (mot de passe en clair `woltar`) : ça n'a
//     de sens que sur le serveur de dev local, jamais sur un Worker exposé
//     publiquement ;
//   - le cookie de session est signé/lu via worker/lib/authStore.js, qui
//     s'appuie sur D1 (`env.WOLTAR_DB`) au lieu de plugins/data/users.json.

import {
  createSessionToken,
  getRequestUser,
  httpError,
  isAdmin,
  listPublicUsers,
  loginUser,
  publicUser,
  registerUser,
  sessionCookieHeader,
  clearSessionCookieHeader,
  updateUser,
} from '../lib/authStore.js'

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  })
}

async function readJson(request) {
  const raw = await request.text()
  return raw ? JSON.parse(raw) : {}
}

// `parts` = segments du chemin après /__auth/api/ (ex: ['login']).
export async function handleAuth(request, env, parts) {
  try {
    const method = request.method

    if (parts[0] === 'session' && method === 'GET') {
      const user = await getRequestUser(env, request)
      return json({ user: publicUser(user) })
    }

    if (parts[0] === 'register' && method === 'POST') {
      const user = await registerUser(env, await readJson(request))
      const token = createSessionToken(env, user)
      return json({ user }, { headers: { 'Set-Cookie': sessionCookieHeader(token) } })
    }

    if (parts[0] === 'login' && method === 'POST') {
      const user = await loginUser(env, await readJson(request))
      const token = createSessionToken(env, user)
      return json({ user }, { headers: { 'Set-Cookie': sessionCookieHeader(token) } })
    }

    if (parts[0] === 'logout' && method === 'POST') {
      return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookieHeader() } })
    }

    if (parts[0] === 'users') {
      const actor = await getRequestUser(env, request)
      if (!actor) throw httpError(401, 'Connexion requise.')
      if (!isAdmin(actor)) throw httpError(403, 'Réservé admin.')

      if (method === 'GET' && parts.length === 1) {
        return json({ users: await listPublicUsers(env) })
      }

      if (method === 'PATCH' && parts[1]) {
        const user = await updateUser(env, parts[1], await readJson(request), actor)
        return json({ user })
      }
    }

    return json({ error: 'Route inconnue' }, { status: 404 })
  } catch (err) {
    const status = err?.status || 500
    if (status >= 500) console.error('[worker/auth]', err)
    return json({ error: err?.message || 'Erreur auth.' }, { status })
  }
}
