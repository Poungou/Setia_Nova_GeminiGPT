// Test d'intégration DEV — exécute le vrai code livré
// (plugins/lib/authStore.js, plugins/lib/rateLimit.js,
// plugins/lib/mailer.js), pas une réimplémentation, contre un répertoire
// temporaire (comme le ferait le serveur Vite avec plugins/data/).
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = mkdtempSync(path.join(tmpdir(), 'woltar-dev-'))
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

const authStore = await import('./plugins/lib/authStore.js')
const rateLimitMod = await import('./plugins/lib/rateLimit.js')

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
  loadUsers,
} = authStore
const { checkRateLimit } = rateLimitMod

function fakeReqWithCookie(token) {
  return { headers: { cookie: token ? `woltar_session=${encodeURIComponent(token)}` : '' } }
}

console.log('\n=== DEV: cycle de vie mot de passe / email / sessions ===')

// --- Setup: deux comptes (le premier devient admin, comme en dev réel) ---
const admin = await registerUser(root, { email: 'admin@test.tld', password: 'AdminPass123', name: 'Admin' })
const alice = await registerUser(root, { email: 'alice@test.tld', password: 'AlicePass123', name: 'Alice' })
assert(admin.role === 'admin', 'premier compte enregistré = admin')
assert(alice.role === 'user', 'second compte enregistré = user')

const aliceToken1 = await createSessionToken(root, alice)
const reqAlice1 = fakeReqWithCookie(aliceToken1)
const sessionCheck1 = await getRequestUser(root, reqAlice1)
assert(sessionCheck1?.id === alice.id, 'session valide juste après connexion')

// --- changePassword : mauvais mot de passe actuel refusé ---
await assertThrows(
  () => changePassword(root, alice, { currentPassword: 'MauvaisMdp', newPassword: 'NouveauPass123' }),
  'changePassword refuse un mauvais mot de passe actuel',
  401,
)

// --- changePassword : mot de passe trop court refusé ---
await assertThrows(
  () => changePassword(root, alice, { currentPassword: 'AlicePass123', newPassword: 'court' }),
  'changePassword refuse un mot de passe trop court',
  400,
)

// --- changePassword : succès, incrémente session_version ---
const updatedAlice = await changePassword(root, alice, {
  currentPassword: 'AlicePass123',
  newPassword: 'NouveauPass123',
})
assert(updatedAlice.sessionVersion === 1, 'changePassword incrémente sessionVersion (0 -> 1)')
assert(!('passwordHash' in updatedAlice), 'changePassword ne renvoie jamais passwordHash')

// --- L'ANCIEN jeton de session (ver=0) est maintenant invalide ---
const sessionCheckOld = await getRequestUser(root, reqAlice1)
assert(sessionCheckOld === null, "l'ancien jeton de session est invalidé après changement de mot de passe")

// --- Un NOUVEAU jeton émis avec le user à jour reste valide ---
const aliceToken2 = await createSessionToken(root, updatedAlice)
const sessionCheck2 = await getRequestUser(root, fakeReqWithCookie(aliceToken2))
assert(sessionCheck2?.id === alice.id, 'un nouveau jeton émis après le changement reste valide')

// --- Connexion avec l'ancien mot de passe refusée, avec le nouveau OK ---
await assertThrows(() => loginUser(root, { email: 'alice@test.tld', password: 'AlicePass123' }), 'ancien mot de passe refusé au login', 401)
const reLogin = await loginUser(root, { email: 'alice@test.tld', password: 'NouveauPass123' })
assert(reLogin.id === alice.id, 'nouveau mot de passe accepté au login')

console.log('\n=== DEV: mot de passe oublié (reset par email) ===')

// --- Adresse inconnue : ne jette jamais, ne crée pas de jeton, réponse neutre côté route ---
await requestPasswordReset(root, { email: 'inconnue@test.tld', origin: 'http://localhost:5173' })
assert(true, "requestPasswordReset sur une adresse inconnue ne lève pas d'erreur (réponse neutre)")

