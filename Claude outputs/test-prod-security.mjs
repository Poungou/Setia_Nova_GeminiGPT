// Test d'intégration PROD — exécute le vrai code livré
// (worker/lib/authStore.js, worker/lib/rateLimit.js), pas une
// réimplémentation, contre une vraie base SQLite (node:sqlite) après avoir
// appliqué les VRAIES migrations 0001 -> 0005 dans l'ordre, avec un shim
// minimal reproduisant l'API D1 (prepare().bind().run()/.first()/.all()).
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'

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
async function assertThrows(fn, label, statusExpected) {
  try {
    await fn()
    failed++
    console.error(`  FAIL ${label} (n'a pas levé d'erreur)`)
  } catch (err) {
    const ok = statusExpected ? err.status === statusExpected : true
    if (ok) {
      passed++
      console.log(`  OK  ${label} (status ${err.status})`)
    } else {
      failed++
      console.error(`  FAIL ${label} (status attendu ${statusExpected}, reçu ${err.status})`)
    }
  }
}

// --- Shim D1 minimal au-dessus de node:sqlite ---
function wrapDb(db) {
  function boundMethods(sql, params) {
    return {
      bind(...nextParams) {
        return boundMethods(sql, nextParams)
      },
      async run() {
        const stmt = db.prepare(sql)
        stmt.run(...params)
        return { success: true }
      },
      async first() {
        const stmt = db.prepare(sql)
        const row = stmt.get(...params)
        return row ?? null
      },
      async all() {
        const stmt = db.prepare(sql)
        const rows = stmt.all(...params)
        return { results: rows }
      },
    }
  }
  return {
    prepare(sql) {
      return boundMethods(sql, [])
    },
  }
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
console.log('Migrations 0001 -> 0005 appliquées sur une vraie base SQLite en mémoire.\n')

const env = {
  WOLTAR_DB: wrapDb(sqlite),
  AUTH_SESSION_SECRET: 'test-secret-not-real',
  ALLOW_PUBLIC_REGISTRATION: 'true',
  // RESEND_API_KEY volontairement absent : on vérifie le mode dégradé.
}

const authStore = await import('./worker/lib/authStore.js')
const { checkRateLimit } = await import('./worker/lib/rateLimit.js')
const {
  registerUser,
  loginUser,
  getRequestUser,
  createSessionToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
  requestEmailChange,
  confirmEmailChange,
  updateUser,
  listPublicUsers,
} = authStore

function fakeRequest({ cookie, url = 'https://woltar-vitrine-rp.example/x' } = {}) {
  return {
    url,
    headers: {
      get(name) {
        if (name.toLowerCase() === 'cookie') return cookie ? `woltar_session=${encodeURIComponent(cookie)}` : ''
        return null
      },
    },
  }
}

console.log('=== PROD (D1 réel via node:sqlite): mot de passe / email / sessions ===')

// D'abord admin, comme en prod la première inscription devient... non : en
// prod ALLOW_PUBLIC_REGISTRATION crée toujours un `user` (voir
// worker/lib/authStore.js#registerUser) — on promeut donc manuellement pour
// tester le chemin admin, exactement comme le ferait une administratrice
// via /admin -> Utilisateurs.
const bob = await registerUser(env, { email: 'bob@test.tld', password: 'BobPass1234', name: 'Bob' })
assert(bob.role === 'user', "en prod, l'inscription publique ne crée jamais d'admin")
await sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(bob.id)
const admin = { ...bob, role: 'admin' }

const chloe = await registerUser(env, { email: 'chloe@test.tld', password: 'ChloePass123', name: 'Chloé' })
assert(chloe.sessionVersion === 0, 'nouveau compte : sessionVersion = 0')

const chloeToken1 = createSessionToken(env, chloe)
const sessionCheck1 = await getRequestUser(env, fakeRequest({ cookie: chloeToken1 }))
assert(sessionCheck1?.id === chloe.id, 'session valide juste après inscription')

await assertThrows(
  () => changePassword(env, chloe, { currentPassword: 'Mauvais', newPassword: 'NouveauPass123' }),
  'changePassword refuse un mauvais mot de passe actuel',
  401,
)

const updatedChloe = await changePassword(env, chloe, { currentPassword: 'ChloePass123', newPassword: 'NouveauPass123' })
assert(updatedChloe.sessionVersion === 1, 'changePassword incrémente session_version en base (0 -> 1)')
assert(!('passwordHash' in updatedChloe), 'changePassword ne renvoie jamais passwordHash')

const sessionCheckOld = await getRequestUser(env, fakeRequest({ cookie: chloeToken1 }))
assert(sessionCheckOld === null, "l'ancien jeton (ver=0) est invalidé après changement de mot de passe (session_version=1 en base)")

const chloeToken2 = createSessionToken(env, updatedChloe)
const sessionCheck2 = await getRequestUser(env, fakeRequest({ cookie: chloeToken2 }))
assert(sessionCheck2?.id === chloe.id, 'un nouveau jeton émis après le changement reste valide')

console.log("\n=== PROD: rétrocompatibilité des jetons pré-migration (pas de champ ver) ===")
// Simule un jeton émis AVANT cette fonctionnalité : payload sans `ver`.
function legacyTokenFor(env2, user) {
  const secret = env2.AUTH_SESSION_SECRET
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 1209600 })).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}
// Un compte qui n'a JAMAIS changé son mot de passe a session_version=0 en
// base ; un jeton legacy sans `ver` est traité comme ver=0 -> doit rester
// valide (aucun compte existant déconnecté par la migration 0005).
const dave = await registerUser(env, { email: 'dave@test.tld', password: 'DavePass1234', name: 'Dave' })
const legacyToken = legacyTokenFor(env, dave)
const legacyCheck = await getRequestUser(env, fakeRequest({ cookie: legacyToken }))
assert(legacyCheck?.id === dave.id, "un jeton émis avant la migration (sans `ver`) reste valide tant que le mot de passe n'a pas changé")

