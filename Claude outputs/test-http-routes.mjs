// Test d'intégration HTTP — pas les fonctions authStore directement, mais
// les VRAIS handlers de route (handleAuth, handleAccount) avec de vrais
// objets Request/Response (Fetch API), pour vérifier le câblage HTTP
// lui-même : rate limiting branché aux bonnes routes, en-têtes Set-Cookie,
// codes de statut, routage /security/*. La logique métier (authStore.js)
// est déjà couverte en détail par test-prod-security.mjs.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

let passed = 0
let failed = 0
function assert(cond, label) {
  if (cond) {
    passed++
    console.log(`  OK  ${label}`)
  } else {
    failed++
    console.error(`  FAIL ${label}`)
  }
}

function wrapDb(db) {
  function boundMethods(sql, params) {
    return {
      bind(...nextParams) {
        return boundMethods(sql, nextParams)
      },
      async run() {
        db.prepare(sql).run(...params)
        return { success: true }
      },
      async first() {
        return db.prepare(sql).get(...params) ?? null
      },
      async all() {
        return { results: db.prepare(sql).all(...params) }
      },
    }
  }
  return { prepare: (sql) => boundMethods(sql, []) }
}

const sqlite = new DatabaseSync(':memory:')
for (const file of [
  'migrations/0001_init.sql',
  'migrations/0002_deprecate_personas.sql',
  'migrations/0003_creator_profile_and_character_image_meta.sql',
  'migrations/0004_clans_and_members.sql',
  'migrations/0005_account_security.sql',
  'migrations/0006_user_permissions_and_locations.sql',
]) {
  sqlite.exec(readFileSync(file, 'utf8'))
}

const env = {
  WOLTAR_DB: wrapDb(sqlite),
  AUTH_SESSION_SECRET: 'test-secret-http',
  ALLOW_PUBLIC_REGISTRATION: 'true',
}

const { handleAuth } = await import('./worker/routes/auth.js')
const { handleAccount } = await import('./worker/routes/account.js')

