// worker/routes/aether.js
//
// Port Cloudflare Worker de plugins/woltar-aether.js. Remplace
// l'ancien worker/routes/ai.js : plus de Personas RP liées à un personnage,
// un seul assistant IA central — AETHER, le guide de Woltar.
//
// Même contrat de sécurité que l'ancien système : le navigateur n'envoie
// jamais de clé API, seulement { messages, context? }. La clé OpenAI est un
// secret Wrangler (OPENAI_API_KEY), lue uniquement via `env`. La brique
// OpenAI (appel, timeout, gestion d'erreurs, limite de débit) est reprise
// telle quelle de l'ancien worker/routes/ai.js — seule la construction du
// prompt et la source de configuration changent (voir plugins/lib/aetherPrompt.js).

import OpenAI from 'openai'
import { textOnlyRequest, isImageRequest, IMAGE_UNAVAILABLE } from '../../plugins/lib/aetherPolicy.js'
import { buildAetherSystemPrompt } from '../../plugins/lib/aetherPrompt.js'
import { getRequestUser, httpError, isAdmin } from '../lib/authStore.js'
import { getAetherConfig } from '../lib/contentStore.js'
import { listPublicCharacters, listPublicClans, listPublicLocations } from '../lib/publicStore.js'
import { clientIp, getRateLimitCount, recordRateLimit } from '../lib/rateLimit.js'

const MAX_MESSAGE_LEN = 4000
const MAX_HISTORY = 20
const REQUEST_TIMEOUT_MS = 25_000
const DEFAULT_MODEL = 'gpt-5.6-luna'

// Les limites Aether sont centralisées ici : les valeurs journalières peuvent
// être remplacées par des variables Wrangler, sans exposer le compteur global.
const AETHER_LIMITS = Object.freeze({
  shortWindowMs: 10 * 60 * 1000,
  shortUser: 20,
  shortAdmin: 100,
  shortIp: 40,
  dailyWindowMs: 24 * 60 * 60 * 1000,
  dailyGlobal: { env: 'AETHER_DAILY_GLOBAL', default: 30 },
  dailyUser: { env: 'AETHER_DAILY_USER', default: 5 },
  dailyAdmin: 30,
  dailyIp: { env: 'AETHER_DAILY_IP', default: 10 },
})

function limitValue(env, setting) {
  const value = Number.parseInt(env?.[setting.env], 10)
  return Number.isInteger(value) && value > 0 ? value : setting.default
}

function getAetherLimits(env) {
  return {
    ...AETHER_LIMITS,
    dailyGlobal: limitValue(env, AETHER_LIMITS.dailyGlobal),
    dailyUser: limitValue(env, AETHER_LIMITS.dailyUser),
    dailyIp: limitValue(env, AETHER_LIMITS.dailyIp),
  }
}

function parisDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function quotaError(message) {
  const error = httpError(429, message)
  error.aetherQuota = true
  return error
}

async function getQuota(env, user, ip) {
  const limits = getAetherLimits(env)
  const date = parisDate()
  const globalBucket = `aether:global:day:${date}`
  const userBucket = `aether:user:${user.id}:${date}`
  const ipBucket = `aether:ip:${ip}:${date}`
  const [globalUsed, userUsed, ipUsed] = await Promise.all([
    getRateLimitCount(env, globalBucket, { windowMs: limits.dailyWindowMs }),
    getRateLimitCount(env, userBucket, { windowMs: limits.dailyWindowMs }),
    getRateLimitCount(env, ipBucket, { windowMs: limits.dailyWindowMs }),
  ])
  const limit = isAdmin(user) ? limits.dailyAdmin : limits.dailyUser
  return {
    used: userUsed,
    limit,
    remaining: Math.max(0, limit - userUsed),
    siteAvailable: globalUsed < limits.dailyGlobal,
    resetLabel: 'à minuit (heure de Paris)',
    buckets: { date, globalBucket, userBucket, ipBucket, globalUsed, ipUsed },
    limits,
  }
}

async function assertQuotaAvailable(env, user, ip) {
  const quota = await getQuota(env, user, ip)
  if (!quota.siteAvailable) throw quotaError("Aether se repose pour aujourd'hui. Reviens demain.")
  if (quota.remaining <= 0) {
    throw quotaError(`Tu as utilisé tes ${quota.limit} messages du jour. Reviens demain.`)
  }
  if (quota.buckets.ipUsed >= quota.limits.dailyIp) {
    throw quotaError("La limite quotidienne de cette connexion est atteinte. Reviens demain.")
  }
  const shortUser = await getRateLimitCount(env, `aether:user:${user.id}`, { windowMs: quota.limits.shortWindowMs })
  if (shortUser >= (isAdmin(user) ? quota.limits.shortAdmin : quota.limits.shortUser)) throw quotaError('Trop de messages envoyés en peu de temps — patiente un instant.')
  const shortIp = await getRateLimitCount(env, `aether:ip:${ip}`, { windowMs: quota.limits.shortWindowMs })
  if (shortIp >= quota.limits.shortIp) throw quotaError('Trop de messages envoyés depuis cette connexion — patiente un instant.')
  return quota
}

