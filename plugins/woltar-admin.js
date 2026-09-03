// plugins/woltar-admin.js
//
// Plugin Vite — actif UNIQUEMENT en développement (`npm run dev`).
// Donne à l'interface /admin de quoi lire/écrire les fichiers de données et
// enregistrer des images, en local. Les écritures admin sont protégées côté
// serveur par la session créée via plugins/woltar-auth.js.
//
// Endpoints (préfixe /__admin/api) :
//   GET  /collections/:name        -> contenu de src/data/:name.json
//   PUT  /collections/:name        -> réécrit src/data/:name.json (corps = tableau JSON)
//   POST /upload                   -> { filename, dataUrl } -> écrit public/media/<slug>, renvoie { path }
//
// En build de production, ce plugin ne fait rien : le Worker prend le relais.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { getRequestUser, httpError, isAdmin } from './lib/authStore.js'

const COLLECTIONS = ['home', 'creator', 'characters', 'locations', 'clans', 'events', 'archives', 'posts', 'aether']
const MEDIA_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' }

function slugify(s) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'fichier'
  )
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 25 * 1024 * 1024) reject(new Error('Corps trop volumineux'))
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

export default function woltarAdmin() {
  return {
    name: 'woltar-admin',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dataDir = path.join(root, 'src', 'data')
      const mediaDir = path.join(root, 'public', 'media')

      server.middlewares.use('/__admin/api', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(obj))
        }

        try {
          const url = new URL(req.url, 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean) // e.g. ['collections','characters']

          // --- collections ------------------------------------------------
          if (parts[0] === 'collections') {
            const user = await getRequestUser(root, req)
            if (!user) throw httpError(401, 'Connexion requise.')
            if (!isAdmin(user)) throw httpError(403, 'Réservé admin.')

            const name = parts[1]
            if (!COLLECTIONS.includes(name)) return send(404, { error: 'Collection inconnue' })
            const file = path.join(dataDir, `${name}.json`)

            if (req.method === 'GET') {
              const txt = await readFile(file, 'utf8')
              return send(200, { data: JSON.parse(txt) })
            }
            if (req.method === 'PUT') {
              const body = await readBody(req)
              const parsed = JSON.parse(body)
              if (!Array.isArray(parsed)) return send(400, { error: 'Tableau attendu' })
              await writeFile(file, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
              return send(200, { ok: true, count: parsed.length })
            }
            return send(405, { error: 'Méthode non autorisée' })
          }

          // --- upload image --------------------------------------------
          if (parts[0] === 'upload' && req.method === 'POST') {
            const user = await getRequestUser(root, req)
            if (!user) throw httpError(401, 'Connexion requise.')

            const { filename, dataUrl } = JSON.parse(await readBody(req))
            const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '')
            if (!m) return send(400, { error: 'dataUrl invalide' })
            const ext = MEDIA_EXT[m[1]]
            if (!ext) return send(400, { error: `Type non supporté : ${m[1]}` })
            if (!existsSync(mediaDir)) await mkdir(mediaDir, { recursive: true })
            const base = slugify((filename || 'image').replace(/\.[^.]+$/, ''))
            const finalName = `${base}-${Date.now().toString(36)}${ext}`
            await writeFile(path.join(mediaDir, finalName), Buffer.from(m[2], 'base64'))
            return send(200, { path: `/media/${finalName}` })
          }

          return send(404, { error: 'Route inconnue' })
        } catch (err) {
          res.statusCode = err?.status || 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }))
        }
      })
    },
  }
}