function req(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = `woltar_session=${encodeURIComponent(cookie)}`
  return new Request(`https://woltar.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function cookieFrom(res) {
  const raw = res.headers.get('set-cookie') || ''
  const match = raw.match(/woltar_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

console.log('=== HTTP: /__auth/api ===')

// --- register ---
const registerRes = await handleAuth(req('/__auth/api/register', { method: 'POST', body: { email: 'http1@test.tld', password: 'HttpPass1234', name: 'Http1' } }), env, ['register'])
const registerBody = await registerRes.json()
assert(registerRes.status === 200, 'POST /register renvoie 200')
assert(Boolean(cookieFrom(registerRes)), '/register pose un cookie de session (Set-Cookie)')
assert(!('passwordHash' in registerBody.user), "la réponse de /register ne contient jamais passwordHash")

// --- login: mauvais mot de passe, rate limited après plusieurs essais ---
let last401 = null
for (let i = 0; i < 8; i++) {
  const r = await handleAuth(
    req('/__auth/api/login', { method: 'POST', body: { email: 'http1@test.tld', password: 'Mauvais' } }),
    env,
    ['login'],
  )
  last401 = r
}
assert(last401.status === 401, "8 tentatives de connexion avec mauvais mot de passe restent des 401 (sous la limite de 8)")
const rateLimitedLogin = await handleAuth(
  req('/__auth/api/login', { method: 'POST', body: { email: 'http1@test.tld', password: 'Mauvais' } }),
  env,
  ['login'],
)
assert(rateLimitedLogin.status === 429, 'la 9e tentative de connexion sur le même email est temporisée (429)')

// --- login avec le bon mot de passe sur un AUTRE email (bucket différent) fonctionne toujours ---
const okLoginRes = await handleAuth(
  req('/__auth/api/login', { method: 'POST', body: { email: 'http1@test.tld', password: 'HttpPass1234' } }),
  env,
  ['login'],
)
// Toujours bloqué : le bucket "login:email:http1@test.tld" est commun,
// donc même le bon mot de passe est temporisé après 9 essais sur CETTE
// adresse — comportement voulu (protège aussi le titulaire légitime contre
// un bruteforce en cours).
assert(okLoginRes.status === 429, "même le bon mot de passe est temporisé une fois la limite atteinte sur cet email (protection anti-bruteforce)")

const okLoginRes2 = await handleAuth(
  req('/__auth/api/login', { method: 'POST', body: { email: 'http2-inexistant@test.tld', password: 'Peu importe1234' } }),
  env,
  ['login'],
)
assert(okLoginRes2.status === 401, 'un email différent (bucket différent) a son propre compteur — pas de fuite entre comptes')

console.log('\n=== HTTP: /__auth/api/forgot-password + reset-password (bout-en-bout HTTP) ===')
const originalWarn = console.warn
console.warn = () => {}
const forgotRes = await handleAuth(req('/__auth/api/forgot-password', { method: 'POST', body: { email: 'http1@test.tld' } }), env, ['forgot-password'])
const forgotResUnknown = await handleAuth(
  req('/__auth/api/forgot-password', { method: 'POST', body: { email: 'personne-du-tout@test.tld' } }),
  env,
  ['forgot-password'],
)
console.warn = originalWarn
assert(forgotRes.status === 200, 'POST /forgot-password (adresse connue) renvoie 200')
assert(forgotResUnknown.status === 200, 'POST /forgot-password (adresse inconnue) renvoie AUSSI 200')
const forgotBody1 = JSON.stringify(await forgotRes.clone().json())
const forgotBody2 = JSON.stringify(await forgotResUnknown.clone().json())
assert(forgotBody1 === forgotBody2, 'la réponse est identique, mot pour mot, que l’adresse existe ou non (neutralité)')

// Récupère le jeton brut depuis la table (test only — jamais possible en
// prod réel : ceci lit directement la base de test, pas une route HTTP).
const tokenRow = sqlite.prepare("SELECT * FROM account_tokens WHERE purpose = 'password_reset' ORDER BY created_at DESC LIMIT 1").get()
assert(Boolean(tokenRow), 'un jeton password_reset a bien été créé en base pour l’adresse connue')
// On ne peut pas retrouver le brut depuis le hash (par design) — on relit
// donc le lien réellement "envoyé" en tapant directement le mailer une
// fois de plus avec une IP différente pour ne pas retoucher au rate
// limit déjà testé plus haut.
let capturedToken = null
const realFetch = globalThis.fetch
globalThis.fetch = async () => new Response(JSON.stringify({ id: 'test' }), { status: 200 })
const { requestPasswordReset } = await import('./worker/lib/authStore.js')
const origLog = console.log
console.log = () => {}
console.warn = () => {}
await requestPasswordReset({ ...env, RESEND_API_KEY: undefined }, { email: 'http1@test.tld', origin: 'https://woltar.example' })
console.log = origLog
console.warn = originalWarn
globalThis.fetch = realFetch
const tokenRow2 = sqlite.prepare("SELECT * FROM account_tokens WHERE purpose = 'password_reset' ORDER BY created_at DESC LIMIT 1").get()
// Sans clé API, le lien n'est nulle part récupérable depuis ce test — donc
// pour tester reset-password bout-en-bout via HTTP, on génère le jeton
// nous-mêmes en clair puis on insère directement SON hash (même méthode que
// authStore.js), ce qui revient exactement à simuler "l'utilisatrice a reçu
// ce jeton par email".
import { randomBytes, createHash } from 'node:crypto'
const rawToken = randomBytes(32).toString('base64url')
const tokenHash = createHash('sha256').update(rawToken).digest('hex')
sqlite
  .prepare(
    "INSERT INTO account_tokens (id, user_id, purpose, token_hash, payload, expires_at, used_at, created_at) VALUES (?, ?, 'password_reset', ?, NULL, ?, NULL, ?)",
  )
  .run('tok_http_test', tokenRow.user_id, tokenHash, new Date(Date.now() + 30 * 60 * 1000).toISOString(), new Date().toISOString())

const resetRes = await handleAuth(req('/__auth/api/reset-password', { method: 'POST', body: { token: rawToken, newPassword: 'ViaHttpReset123' } }), env, ['reset-password'])
assert(resetRes.status === 200, 'POST /reset-password avec un jeton valide renvoie 200')

const loginAfterReset = await handleAuth(
  req('/__auth/api/login', { method: 'POST', body: { email: 'http1@test.tld', password: 'ViaHttpReset123' } }),
  env,
  ['login'],
)
// Rappel : le bucket login:email:http1@test.tld est encore rate-limited
// depuis plus haut dans ce test — on vérifie donc la NOUVELLE valeur en
// contournant via loginUser directement plutôt que via /login HTTP.
const { loginUser: loginUserDirect } = await import('./worker/lib/authStore.js')
const directLogin = await loginUserDirect(env, { email: 'http1@test.tld', password: 'ViaHttpReset123' })
assert(directLogin.email === 'http1@test.tld', 'le nouveau mot de passe (posé via la route HTTP /reset-password) fonctionne bien')

console.log('\n=== HTTP: /__account/api/security/* (session requise) ===')
const bootstrapUser = directLogin
const sessionToken = (await import('./worker/lib/authStore.js')).createSessionToken(env, bootstrapUser)

const noSessionRes = await handleAccount(req('/__account/api/security/change-password', { method: 'POST', body: {} }), env, ['security', 'change-password'])
assert(noSessionRes.status === 401, 'POST /security/change-password sans cookie de session renvoie 401')

const wrongCurrentRes = await handleAccount(
  req('/__account/api/security/change-password', { method: 'POST', cookie: sessionToken, body: { currentPassword: 'Mauvais', newPassword: 'AutrePass123' } }),
  env,
  ['security', 'change-password'],
)
assert(wrongCurrentRes.status === 401, 'POST /security/change-password avec un mauvais mot de passe actuel renvoie 401 (même avec une session valide)')

const changePwRes = await handleAccount(
  req('/__account/api/security/change-password', {
    method: 'POST',
    cookie: sessionToken,
    body: { currentPassword: 'ViaHttpReset123', newPassword: 'ViaHttpChange123' },
  }),
  env,
  ['security', 'change-password'],
)
assert(changePwRes.status === 200, 'POST /security/change-password avec le bon mot de passe actuel renvoie 200')
assert(Boolean(cookieFrom(changePwRes)), 'un changement de mot de passe réussi ré-émet un cookie de session à jour')

// L'ANCIEN cookie de session (celui utilisé pour la requête ci-dessus) est
// maintenant invalide, même s'il n'a pas expiré.
const oldSessionStillWorks = await handleAccount(req('/__account/api/bootstrap', { method: 'GET' }), env, ['bootstrap'])
const bootstrapWithOldCookie = await handleAccount(req('/__account/api/bootstrap', { method: 'GET', cookie: sessionToken }), env, ['bootstrap'])
assert(bootstrapWithOldCookie.status === 401, "l'ancien cookie de session est refusé après le changement de mot de passe (401 sur toute route /__account/api)")

const newSessionToken = cookieFrom(changePwRes)
const bootstrapWithNewCookie = await handleAccount(req('/__account/api/bootstrap', { method: 'GET', cookie: newSessionToken }), env, ['bootstrap'])
assert(bootstrapWithNewCookie.status === 200, 'le nouveau cookie de session (ré-émis après le changement) fonctionne bien')

console.log('\n=== HTTP: /__account/api/security/change-email ===')
const changeEmailRes = await handleAccount(
  req('/__account/api/security/change-email', {
    method: 'POST',
    cookie: newSessionToken,
    body: { newEmail: 'http1-nouveau@test.tld', currentPassword: 'ViaHttpChange123' },
  }),
  env,
  ['security', 'change-email'],
)
assert(changeEmailRes.status === 200, 'POST /security/change-email avec le bon mot de passe actuel renvoie 200')
const changeEmailBody = await changeEmailRes.json()
assert(changeEmailBody.user.pendingEmail === 'http1-nouveau@test.tld', "la réponse reflète bien l'email en attente")
assert(changeEmailBody.user.email === 'http1@test.tld', "l'email réel ne change pas tant que le lien n'est pas cliqué")

const unknownSecurityAction = await handleAccount(
  req('/__account/api/security/action-bidon', { method: 'POST', cookie: newSessionToken, body: {} }),
  env,
  ['security', 'action-bidon'],
)
assert(unknownSecurityAction.status === 404, 'une action /security/* inconnue renvoie 404')

console.log(`\n=== HTTP RESULTS: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