async function recordSuccessfulMessage(env, quota, user, ip) {
  await Promise.all([
    recordRateLimit(env, quota.buckets.globalBucket),
    recordRateLimit(env, quota.buckets.userBucket),
    recordRateLimit(env, quota.buckets.ipBucket),
    recordRateLimit(env, `aether:user:${user.id}`),
    recordRateLimit(env, `aether:ip:${ip}`),
  ])
  return {
    used: quota.used + 1,
    limit: quota.limit,
    remaining: Math.max(0, quota.remaining - 1),
    siteAvailable: quota.buckets.globalUsed + 1 < quota.limits.dailyGlobal,
    resetLabel: quota.resetLabel,
  }
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(init.headers || {}) },
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
    return { status: 401, error: 'Clé API OpenAI invalide ou refusée (secret Wrangler OPENAI_API_KEY).' }
  }

  if (status === 403) {
    return { status: 403, error: 'Aether est momentanément indisponible.' }
  }

  if (status === 404) {
    return { status: 502, error: 'Le modèle d’Aether est momentanément indisponible.' }
  }

  if (status === 429) {
    return { status: 429, error: 'Le service IA limite temporairement les requêtes — patiente un instant.' }
  }

  return { status: 502, error: 'Le service IA a renvoyé une erreur.' }
}

// `parts` = segments du chemin après /__aether/api/ (ex: ['chat']).
export async function handleAether(request, env, parts) {
  try {
    if (parts[0] === 'quota') {
      if (request.method !== 'GET') return json({ error: 'Méthode non autorisée' }, { status: 405 })
      const user = await getRequestUser(env, request)
      if (!user) return json({ error: 'Connexion requise.' }, { status: 401 })
      const quota = await getQuota(env, user, clientIp(request))
      return json({ used: quota.used, limit: quota.limit, remaining: quota.remaining, siteAvailable: quota.siteAvailable, resetLabel: quota.resetLabel })
    }
    if (parts[0] !== 'chat') return json({ error: 'Route inconnue' }, { status: 404 })
    if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, { status: 405 })

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'Corps de requête invalide.' }, { status: 400 })
    }

    const { messages, context, testMode } = payload || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Aucun message à envoyer.' }, { status: 400 })
    }

    const config = getAetherConfig()
    if (!config) return json({ error: 'Aether n’est pas configuré.' }, { status: 404 })

    const user = await getRequestUser(env, request)
    if (!user && !testMode) return json({ error: 'Connecte-toi pour parler à Aether.' }, { status: 401 })
    if (testMode && !isAdmin(user)) {
      return json({ error: 'Seule une administratrice peut tester Aether désactivé.' }, { status: 403 })
    }
    if (!testMode && config.enabled !== 'true') {
      return json({ error: 'Aether n’est pas activé.' }, { status: 403 })
    }

    const trimmed = messages
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String((m && (m.content ?? m.text)) || '').slice(0, MAX_MESSAGE_LEN),
      }))
      .filter((m) => m.content.trim().length > 0)

    if (trimmed.length === 0) return json({ error: 'Message vide.' }, { status: 400 })

    if (isImageRequest(trimmed)) return json({ reply: IMAGE_UNAVAILABLE })

    const apiKey = env.OPENAI_API_KEY || ''
    if (!apiKey) {
      return json(
        { error: 'Clé API OpenAI manquante côté serveur. Configure le secret Wrangler OPENAI_API_KEY.' },
        { status: 500 },
      )
    }

    const ip = clientIp(request)
    const quota = await assertQuotaAvailable(env, user, ip)

    const characters = await listPublicCharacters(env)
    // Les clans crees par un compte joueur (D1) doivent aussi etre connus
    // d'Aether, pas seulement le clan canon Nakamura -- voir contentStore.js.
    const clans = await listPublicClans(env)
    const system = buildAetherSystemPrompt({
      config,
      characters,
      locations: await listPublicLocations(env),
      clans,
      context: context && typeof context.characterId === 'string' ? context : null,
    })
    // Keep the actual model aligned with the public disclosure.
    const model = DEFAULT_MODEL

    const openai = new OpenAI({ apiKey, logLevel: 'off' })
    const controller = new AbortController()
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
      return json({ error: response.error }, { status: response.status })
    }
    clearTimeout(timeout)

    const reply = extractReply(aiResponse)
    if (!reply) return json({ error: 'Réponse vide du service IA.' }, { status: 502 })
    return json({ reply, ...await recordSuccessfulMessage(env, quota, user, ip) })
  } catch (err) {
    const status = err?.status || 500
    if (status >= 500) console.error('[aether] request_failed')
    return json({ error: err?.message || 'Erreur interne du serveur.' }, { status })
  }
}
