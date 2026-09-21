import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { handleAuth } from '../worker/routes/auth.js'

function wrapDb(db) {
  function bound(sql, params = []) {
    return {
      bind(...next) { return bound(sql, next) },
      async run() { return db.prepare(sql).run(...params) },
      async first() { return db.prepare(sql).get(...params) ?? null },
      async all() { return { results: db.prepare(sql).all(...params) } },
    }
  }
  return { prepare: (sql) => bound(sql) }
}

const db = new DatabaseSync(':memory:')
for (const file of readdirSync('migrations').filter((name) => name.endsWith('.sql'))) db.exec(readFileSync(`migrations/${file}`, 'utf8'))
const env = { WOLTAR_DB: wrapDb(db), AUTH_SESSION_SECRET: 'registration-security-test', ALLOW_PUBLIC_REGISTRATION: 'true' }
const request = (body, ip = '198.51.100.10') => new Request('https://test.local/__auth/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
  body: JSON.stringify(body),
})

const first = await handleAuth(request({ name: 'Invited', email: 'invited@test.local', password: 'RegisterPass123' }), env, ['register'])
assert.equal(first.status, 200)
assert.equal((await first.json()).user.role, 'guest')

for (let index = 0; index < 4; index++) {
  const response = await handleAuth(request({ name: `User${index}`, email: `user${index}@test.local`, password: 'RegisterPass123' }), env, ['register'])
  assert.equal(response.status, 200)
}
const sixth = await handleAuth(request({ name: 'Sixth', email: 'sixth@test.local', password: 'RegisterPass123' }), env, ['register'])
assert.equal(sixth.status, 429)

const turnstileEnv = { ...env, TURNSTILE_SECRET: 'turnstile-test-secret' }
const invalid = await handleAuth(request({ name: 'InvalidBot', email: 'invalid-bot@test.local', password: 'RegisterPass123' }, '198.51.100.20'), turnstileEnv, ['register'])
assert.equal(invalid.status, 400)

const originalFetch = globalThis.fetch
globalThis.fetch = async (url) => {
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
try {
  const valid = await handleAuth(request({ name: 'TurnstileUser', email: 'turnstile@test.local', password: 'RegisterPass123', turnstileToken: 'valid-token' }, '198.51.100.21'), turnstileEnv, ['register'])
  assert.equal(valid.status, 200)
  assert.equal((await valid.json()).user.role, 'guest')
} finally {
  globalThis.fetch = originalFetch
  db.close()
}

console.log('Registration security: OK')
