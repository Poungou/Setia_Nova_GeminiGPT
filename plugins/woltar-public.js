// plugins/woltar-public.js
//
// Équivalent dev-only (Vite) de worker/routes/public.js. Sert les mêmes
// routes /__public/api/* que le Worker de production, mais lit directement
// les JSON locaux (pas de D1 en dev) — le site public utilise ainsi la même
// méthode de lecture (fetch runtime, voir src/lib/publicData.js) en dev et
// en prod, plutôt qu'un import statique figé au build. Les fiches créées ou
// modifiées via /admin ou /compte en dev sont donc visibles immédiatement,
// sans redémarrer le serveur (lecture fraîche du disque à chaque requête).

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const PUBLIC_PERSONA_FIELDS = ['id', 'characterId', 'name', 'avatar', 'enabled', 'greeting']

function isPublished(character) {
  return Boolean(character) && character.visibility !== 'draft'
}

function publicPersona(persona) {
  if (!persona) return null
  const safe = {}
  for (const key of PUBLIC_PERSONA_FIELDS) safe[key] = persona[key]
  return safe
}

export default function woltarPublic() {
  return {
    name: 'woltar-public',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dataDir = path.join(root, 'src', 'data')

      async function readCollection(name) {
        return JSON.parse(await readFile(path.join(dataDir, `${name}.json`), 'utf8'))
      }

      server.middlewares.use('/__public/api', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(obj))
        }

        try {
          if (req.method !== 'GET') return send(405, { error: 'Méthode non autorisée' })

          const url = new URL(req.url, 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)

          if (parts[0] === 'characters' && parts.length === 1) {
            const characters = (await readCollection('characters')).filter(isPublished)
            return send(200, { data: characters })
          }

          if (parts[0] === 'characters' && parts[1]) {
            const characters = await readCollection('characters')
            const character = characters.find((c) => c.id === decodeURIComponent(parts[1]))
            if (!isPublished(character)) return send(404, { error: 'Personnage introuvable.' })
            return send(200, { data: character })
          }

          if (parts[0] === 'personas' && parts[1]) {
            const personas = await readCollection('personas')
            const persona = personas.find((p) => p.characterId === decodeURIComponent(parts[1]))
            if (!persona || persona.enabled !== 'true') return send(200, { data: null })
            return send(200, { data: publicPersona(persona) })
          }

          return send(404, { error: 'Route inconnue' })
        } catch (err) {
          console.error('[woltar-public]', err)
          send(500, { error: 'Erreur interne du serveur de développement.' })
        }
      })
    },
  }
}
