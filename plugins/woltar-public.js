// plugins/woltar-public.js
//
// Équivalent dev-only (Vite) de worker/routes/public.js. Sert les mêmes
// routes /__public/api/* que le Worker de production, mais lit directement
// les JSON locaux (pas de D1 en dev) — le site public utilise ainsi la même
// méthode de lecture (fetch runtime, voir src/lib/publicData.js) en dev et
// en prod, plutôt qu'un import statique figé au build. Les fiches créées ou
// modifiées via /admin ou /compte en dev sont donc visibles immédiatement,
// sans redémarrer le serveur (lecture fraîche du disque à chaque requête).
//
// Historique — tâche « Aether » : la route /personas/:characterId a été
// retirée — le système de Personas RP liées à un personnage est supprimé.
// Voir plugins/woltar-aether.js pour l'assistant IA central unique du site.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveClanMembers } from './lib/clanMembers.js'
import { listPublicPlayerProfiles } from './lib/playerProfiles.js'

function isPublished(character) {
  return Boolean(character) && character.visibility !== 'draft'
}

// Un clan de compte peut rester "draft" (visibility) tant que sa
// propriétaire ne l'a pas publié — même logique que les personnages. Un
// clan canon (Nakamura) n'a pas ce champ : il reste donc public par défaut.
function isPublishedClan(clan) {
  return Boolean(clan) && clan.visibility !== 'draft'
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

          if (parts[0] === 'creator-profile' && parts.length === 1) {
            const profiles = await readCollection('creator')
            return send(200, { data: profiles[0] || null })
          }

          if (parts[0] === 'players' && parts.length === 1) return send(200, { data: await listPublicPlayerProfiles(root) })

          if (parts[0] === 'clans' && parts.length === 1) {
            const clans = (await readCollection('clans')).filter(isPublishedClan)
            const withMembers = await Promise.all(
              clans.map(async (c) => ({ ...c, members: await resolveClanMembers(root, c) })),
            )
            return send(200, { data: withMembers })
          }

          if (parts[0] === 'locations' && parts.length === 1) {
            const locations = (await readCollection('locations')).filter((location) => location.visibility !== 'draft')
            return send(200, { data: locations })
          }

          if (parts[0] === 'clans' && parts[1]) {
            const clans = await readCollection('clans')
            const clan = clans.find((c) => c.id === decodeURIComponent(parts[1]))
            if (!isPublishedClan(clan)) return send(404, { error: 'Clan introuvable.' })
            const withMembers = { ...clan, members: await resolveClanMembers(root, clan) }
            return send(200, { data: withMembers })
          }

          if (parts[0] === 'characters' && parts[1]) {
            const characters = await readCollection('characters')
            const character = characters.find((c) => c.id === decodeURIComponent(parts[1]))
            if (!isPublished(character)) return send(404, { error: 'Personnage introuvable.' })
            return send(200, { data: character })
          }

          if (parts[0] === 'locations' && parts[1]) {
            const locations = await readCollection('locations')
            const location = locations.find((item) => item.id === decodeURIComponent(parts[1]))
            if (!location || location.visibility === 'draft') return send(404, { error: 'Lieu introuvable.' })
            return send(200, { data: location })
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
