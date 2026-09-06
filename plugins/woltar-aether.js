// plugins/woltar-aether.js
//
// Plugin Vite — actif UNIQUEMENT en développement (`npm run dev`). Équivalent
// dev de worker/routes/aether.js : fait parler AETHER, l'assistant/guide IA
// central unique du site, via l'API OpenAI, sans jamais exposer la clé API
// au navigateur. Remplace l'ancien plugins/woltar-ai.js, supprimé avec le
// système de Personas RP liées à un personnage.
//
// Endpoint (préfixe /__aether/api) :
//   POST /chat   { messages: [{role, content}], context?: {characterId}, testMode? }
//                -> { reply: "texte" }
//
// Sécurité : identique à l'ancien plugins/woltar-ai.js — clé API dans
// .env.local uniquement, jamais préfixée VITE_, validation/plafonds des
// messages, limite de débit simple, timeout, aucune trace d'erreur (stack)
// renvoyée au navigateur. `testMode` (bouton « Tester Aether » de /admin)
// contourne le champ `enabled`, réservé à un compte admin.

import OpenAI from 'openai'
import { textOnlyRequest, isImageRequest, IMAGE_UNAVAILABLE } from './lib/aetherPolicy.js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnv } from 'vite'
import { getRequestUser, isAdmin } from './lib/authStore.js'
import { buildAetherSystemPrompt } from './lib/aetherPrompt.js'

const MAX_MESSAGE_LEN = 4000
const MAX_HISTORY = 20
const MAX_BODY_BYTES = 200 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const REQUEST_TIMEOUT_MS = 25_000
const DEFAULT_MODEL = 'gpt-5.6-luna'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > MAX_BODY_BYTES) reject(new Error('Message trop volumineux'))
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function extractReply(response) {
  if (typeof response?.output_text === 'string') return response.output_text.trim()

  return (response?.output || [])
    .flatMap((item) => item?.content || [])
    .map((part) => {
      if (!part) return ''
      if (part.type === 'output_text' || part.type === 'text') return part.text || ''
      return ''
    })
    .join('')
    .trim()
}

function openAiErrorResponse(err) {
  const status = err?.status || err?.cause?.status
  const code = err?.code || err?.error?.code

  if (err?.name === 'AbortError' || err?.name === 'APIUserAbortError') {
    return { status: 504, error: 'Aether met trop de temps à répondre — réessaie.' }
  }

  if (status === 401 || code === 'invalid_api_key') {
    return {
      status: 401,
      error: 'Clé API OpenAI invalide ou refusée. Vérifie OPENAI_API_KEY dans .env.local puis relance npm run dev.',
    }
  }

  if (status === 403) {
    return {
      status: 403,
      error: "La clé API OpenAI n’a pas accès à GPT-5.6 Luna. Vérifie les droits du projet.",
    }
  }

  if (status === 404) {
    return {
      status: 502,
      error: "GPT-5.6 Luna est introuvable pour ce projet OpenAI.",
    }
  }

  if (status === 429) {
    return { status: 429, error: 'Le service IA limite temporairement les requêtes — patiente un instant.' }
  }

  return { status: 502, error: 'Le service IA a renvoyé une erreur.' }
}

export default function woltarAether() {
  return {
    name: 'woltar-aether',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dataDir = path.join(root, 'src', 'data')
      const env = loadEnv(server.config.mode, root, '')
      const apiKey = env.OPENAI_API_KEY || ''
      const model = DEFAULT_MODEL
      const openai = apiKey ? new OpenAI({ apiKey, logLevel: 'off' }) : null

      const hits = new Map()
      function isRateLimited(key) {
        const now = Date.now()
        const arr = (hits.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
        arr.push(now)
        hits.set(key, arr)
        return arr.length > RATE_LIMIT_MAX
      }

      server.middlewares.use('/__aether/api', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(obj))
        }

        try {
          const url = new URL(req.url, 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)

          if (parts[0] !== 'chat') return send(404, { error: 'Route inconnue' })
          if (req.method !== 'POST') return send(405, { error: 'Méthode non autorisée' })

          let payload
          try {
            payload = JSON.parse(await readBody(req))
          } catch {
            return send(400, { error: 'Corps de requête invalide.' })
          }

          const { messages, context, testMode } = payload || {}
          if (!Array.isArray(messages) || messages.length === 0) {
            return send(400, { error: 'Aucun message à envoyer.' })
          }

          const aetherRows = JSON.parse(await readFile(path.join(dataDir, 'aether.json'), 'utf8'))
          const config = aetherRows[0] || null
          if (!config) return send(404, { error: 'Aether n’est pas configuré.' })

          const user = await getRequestUser(root, req)
          if (testMode && !isAdmin(user)) {
            return send(403, { error: 'Seule une administratrice peut tester Aether désactivé.' })
          }
          if (!testMode && config.enabled !== 'true') {
            return send(403, { error: 'Aether n’est pas activé.' })
          }

          const trimmed = messages
            .slice(-MAX_HISTORY)
            .map((m) => ({
              role: m && m.role === 'assistant' ? 'assistant' : 'user',
              content: String((m && (m.content ?? m.text)) || '').slice(0, MAX_MESSAGE_LEN),
            }))
            .filter((m) => m.content.trim().length > 0)

          if (trimmed.length === 0) return send(400, { error: 'Message vide.' })

          if (isImageRequest(trimmed)) return send(200, { reply: IMAGE_UNAVAILABLE })

          if (!apiKey || !openai) {
            return send(500, {
              error:
                "Clé API OpenAI manquante côté serveur. Ajoute OPENAI_API_KEY dans .env.local puis relance npm run dev.",
            })
          }

          const ip = req.socket?.remoteAddress || 'local'
          const rateKey = user ? `user:${user.id}` : `ip:${ip}`
          if (isRateLimited(rateKey)) {
            return send(429, { error: 'Trop de messages envoyés en peu de temps — patiente un instant.' })
          }

          const characters = JSON.parse(await readFile(path.join(dataDir, 'characters.json'), 'utf8'))
          const locations = JSON.parse(await readFile(path.join(dataDir, 'locations.json'), 'utf8'))
          const clans = JSON.parse(await readFile(path.join(dataDir, 'clans.json'), 'utf8'))

          const system = buildAetherSystemPrompt({
            config,
            characters,
            locations,
            clans,
            context: context && typeof context.characterId === 'string' ? context : null,
          })

          const controller = new globalThis.AbortController()
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

          let aiResponse
          try {
            aiResponse = await openai.responses.create(
              textOnlyRequest({ model, instructions: system, input: trimmed }),
              { signal: controller.signal },
            )
          } catch (err) {
            clearTimeout(timeout)
            const response = openAiErrorResponse(err)
            console.error('[aether] request_failed')
            return send(response.status, { error: response.error })
          }
          clearTimeout(timeout)

          const reply = extractReply(aiResponse)

          if (!reply) return send(502, { error: 'Réponse vide du service IA.' })
          return send(200, { reply })
        } catch {
          console.error('[aether] request_failed')
          return send(500, { error: 'Erreur interne du serveur de développement.' })
        }
      })
    },
  }
}