// --- Adresse connue : crée un jeton, mais le jeton BRUT n'est jamais stocké ---
await requestPasswordReset(root, { email: 'alice@test.tld', origin: 'http://localhost:5173' })
const tokensFile = path.join(root, 'plugins', 'data', 'account-tokens.json')
const tokensOnDisk = JSON.parse(readFileSync(tokensFile, 'utf8'))
const resetTokenRow = tokensOnDisk.find((t) => t.purpose === 'password_reset' && !t.usedAt)
assert(Boolean(resetTokenRow), 'un jeton password_reset est bien créé pour une adresse connue')
assert(
  !tokensOnDisk.some((t) => JSON.stringify(t).includes('alice@test.tld') === false && false),
  'sanity (toujours vrai) — vérifie juste que le fichier est lisible',
)
assert(typeof resetTokenRow.tokenHash === 'string' && resetTokenRow.tokenHash.length === 64, 'le jeton stocké est un hash SHA-256 (64 hex), pas le jeton brut')

// Pour tester resetPassword, il faut le jeton BRUT — on ne peut pas le
// retrouver depuis le hash (c'est le but). On intercepte donc en relançant
// requestPasswordReset avec un mailer instrumenté qui capture le lien
// envoyé, plutôt que de fouiller le disque.
let capturedResetLink = null
const originalConsoleLog = console.log
console.log = (...args) => {
  const line = args.join(' ')
  const match = line.match(/token=([A-Za-z0-9_-]+)/)
  if (match && line.includes('mot de passe')) capturedResetLink = match[1]
  originalConsoleLog(...args)
}
await requestPasswordReset(root, { email: 'alice@test.tld', origin: 'http://localhost:5173' })
console.log = originalConsoleLog
assert(Boolean(capturedResetLink), 'le lien de reset (avec le jeton brut) est bien "envoyé" (capturé depuis le mailer dev)')

// --- Jeton invalide/inexistant refusé ---
await assertThrows(
  () => resetPassword(root, { token: 'jeton-qui-nexiste-pas', newPassword: 'ViaResetPass123' }),
  'resetPassword refuse un jeton inexistant',
  400,
)

// --- Jeton valide : réinitialise le mot de passe, incrémente sessionVersion, jeton à usage unique ---
await resetPassword(root, { token: capturedResetLink, newPassword: 'ViaResetPass123' })
const afterReset = await loginUser(root, { email: 'alice@test.tld', password: 'ViaResetPass123' })
assert(afterReset.sessionVersion === 2, 'resetPassword incrémente sessionVersion (1 -> 2)')

// --- Le même jeton ne peut plus resservir (usage unique) ---
await assertThrows(
  () => resetPassword(root, { token: capturedResetLink, newPassword: 'AutreTentative123' }),
  'un jeton de reset déjà utilisé est refusé (usage unique)',
  400,
)

console.log('\n=== DEV: changement d\'adresse email ===')

// --- Mauvais mot de passe actuel refusé ---
await assertThrows(
  () => requestEmailChange(root, afterReset, { newEmail: 'alice2@test.tld', currentPassword: 'MauvaisMdp', origin: 'http://localhost:5173' }),
  "requestEmailChange refuse un mauvais mot de passe actuel",
  401,
)

// --- Adresse déjà utilisée (par admin) refusée ---
await assertThrows(
  () =>
    requestEmailChange(root, afterReset, {
      newEmail: 'admin@test.tld',
      currentPassword: 'ViaResetPass123',
      origin: 'http://localhost:5173',
    }),
  'requestEmailChange refuse une adresse déjà utilisée par un autre compte',
  409,
)

