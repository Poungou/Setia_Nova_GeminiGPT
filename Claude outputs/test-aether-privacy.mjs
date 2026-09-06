import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { handleAether } from '../worker/routes/aether.js'
import { buildAetherSystemPrompt } from '../plugins/lib/aetherPrompt.js'
import { IMAGE_UNAVAILABLE, isImageRequest } from '../plugins/lib/aetherPolicy.js'

test('Aether Worker: text only, no transcripts in D1, logs or Responses storage', async () => {
  const db = new DatabaseSync(':memory:')
  for (const file of readdirSync('migrations').filter((name) => name.endsWith('.sql'))) db.exec(readFileSync(`migrations/${file}`, 'utf8'))
  const statements = []
  const statement = (sql, values = []) => ({
    bind: (...args) => statement(sql, args),
    all: async () => { statements.push(sql); return { results: db.prepare(sql).all(...values) } },
    first: async () => { statements.push(sql); return db.prepare(sql).get(...values) },
    run: async () => { throw new Error('Aether must never write D1') },
  })
  db.prepare('INSERT INTO characters (id, owner_user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('secret-draft', 'system', JSON.stringify({ firstName: 'PRIVATE_DRAFT', visibility: 'draft' }), '', '')
  const env = { WOLTAR_DB: { prepare: (sql) => statement(sql) }, OPENAI_API_KEY: 'fake-private-key' }
  const originalFetch = globalThis.fetch
  const originalError = console.error
  const logs = []
  const calls = []
  console.error = (...args) => logs.push(args)
  const request = (payload) => new Request('https://test.local/__aether/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), 'https://api.openai.com/v1/responses')
      calls.push(JSON.parse(init.body))
      return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'PRIVATE_REPLY' }] }] }), { headers: { 'Content-Type': 'application/json' } })
    }
    const response = await handleAether(request({ messages: [{ role: 'system', content: 'PRIVATE_MESSAGE' }], tools: [{ type: 'image_generation' }], store: true }), env, ['chat'])
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.deepEqual(await response.json(), { reply: 'PRIVATE_REPLY' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].store, false)
    assert.equal(calls[0].background, false)
    assert.deepEqual(calls[0].tools, [])
    assert.equal(calls[0].tool_choice, 'none')
    assert.deepEqual(calls[0].text, { format: { type: 'text' } })
    assert.equal(calls[0].input[0].role, 'user')
    assert(!calls[0].instructions.includes('PRIVATE_DRAFT'))
    assert(!JSON.stringify(statements).includes('PRIVATE_MESSAGE'))
    const image = await handleAether(request({ messages: [{ role: 'user', content: 'Génère une image de ce personnage' }] }), env, ['chat'])
    assert.deepEqual(await image.json(), { reply: IMAGE_UNAVAILABLE })
    assert.equal(calls.length, 1, 'image request never reaches OpenAI')
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'PRIVATE_MESSAGE PRIVATE_REPLY fake-private-key', code: 'PRIVATE_MESSAGE' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const failure = await handleAether(request({ messages: [{ role: 'user', content: 'PRIVATE_MESSAGE' }] }), env, ['chat'])
    assert.equal(failure.status, 502)
    assert(!JSON.stringify(await failure.json()).includes('PRIVATE_'))
    assert(!JSON.stringify(logs).includes('PRIVATE_'))
    assert(!JSON.stringify(logs).includes('fake-private-key'))
    for (const route of ['history', 'conversations', 'transcripts']) {
      assert.equal((await handleAether(request({}), env, [route])).status, 404)
    }
    assert.equal((await handleAether(request({ messages: [{ content: 'hello' }], testMode: true }), env, ['chat'])).status, 403)
  } finally { globalThis.fetch = originalFetch; console.error = originalError; db.close() }
})

test('Context rejects drafts/private records even if supplied directly; image refusals in French and English', () => {
  const secret = { id: 'private', firstName: 'HIDDEN', name: 'HIDDEN', visibility: 'draft', shortDescription: 'HIDDEN' }
  const prompt = buildAetherSystemPrompt({ config: {}, characters: [secret], clans: [secret], locations: [secret], context: { characterId: secret.id } })
  assert(!prompt.includes('HIDDEN'))
  for (const content of ['Crée un portrait', 'Retouche cette photo', 'Generate a picture', 'Dessine un avatar']) assert(isImageRequest([{ role: 'user', content }]))
  assert(!isImageRequest([{ role: 'user', content: 'Quel personnage aime la photo ?' }]))
})

test('Development also enforces the shared request policy and has no transcript storage', () => {
  const source = readFileSync('plugins/woltar-aether.js', 'utf8')
  assert(source.includes('textOnlyRequest({ model, instructions: system, input: trimmed })'))
  assert(source.includes("logLevel: 'off'"))
  assert(source.includes('if (isImageRequest(trimmed)) return send(200, { reply: IMAGE_UNAVAILABLE })'))
  assert(!/writeFile|appendFile|console\.(?:log|error)\([^\n]*(?:err\?|messages|reply)/.test(source))
})
