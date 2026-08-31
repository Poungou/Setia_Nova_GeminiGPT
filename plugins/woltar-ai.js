// plugins/woltar-ai.js
//
// Plugin Vite — actif UNIQUEMENT en développement (`npm run dev`), même
// principe que plugins/woltar-admin.js. Fait parler un « Woltarien IA »
// (fiche Persona liée à un personnage) via l'API OpenAI, sans jamais exposer
// la clé API au navigateur.
//
// Endpoint (préfixe /__ai/api) :
//   POST /chat   { personaId, messages: [{role, content}], testMode? }
//                -> { reply: "texte" }
//
// Sécurité (voir cahier des charges § 5/6) :
//   - la clé API vit uniquement dans .env.local (OPENAI_API_KEY), lue
//     côté serveur via `loadEnv()` de Vite — jamais préfixée VITE_, donc
//     jamais injectée dans le bundle envoyé au navigateur ;
//   - le endpoint ne fait que : charger la Persona autorisée, construire le
//     contexte, appeler l'API, renvoyer le texte — rien d'autre (pas
//     d'accès shell, pas d'accès fichiers arbitraire, pas d'exécution de
//     code) ;
//   - longueur de message et taille d'historique plafonnées, validation du
//     personaId, limite de débit simple, timeout, aucune trace d'erreur
//     (stack) renvoyée au navigateur ;
//   - `testMode` (utilisé uniquement par le bouton « Tester la Persona » de
//     /admin) contourne le champ `enabled`, mais pas les autres contrôles :
//     l'admin est déjà protégée par le verrou local, et ce serveur ne tourne
//     que sur la machine de l'utilisatrice — même posture de sécurité que
//     plugins/woltar-admin.js (voir ADMIN_LOCAL.md).
//
// En build de production, ce plugin ne fait rien : le bouton « Parler
// avec… » reste caché (voir src/lib/personaApi.js, `personaChatAvailable`).

import OpenAI from 'openai'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnv } from 'vite'
import { canEditOwnedResource, getRequestUser } from './lib/authStore.js'
import { buildSystemPrompt } from './lib/personaPrompt.js'

const MAX_MESSAGE_LEN = 4000
const MAX_HISTORY = 20
const MAX_BODY_BYTES = 200 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20 // requêtes / minute / IP — généreux pour un usage perso en local
const REQUEST_TIMEOUT_MS = 25_000
const DEFAULT_MODEL = 'gpt-5.6-luna'
const DEFAULT_REASONING_EFFORT = 'none'
const MAX_OUTPUT_TOKENS = 500

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

function clampCreativity(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0.7
  return Math.min(1, Math.max(0, n))
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
    return { status: 504, error: 'Le personnage met trop de temps à répondre — réessaie.' }
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
      error: "La clé API OpenAI n'a pas accès au modèle configuré. Vérifie OPENAI_MODEL ou les droits du projet.",
    }
  }

  if (status === 404) {
    return {
      status: 502,
      error: "Modèle OpenAI introuvable. Vérifie OPENAI_MODEL dans .env.local ou retire cette variable.",
    }
  }

  if (status === 429) {
    return { status: 429, error: 'Le service IA limite temporairement les requêtes — patiente un instant.' }
  }

  return { status: 502, error: 'Le service IA a renvoyé une erreur.' }
}

export default function woltarAi() {
  return {
    name: 'woltar-ai',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dataDir = path.join(root, 'src', 'data')
      const env = loadEnv(server.config.mode, root, '')
      const apiKey = env.OPENAI_API_KEY || ''
      const model = env.OPENAI_MODEL || DEFAULT_MODEL
      const openai = apiKey ? new OpenAI({ apiKey }) : null

      // Compteur de débit très simple, en mémoire, par adresse. Suffisant
      // pour un usage local perso — pas pensé pour un service public.
      const hits = new Map()
      function isRateLimited(key) {
        const now = Date.now()
        const arr = (hits.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
        arr.push(now)
        hits.set(key, arr)
        return arr.length > RATE_LIMIT_MAX
      }

      server.middlewares.use('/__ai/api', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
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

          const { personaId, messages, testMode } = payload || {}
          if (!personaId || typeof personaId !== 'string') return send(400, { error: 'personaId manquant.' })
          if (!Array.isArray(messages) || messages.length === 0) {
            return send(400, { error: 'Aucun message à envoyer.' })
          }

          const personas = JSON.parse(await readFile(path.join(dataDir, 'personas.json'), 'utf8'))
          const persona = personas.find((p) => p.id === personaId)
          if (!persona) return send(404, { error: 'Persona introuvable.' })

          const user = await getRequestUser(root, req)
          if (testMode && !user) {
            return send(401, { error: 'Connexion requise pour tester une Persona.' })
          }
          if (testMode && !canEditOwnedResource(user, persona)) {
            return send(403, { error: 'Tu ne peux tester que tes propres Personas.' })
          }
          if (!testMode && persona.enabled !== 'true') {
            return send(403, { error: 'Cette Persona n’est pas activée.' })
          }

          const characters = JSON.parse(await readFile(path.join(dataDir, 'characters.json'), 'utf8'))
          const character = characters.find((c) => c.id === persona.characterId)
          if (!character) return send(404, { error: 'Fiche personnage associée introuvable.' })

          const trimmed = messages
            .slice(-MAX_HISTORY)
            .map((m) => ({
              role: m && m.role === 'assistant' ? 'assistant' : 'user',
              content: String((m && (m.content ?? m.text)) || '').slice(0, MAX_MESSAGE_LEN),
            }))
            .filter((m) => m.content.trim().length > 0)

          if (trimmed.length === 0) return send(400, { error: 'Message vide.' })

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

          const system = buildSystemPrompt({ character, persona, characters })
          const temperature = clampCreativity(persona.creativity)

          const controller = new globalThis.AbortController()
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

          let aiResponse
          try {
            aiResponse = await openai.responses.create(
              {
                model,
                reasoning: { effort: DEFAULT_REASONING_EFFORT },
                max_output_tokens: MAX_OUTPUT_TOKENS,
                temperature,
                instructions: system,
                input: trimmed,
              },
              { signal: controller.signal },
            )
          } catch (err) {
            clearTimeout(timeout)
            const response = openAiErrorResponse(err)
            console.error('[woltar-ai] erreur OpenAI', err?.status, err?.code || err?.message)
            return send(response.status, { error: response.error })
          }
          clearTimeout(timeout)

          const reply = extractReply(aiResponse)

          if (!reply) return send(502, { error: 'Réponse vide du service IA.' })
          return send(200, { reply })
        } catch (err) {
          console.error('[woltar-ai]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Erreur interne du serveur de développement.' }))
        }
      })
    },
  }
}
