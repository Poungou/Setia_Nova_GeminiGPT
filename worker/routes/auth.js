// worker/routes/auth.js
//
// Port Cloudflare Worker de plugins/woltar-auth.js. Même contrat pour le
// front (routes et réponses JSON identiques), deux différences volontaires :
//   - PAS de route « admin local » (mot de passe en clair `woltar`) : ça n'a
//     de sens que sur le serveur de dev local, jamais sur un Worker exposé
//     publiquement ;
//   - le cookie de session est signé/lu via worker/lib/authStore.js, qui
//     s'appuie sur D1 (`env.WOLTAR_DB`) au lieu de plugins/data/users.json.
//
// Historique — sécurisation du compte (mot de passe oublié, changement
// d'email) : trois routes PUBLIQUES ajoutées ici (forgot-password,
// reset-password, confirm-email) — aucune n'exige de session, seul un
// jeton à usage unique (haché en base, jamais stocké en clair — voir
// worker/lib/authStore.js) prouve l'identité. Toutes les trois, plus
// /login, passent par le rate limiter (worker/lib/rateLimit.js) pour
// temporiser le bruteforce. Le changement de mot de passe depuis l'espace
// connecté et la DEMANDE de changement d'email (qui exige le mot de passe
// actuel) restent dans worker/routes/account.js, sous
// /__account/api/security/*, car ils nécessitent une session active.

import {
  clearSessionCookieHeader,
  confirmEmailChange,
  createUser,
  deleteUser,
  createSessionToken,
  getRequestUser,
  httpError,
  isAdmin,
  listPublicUsers,
  loginUser,
  publicUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sessionCookieHeader,
  updateUser,
} from '../lib/authStore.js'
import { checkRateLimit, clientIp } from '../lib/rateLimit.js'
import { createPlayerProfile, deletePlayerProfile, getPlayerProfile, savePlayerProfile } from '../lib/playerProfiles.js'

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
      const body = await readJson(request)
      // Temporisation par email ET par IP — limite le bruteforce sur un
      // compte précis sans bloquer tout le monde si une seule IP tente
      // plusieurs comptes (et inversement).
      await checkRateLimit(env, `login:identifier:${String(body?.identifier ?? body?.email ?? '').toLowerCase()}`, {
        max: 8,
        windowMs: 10 * 60 * 1000,
      })
      await checkRateLimit(env, `login:ip:${clientIp(request)}`, { max: 20, windowMs: 10 * 60 * 1000 })
      const user = await loginUser(env, body)
      const token = createSessionToken(env, user)
      return json({ user }, { headers: { 'Set-Cookie': sessionCookieHeader(token) } })
    }

    if (parts[0] === 'logout' && method === 'POST') {
      return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookieHeader() } })
    }

    if (parts[0] === 'forgot-password' && method === 'POST') {
      const body = await readJson(request)
      await checkRateLimit(env, `reset:email:${String(body?.email || '').toLowerCase()}`, {
        max: 4,
        windowMs: 30 * 60 * 1000,
      })
      await checkRateLimit(env, `reset:ip:${clientIp(request)}`, { max: 10, windowMs: 30 * 60 * 1000 })
      const origin = new URL(request.url).origin
      await requestPasswordReset(env, { email: body?.email, origin })
      // Réponse strictement identique que l'adresse existe ou non — voir
      // worker/lib/authStore.js#requestPasswordReset.
      return json({
        ok: true,
        message: 'Si un compte existe avec cette adresse, un email de réinitialisation vient d’être envoyé.',
      })
    }

    if (parts[0] === 'reset-password' && method === 'POST') {
      const body = await readJson(request)
      await checkRateLimit(env, `reset-consume:ip:${clientIp(request)}`, { max: 10, windowMs: 15 * 60 * 1000 })
      await resetPassword(env, { token: body?.token, newPassword: body?.newPassword })
      return json({ ok: true })
    }

    if (parts[0] === 'confirm-email' && method === 'POST') {
      const body = await readJson(request)
      await checkRateLimit(env, `confirm-email:ip:${clientIp(request)}`, { max: 10, windowMs: 15 * 60 * 1000 })
      const user = await confirmEmailChange(env, { token: body?.token })
      return json({ ok: true, user })
    }

    if (parts[0] === 'users') {
      const actor = await getRequestUser(env, request)
      if (!actor) throw httpError(401, 'Connexion requise.')
      if (!isAdmin(actor)) throw httpError(403, 'Réservé admin.')

      if (method === 'GET' && parts.length === 1) {
        return json({ users: await listPublicUsers(env) })
      }

      if (method === 'POST' && parts.length === 1) {
        return json({ user: await createUser(env, await readJson(request), actor) }, { status: 201 })
      }

      if (method === 'PATCH' && parts[1]) {
        const user = await updateUser(env, parts[1], await readJson(request), actor)
        return json({ user })
      }

      if (method === 'DELETE' && parts.length === 2 && parts[1]) {
        return json(await deleteUser(env, parts[1], actor))
      }

      if (parts[1] && parts[2] === 'profile') {
        if (method === 'GET') return json({ profile: await getPlayerProfile(env, parts[1]) })
        if (method === 'POST') return json({ profile: await createPlayerProfile(env, parts[1], await readJson(request)) }, { status: 201 })
        if (method === 'PUT') return json({ profile: await savePlayerProfile(env, parts[1], await readJson(request), { allowAllCharacters: true }) })
        if (method === 'DELETE') {
          await deletePlayerProfile(env, parts[1])
          return json({ ok: true })
        }
      }
    }

    return json({ error: 'Route inconnue' }, { status: 404 })
  } catch (err) {
    const status = err?.status || 500
    // Rappel sécurité : ne jamais logger le corps de la requête (mots de
    // passe, jetons) — seul le message d'erreur contrôlé (httpError) ou
    // l'objet Error générique est journalisé, jamais `body`.
    if (status >= 500) console.error('[worker/auth]', err)
    return json({ error: err?.message || 'Erreur auth.' }, { status })
  }
}