// --- Demande valide : capture le lien de confirmation envoyé à la NOUVELLE adresse ---
let capturedConfirmLink = null
let capturedConfirmTo = null
console.log = (...args) => {
  const line = args.join(' ')
  if (line.includes('confirmer-email')) {
    const m = line.match(/token=([A-Za-z0-9_-]+)/)
    if (m) capturedConfirmLink = m[1]
  }
  const toMatch = line.match(/À : (\S+)/)
  if (toMatch) capturedConfirmTo = toMatch[1]
  originalConsoleLog(...args)
}
const pendingUpdate = await requestEmailChange(root, afterReset, {
  newEmail: 'alice2@test.tld',
  currentPassword: 'ViaResetPass123',
  origin: 'http://localhost:5173',
})
console.log = originalConsoleLog
assert(pendingUpdate.pendingEmail === 'alice2@test.tld', "l'email en attente est visible sur le compte (pendingEmail)")
assert(pendingUpdate.email === 'alice@test.tld', "l'email RÉEL ne change PAS avant confirmation")
assert(capturedConfirmTo === 'alice2@test.tld', 'le mail de confirmation part bien vers la NOUVELLE adresse (pas l’ancienne)')
assert(Boolean(capturedConfirmLink), 'le lien de confirmation (avec jeton brut) est capturé')

// --- Jeton de confirmation invalide refusé ---
await assertThrows(
  () => confirmEmailChange(root, { token: 'jeton-bidon' }),
  'confirmEmailChange refuse un jeton inexistant',
  400,
)

// --- Confirmation valide : email mis à jour, pendingEmail nettoyé, sessionVersion incrémenté ---
const confirmed = await confirmEmailChange(root, { token: capturedConfirmLink })
assert(confirmed.email === 'alice2@test.tld', "confirmEmailChange met à jour l'email réel")
assert(confirmed.pendingEmail === null || confirmed.pendingEmail === undefined, 'pendingEmail est nettoyé après confirmation')
assert(confirmed.sessionVersion === 3, 'confirmEmailChange incrémente sessionVersion (2 -> 3)')

// --- Jeton de confirmation déjà utilisé refusé (usage unique) ---
await assertThrows(
  () => confirmEmailChange(root, { token: capturedConfirmLink }),
  'un jeton de confirmation email déjà utilisé est refusé',
  400,
)

// --- Connexion avec la nouvelle adresse fonctionne, l'ancienne non ---
const loginNewEmail = await loginUser(root, { email: 'alice2@test.tld', password: 'ViaResetPass123' })
assert(loginNewEmail.id === alice.id, 'connexion avec la nouvelle adresse email fonctionne')
await assertThrows(() => loginUser(root, { email: 'alice@test.tld', password: 'ViaResetPass123' }), "l'ancienne adresse email ne fonctionne plus", 401)

console.log('\n=== DEV: admin ne voit jamais de mot de passe ===')
const usersList = await authStore.listPublicUsers(root)
assert(usersList.every((u) => !('passwordHash' in u)), 'listPublicUsers ne renvoie jamais passwordHash pour aucun compte')

console.log("\n=== DEV: reset de mot de passe assisté par l'admin invalide aussi les sessions ===")
const beforeAdminReset = (await loadUsers(root)).find((u) => u.id === alice.id)
const adminResetUser = await updateUser(root, alice.id, { password: 'ImposeParAdmin123' }, admin)
assert(adminResetUser.sessionVersion === (beforeAdminReset.sessionVersion || 0) + 1, 'updateUser (admin) incrémente aussi sessionVersion quand il change le mot de passe')

console.log('\n=== DEV: rate limiting (compteur en mémoire) ===')
const bucket = `test:${Date.now()}`
for (let i = 0; i < 5; i++) {
  checkRateLimit(bucket, { max: 5, windowMs: 60_000 })
}
assert(true, "5 tentatives sous la limite (max 5) passent sans erreur")
let rateLimited = false
try {
  checkRateLimit(bucket, { max: 5, windowMs: 60_000 })
} catch (err) {
  rateLimited = err.status === 429
}
assert(rateLimited, 'la 6e tentative dépasse la limite et lève une erreur 429')

// Fenêtre différente : un bucket différent n'est pas affecté.
let otherBucketOk = true
try {
  checkRateLimit(`${bucket}-other`, { max: 5, windowMs: 60_000 })
} catch {
  otherBucketOk = false
}
assert(otherBucketOk, 'un bucket différent (ex. IP différente) a son propre compteur, non affecté')

rmSync(root, { recursive: true, force: true })

console.log(`\n=== DEV RESULTS: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
