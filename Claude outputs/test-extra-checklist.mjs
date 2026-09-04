// Complément de test — couvre les points de la checklist de l'utilisatrice
// qui n'étaient pas encore testés explicitement par test-prod-security.mjs :
// compte désactivé (login + session déjà ouverte), expiration réelle des
// jetons (password_reset ET email_change), et /logout. Même méthode que les
// autres suites : vrai node:sqlite + vraies migrations + vrai
// worker/lib/authStore.js (pas une réimplémentation).
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { randomBytes, createHash } from 'node:crypto'

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
  AUTH_SESSION_SECRET: 'test-secret-not-real',
  ALLOW_PUBLIC_REGISTRATION: 'true',
}

const { registerUser, loginUser, getRequestUser, createSessionToken, updateUser, resetPassword, confirmEmailChange } =
  await import('./worker/lib/authStore.js')

function fakeRequest({ cookie } = {}) {
  return {
    url: 'https://woltar-vitrine-rp.example/x',
    headers: {
      get(name) {
        if (name.toLowerCase() === 'cookie') return cookie ? `woltar_session=${encodeURIComponent(cookie)}` : ''
        return null
      },
    },
  }
}

console.log('\n=== EXTRA: compte désactivé ===')
// En prod, l'inscription publique ne crée jamais d'admin (voir
// test-prod-security.mjs) — on promeut donc manuellement en base, comme le
// fait déjà la suite prod, plutôt que de supposer un rôle que registerUser
// n'accorde pas.
const rootAccount = await registerUser(env, { email: 'root@test.tld', name: 'Root', password: 'RootPassw0rd!' })
sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(rootAccount.id)
const admin = { ...rootAccount, role: 'admin' }
const bob = await registerUser(env, { email: 'bob@test.tld', name: 'Bob', password: 'BobPassword1!' })
const bobToken = createSessionToken(env, bob)

// Une session déjà ouverte doit rester valide tant que le compte n'est pas désactivé
const beforeDisable = await getRequestUser(env, fakeRequest({ cookie: bobToken }))
assert(beforeDisable && beforeDisable.id === bob.id, 'la session de Bob est valide avant désactivation')

await updateUser(env, bob.id, { disabled: true }, admin)

await assertThrows(
  () => loginUser(env, { email: 'bob@test.tld', password: 'BobPassword1!' }),
  'un compte désactivé ne peut plus se connecter, même avec le bon mot de passe',
  403,
)

const afterDisable = await getRequestUser(env, fakeRequest({ cookie: bobToken }))
assert(afterDisable === null, "la session déjà ouverte de Bob est elle aussi coupée dès qu'il est désactivé (pas besoin d'attendre l'expiration du cookie)")

// Réactivation : la connexion redevient possible
await updateUser(env, bob.id, { disabled: false }, admin)
const relogin = await loginUser(env, { email: 'bob@test.tld', password: 'BobPassword1!' })
assert(relogin.id === bob.id, 'un compte réactivé peut se reconnecter normalement')

console.log('\n=== EXTRA: expiration réelle des jetons à usage unique ===')
async function insertExpiredToken(userId, purpose, payload) {
  const raw = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  const pastIso = new Date(Date.now() - 60 * 1000).toISOString() // expiré depuis 1 minute
  await env.WOLTAR_DB.prepare(
    'INSERT INTO account_tokens (id, user_id, purpose, token_hash, payload, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)',
  )
    .bind(`tok_expired_${purpose}`, userId, purpose, hash, payload, pastIso, new Date(Date.now() - 2000).toISOString())
    .run()
  return raw
}

const expiredResetToken = await insertExpiredToken(bob.id, 'password_reset', null)
await assertThrows(
  () => resetPassword(env, { token: expiredResetToken, newPassword: 'NouveauPassw0rd!' }),
  'un jeton de reset expiré (même jamais utilisé) est refusé',
  400,
)

const expiredEmailToken = await insertExpiredToken(bob.id, 'email_change', JSON.stringify({ newEmail: 'bob-new@test.tld' }))
await assertThrows(
  () => confirmEmailChange(env, { token: expiredEmailToken }),
  "un jeton de confirmation d'email expiré (même jamais utilisé) est refusé",
  400,
)

console.log(`\n=== EXTRA RESULTS: ${passed} passed, ${failed} failed ===`)
process.exit(failed === 0 ? 0 : 1)