console.log('\n=== PROD: mot de passe oublié — jamais de mail sans secret configuré, mais jamais d’erreur non plus ===')
const originalWarn = console.warn
let mailerWarned = false
console.warn = (...args) => {
  if (args.join(' ').includes('RESEND_API_KEY absent')) mailerWarned = true
  originalWarn(...args)
}
await requestPasswordReset(env, { email: 'chloe@test.tld', origin: 'https://woltar-vitrine-rp.example' })
console.warn = originalWarn
assert(mailerWarned, 'sans RESEND_API_KEY, le mailer journalise le mode dégradé (jamais une erreur qui casse la requête)')

// Neutralité : adresse inconnue ne lève rien non plus.
await requestPasswordReset(env, { email: 'personne@test.tld', origin: 'https://woltar-vitrine-rp.example' })
assert(true, "requestPasswordReset sur une adresse inconnue ne lève pas d'erreur (réponse neutre)")

// Récupère le jeton BRUT en interceptant le fetch vers Resend n'ayant pas
// lieu (pas de clé) — donc on lit le hash en base et on ne peut PAS
// retrouver le brut depuis là. On instrumente plutôt sendMail via un
// import dynamique du mailer pour intercepter l'appel : plus simple,
// on relit la table account_tokens juste après l'appel ET on recrée le
// jeton nous-même via un deuxième chemin — impossible sans intercepter.
// Solution retenue : monkey-patch global.fetch (mailer.js utilise fetch
// direct) pour capturer le lien envoyé, sans clé API donc fetch n'est
// JAMAIS appelé — on vérifie plutôt le comportement bout-en-bout via une
// clé API factice pointée vers un petit serveur HTTP local.
import { createServer } from 'node:http'

let capturedBody = null
const mailServer = createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    capturedBody = JSON.parse(raw || '{}')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ id: 'test' }))
  })
})
await new Promise((resolve) => mailServer.listen(0, '127.0.0.1', resolve))
const mailPort = mailServer.address().port

// worker/lib/mailer.js appelle en dur https://api.resend.com/emails — pour
// un test d'intégration sans réseau externe, on redirige via un shim fetch
// global qui réécrit l'URL vers notre serveur local. C'est le SEUL endroit
// où le test ne frappe pas l'URL réelle codée en dur (par design : aucun
// appel réseau sortant réel dans ce sandbox de test).
const realFetch = globalThis.fetch
globalThis.fetch = (url, init) => {
  if (String(url) === 'https://api.resend.com/emails') {
    return realFetch(`http://127.0.0.1:${mailPort}/emails`, init)
  }
  return realFetch(url, init)
}

const envWithMail = { ...env, RESEND_API_KEY: 'test-key', MAIL_FROM: 'Nova-Setia <test@example.com>' }
await requestPasswordReset(envWithMail, { email: 'chloe@test.tld', origin: 'https://woltar-vitrine-rp.example' })
assert(Boolean(capturedBody), 'avec une clé API configurée, le mailer envoie réellement la requête HTTP')
assert(capturedBody?.to === 'chloe@test.tld', 'le mail de reset part vers la bonne adresse')
const resetLinkMatch = String(capturedBody?.text || '').match(/token=([A-Za-z0-9_-]+)/)
const capturedResetToken = resetLinkMatch ? resetLinkMatch[1] : null
assert(Boolean(capturedResetToken), 'le jeton brut de reset est présent dans le lien envoyé')
assert(!JSON.stringify(capturedBody).includes('NouveauPass'), "le corps de l'email ne contient jamais le mot de passe (seulement un lien)")

await assertThrows(
  () => resetPassword(envWithMail, { token: 'jeton-inexistant', newPassword: 'ViaResetPass123' }),
  'resetPassword refuse un jeton inexistant',
  400,
)

await resetPassword(envWithMail, { token: capturedResetToken, newPassword: 'ViaResetPass123' })
const afterReset = await loginUser(envWithMail, { email: 'chloe@test.tld', password: 'ViaResetPass123' })
assert(afterReset.sessionVersion === 2, 'resetPassword incrémente session_version (1 -> 2)')

