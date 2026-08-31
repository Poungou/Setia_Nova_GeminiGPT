// plugins/woltar-auth.js
//
// Auth locale pour le serveur Vite de developpement. Les comptes reels sont
// stockes cote serveur dans plugins/data/users.json (ignore par Git), jamais
// dans le bundle navigateur.

import { loadEnv } from 'vite'
import {
  LOCAL_ADMIN_USER,
  clearSessionCookie,
  createSessionToken,
  getRequestUser,
  httpError,
  isAdmin,
  listPublicUsers,
  loginUser,
  publicUser,
  registerUser,
  setSessionCookie,
  updateUser,
} from './lib/authStore.js'

const MAX_BODY_BYTES = 64 * 1024
const DEFAULT_LOCAL_ADMIN_PASSPHRASE = 'woltar'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > MAX_BODY_BYTES) reject(new Error('Corps trop volumineux'))
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  return raw ? JSON.parse(raw) : {}
}

export default function woltarAuth() {
  return {
    name: 'woltar-auth',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const env = loadEnv(server.config.mode, root, '')
      const localPassphrase = env.WOLTAR_ADMIN_PASSPHRASE || DEFAULT_LOCAL_ADMIN_PASSPHRASE

      server.middlewares.use('/__auth/api', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(obj))
        }

        try {
          const url = new URL(req.url, 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)

          if (parts[0] === 'session' && req.method === 'GET') {
            const user = await getRequestUser(root, req)
            return send(200, { user: publicUser(user) })
          }

          if (parts[0] === 'register' && req.method === 'POST') {
            const user = await registerUser(root, await readJson(req))
            setSessionCookie(res, await createSessionToken(root, user))
            return send(200, { user })
          }

          if (parts[0] === 'login' && req.method === 'POST') {
            const user = await loginUser(root, await readJson(req))
            setSessionCookie(res, await createSessionToken(root, user))
            return send(200, { user })
          }

          if (parts[0] === 'logout' && req.method === 'POST') {
            clearSessionCookie(res)
            return send(200, { ok: true })
          }

          if (parts[0] === 'local-admin' && req.method === 'POST') {
            const payload = await readJson(req)
            if (payload?.passphrase !== localPassphrase) throw httpError(401, 'Phrase incorrecte.')
            setSessionCookie(res, await createSessionToken(root, LOCAL_ADMIN_USER))
            return send(200, { user: LOCAL_ADMIN_USER })
          }

          if (parts[0] === 'users') {
            const actor = await getRequestUser(root, req)
            if (!actor) throw httpError(401, 'Connexion requise.')
            if (!isAdmin(actor)) throw httpError(403, 'Reserve admin.')

            if (req.method === 'GET' && parts.length === 1) {
              return send(200, { users: await listPublicUsers(root) })
            }

            if (req.method === 'PATCH' && parts[1]) {
              const user = await updateUser(root, parts[1], await readJson(req), actor)
              return send(200, { user })
            }
          }

          return send(404, { error: 'Route inconnue' })
        } catch (err) {
          const status = err?.status || 500
          if (status >= 500) console.error('[woltar-auth]', err)
          return send(status, { error: err?.message || 'Erreur auth.' })
        }
      })
    },
  }
}
