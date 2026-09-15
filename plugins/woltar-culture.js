import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { getRequestUser } from './lib/authStore.js'
import { cultureRequest } from '../worker/lib/cultureService.js'

export default function woltarCulture() {
  return {
    name: 'woltar-culture',
    configureServer(server) {
      const root = server.config.root
      const dir = path.join(root, 'plugins/data')
      const file = path.join(dir, 'culture.json')
      let queue = Promise.resolve()
      server.middlewares.use('/__culture/api', (req, res) => {
        // Serialize local read-modify-write requests to avoid lost contributions.
        const run = async () => {
          let state
          try { state = JSON.parse(await readFile(file, 'utf8')) } catch (error) {
            if (error.code !== 'ENOENT') throw error
            state = { posts: [], tags: ['Coutumes', 'Croyances', 'Cuisine', 'Fêtes', 'Langues', 'Arts'].map((name, i) => ({ id: `tag-${i}`, name })) }
          }
          const save = async () => {
            await mkdir(dir, { recursive: true })
            await writeFile(`${file}.tmp`, JSON.stringify(state, null, 2), 'utf8')
            await rename(`${file}.tmp`, file)
          }
          const store = {
            tags: async () => state.tags,
            posts: async () => [...state.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            post: async id => state.posts.find(post => post.id === id),
            savePost: async post => { state.posts = [...state.posts.filter(p => p.id !== post.id), post]; await save() },
            deletePost: async id => { state.posts = state.posts.filter(p => p.id !== id); await save() },
            saveTag: async tag => { state.tags = [...state.tags.filter(t => t.id !== tag.id), tag]; await save() },
            deleteTag: async id => {
              state.tags = state.tags.filter(t => t.id !== id)
              state.posts = state.posts.map(p => ({ ...p, tagIds: p.tagIds.filter(t => t !== id) }))
              await save()
            },
          }
          let body = ''
          for await (const chunk of req) {
            body += chunk
            if (body.length > 100000) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Publication trop volumineuse.' })); return }
          }
          const url = new URL(req.url, `http://${req.headers.host}`)
          const request = new Request(url, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body } : {}) })
          const response = await cultureRequest(request, url.pathname.split('/').filter(Boolean), { store, getUser: () => getRequestUser(root, req) })
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(await response.text())
        }
        queue = queue.then(run).catch(error => { console.error('[culture local]', error); res.statusCode = 500; res.end(JSON.stringify({ error: 'La culture est momentanément indisponible.' })) })
      })
    },
  }
}