await assertThrows(
  () => resetPassword(envWithMail, { token: capturedResetToken, newPassword: 'Autre123456' }),
  'un jeton de reset déjà utilisé est refusé (usage unique)',
  400,
)

console.log("\n=== PROD: changement d'adresse email ===")
await assertThrows(
  () =>
    requestEmailChange(envWithMail, afterReset, {
      newEmail: 'chloe2@test.tld',
      currentPassword: 'Mauvais',
      origin: 'https://woltar-vitrine-rp.example',
    }),
  'requestEmailChange refuse un mauvais mot de passe actuel',
  401,
)

await assertThrows(
  () =>
    requestEmailChange(envWithMail, afterReset, {
      newEmail: 'bob@test.tld',
      currentPassword: 'ViaResetPass123',
      origin: 'https://woltar-vitrine-rp.example',
    }),
  'requestEmailChange refuse une adresse déjà utilisée',
  409,
)

capturedBody = null
const pending = await requestEmailChange(envWithMail, afterReset, {
  newEmail: 'chloe2@test.tld',
  currentPassword: 'ViaResetPass123',
  origin: 'https://woltar-vitrine-rp.example',
})
assert(pending.pendingEmail === 'chloe2@test.tld', 'pendingEmail visible immédiatement après la demande')
assert(pending.email === 'chloe@test.tld', "l'email réel ne change pas avant confirmation")
assert(capturedBody?.to === 'chloe2@test.tld', 'le mail de confirmation part vers la NOUVELLE adresse')
const confirmLinkMatch = String(capturedBody?.text || '').match(/token=([A-Za-z0-9_-]+)/)
const capturedConfirmToken = confirmLinkMatch ? confirmLinkMatch[1] : null
assert(Boolean(capturedConfirmToken), 'le jeton brut de confirmation email est présent dans le lien envoyé')

const confirmed = await confirmEmailChange(envWithMail, { token: capturedConfirmToken })
assert(confirmed.email === 'chloe2@test.tld', "confirmEmailChange met à jour l'email réel en base")
assert(!confirmed.pendingEmail, 'pendingEmail nettoyé après confirmation')
assert(confirmed.sessionVersion === 3, 'confirmEmailChange incrémente session_version (2 -> 3)')

await assertThrows(
  () => confirmEmailChange(envWithMail, { token: capturedConfirmToken }),
  'un jeton de confirmation déjà utilisé est refusé',
  400,
)

globalThis.fetch = realFetch
mailServer.close()

console.log("\n=== PROD: admin ne voit jamais de mot de passe / hash ===")
const allUsers = await listPublicUsers(env)
assert(allUsers.length >= 3, 'listPublicUsers (vue admin) retourne bien tous les comptes')
assert(allUsers.every((u) => !('passwordHash' in u)), 'listPublicUsers ne renvoie jamais passwordHash, pour aucun compte')

const adminResetTarget = await registerUser(env, { email: 'eve@test.tld', password: 'EvePass12345', name: 'Eve' })
const beforeAdminReset = adminResetTarget.sessionVersion || 0
const afterAdminReset = await updateUser(env, adminResetTarget.id, { password: 'ImposeParAdmin123' }, admin)
assert(afterAdminReset.sessionVersion === beforeAdminReset + 1, "le reset de mot de passe assisté par l'admin invalide aussi les sessions")
await assertThrows(() => updateUser(env, adminResetTarget.id, { password: 'X' }, chloe), 'updateUser refuse un acteur non-admin', 403)

console.log('\n=== PROD: rate limiting (D1 réel) ===')
const bucket = `test-prod:${Date.now()}`
for (let i = 0; i < 5; i++) {
  await checkRateLimit(env, bucket, { max: 5, windowMs: 60_000 })
}
assert(true, '5 tentatives sous la limite passent')
await assertThrows(() => checkRateLimit(env, bucket, { max: 5, windowMs: 60_000 }), 'la 6e tentative dépasse la limite (429)', 429)

// Fenêtre glissante : après purge simulée (fenêtre très courte), le
// compteur redevient disponible — vérifie que les lignes hors fenêtre sont
// bien purgées par le rate limiter lui-même (pas de job séparé).
const shortBucket = `test-prod-short:${Date.now()}`
await checkRateLimit(env, shortBucket, { max: 1, windowMs: 50 })
await assertThrows(() => checkRateLimit(env, shortBucket, { max: 1, windowMs: 50 }), 'bloqué immédiatement (fenêtre pas encore expirée)', 429)
await new Promise((r) => setTimeout(r, 80))
let afterWindowOk = true
try {
  await checkRateLimit(env, shortBucket, { max: 1, windowMs: 50 })
} catch {
  afterWindowOk = false
}
assert(afterWindowOk, 'une fois la fenêtre expirée, une nouvelle tentative est acceptée (purge automatique)')

console.log('\n=== PROD: intégrité — la migration ne casse aucun compte existant ===')
const daveCheckAgain = await getRequestUser(env, fakeRequest({ cookie: legacyToken }))
assert(daveCheckAgain?.id === dave.id, "le compte Dave (jeton pré-migration) est toujours accessible après tout le reste du test")

console.log(`\n=== PROD RESULTS: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
