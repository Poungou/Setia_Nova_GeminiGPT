// worker/routes/ai.js
//
// Port Cloudflare Worker de plugins/woltar-ai.js. Même contrat public : le
// navigateur n'envoie que { personaId, messages }, jamais de clé API. La clé
// OpenAI est un secret Wrangler (OPENAI_API_KEY), lue uniquement via `env`,
// jamais exposée au client. Le prompt système vient tel quel de
// plugins/lib/personaPrompt.js (aucune divergence de comportement entre dev
// local et production).
//
// Lit la Persona/le personnage via les lecteurs D1 + repli statique de
// contentStore.js (au lieu des lecteurs D1 stricts) : ça garantit que le
// chat des personnages historiques (Fudo...) continue de fonctionner même
// si D1 n'a pas encore été peuplé pour cette fiche — voir
// docs/CLOUDFLARE_DEPLOYMENT_PLAN.md.

import OpenAI from 'openai'
import { buildSystemPrompt } from '../../plugins/lib/personaPrompt.js'
import { canEditOwnedResource, getRequestUser } from '../lib/authStore.js'
import { getCharacterWithFallback, getPersonaWithFallback, listCharactersWithFallback } from '../lib/contentStore.js'

const MAX_MESSAGE_LEN = 4000
const MAX_HISTORY = 20
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20 // requêtes / minute / clé — voir note ci-dessous
const REQUEST_TIMEOUT_MS = 25_000
const DEFAULT_MODEL = 'gpt-5.6-luna'
const DEFAULT_REASONING_EFFORT = 'none'
const MAX_OUTPUT_TOKENS = 500

// Compteur de débit en mémoire, best-effort : un isolate Worker peut être
// recyclé à tout moment, donc ce n'est PAS une garantie dure contrairement à
// une vraie solution (KV/Durable Object). Suffisant pour un usage perso/petit
// groupe, comme en dev local — à revoir avant un trafic public important
// (voir docs/CLOUDFLARE_DEPLOYMENT_PLAN.md).
const hits = new Map()
function isRateLimited(key) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  arr.push(now)
  hits.set(key, arr)
  return arr.length > RATE_LIMIT_MAX
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) },
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
    return { status: 401, error: 'Clé API OpenAI invalide ou refusée (secret Wrangler OPENAI_API_KEY).' }
  }

  if (status === 403) {
    return { status: 403, error: "La clé API OpenAI n'a pas accès au modèle configuré (OPENAI_MODEL)." }
  }

  if (status === 404) {
    return { status: 502, error: 'Modèle OpenAI introuvable. Vérifie la variable OPENAI_MODEL.' }
  }

  if (status === 429) {
    return { status: 429, error: 'Le service IA limite temporairement les requêtes — patiente un instant.' }
  }

  return { status: 502, error: 'Le service IA a renvoyé une erreur.' }
}

// `parts` = segments du chemin après /__ai/api/ (ex: ['chat']).
export async function handleAi(request, env, parts) {
  try {
    if (parts[0] !== 'chat') return json({ error: 'Route inconnue' }, { status: 404 })
    if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, { status: 405 })

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'Corps de requête invalide.' }, { status: 400 })
    }

    const { personaId, messages, testMode } = payload || {}
    if (!personaId || typeof personaId !== 'string') {
      return json({ error: 'personaId manquant.' }, { status: 400 })
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Aucun message à envoyer.' }, { status: 400 })
    }

    const persona = await getPersonaWithFallback(env, personaId)
    if (!persona) return json({ error: 'Persona introuvable.' }, { status: 404 })

    const user = await getRequestUser(env, request)
    if (testMode && !user) {
      return json({ error: 'Connexion requise pour tester une Persona.' }, { status: 401 })
    }
    if (testMode && !canEditOwnedResource(user, persona)) {
      return json({ error: 'Tu ne peux tester que tes propres Personas.' }, { status: 403 })
    }
    if (!testMode && persona.enabled !== 'true') {
      return json({ error: 'Cette Persona n’est pas activée.' }, { status: 403 })
    }

    const character = await getCharacterWithFallback(env, persona.characterId)
    if (!character) return json({ error: 'Fiche personnage associée introuvable.' }, { status: 404 })

    const trimmed = messages
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String((m && (m.content ?? m.text)) || '').slice(0, MAX_MESSAGE_LEN),
      }))
      .filter((m) => m.content.trim().length > 0)

    if (trimmed.length === 0) return json({ error: 'Message vide.' }, { status: 400 })

    const apiKey = env.OPENAI_API_KEY || ''
    if (!apiKey) {
      return json(
        { error: 'Clé API OpenAI manquante côté serveur. Configure le secret Wrangler OPENAI_API_KEY.' },
        { status: 500 },
      )
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const rateKey = user ? `user:${user.id}` : `ip:${ip}`
    if (isRateLimited(rateKey)) {
      return json({ error: 'Trop de messages envoyés en peu de temps — patiente un instant.' }, { status: 429 })
    }

    const characters = await listCharactersWithFallback(env)
    const system = buildSystemPrompt({ character, persona, characters })
    const temperature = clampCreativity(persona.creativity)
    const model = env.OPENAI_MODEL || DEFAULT_MODEL

    const openai = new OpenAI({ apiKey })
    const controller = new AbortController()
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
      console.error('[worker/ai] erreur OpenAI', err?.status, err?.code || err?.message)
      return json({ error: response.error }, { status: response.status })
    }
    clearTimeout(timeout)

    const reply = extractReply(aiResponse)
    if (!reply) return json({ error: 'Réponse vide du service IA.' }, { status: 502 })
    return json({ reply })
  } catch (err) {
    console.error('[worker/ai]', err)
    return json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
