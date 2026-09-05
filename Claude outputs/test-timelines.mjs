// Claude outputs/test-timelines.mjs
//
// Intégration réelle (mêmes handlers que le Worker de production, SQLite en
// mémoire au lieu de D1 — voir wrapDb ci-dessous et test-player-profiles.mjs
// pour la méthodologie) pour la refonte « chronologies communautaires » :
//   - CRUD backend d'une chronologie de compte (collection `timelines`)
//   - permissions (create_timeline) et propriété (une RPiste ne peut modifier
//     que ses propres chronologies ; une admin modère tout)
//   - persistance du drapeau spoiler
//   - repli de la chronologie canon Nakamura sur src/data/events.json tant
//     qu'elle n'a pas son propre tableau `events` en D1
//   - visibilité publique (brouillon vs publié)
//   - normalisation des événements embarqués (src/lib/timelineEvents.js)
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

let passed = 0
let failed = 0
function assert(condition, label) {
  if (condition) {
    passed++
    console.log(`  OK  ${label}`)
  } else {
    failed++
    console.error(`  FAIL ${label}`)
  }
}

function wrapDb(db) {
  function bound(sql, params = []) {
    return {
      sql,
      params,
      bind(...next) {
        return bound(sql, next)
      },
      async run() {
        db.prepare(sql).run(...params)
      },
      async first() {
        return db.prepare(sql).get(...params) ?? null
      },
      async all() {
        return { results: db.prepare(sql).all(...params) }
      },
    }
  }
  return {
    prepare: (sql) => bound(sql),
    async batch(statements) {
      db.exec('BEGIN')
      try {
        for (const statement of statements) db.prepare(statement.sql).run(...statement.params)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
}

const db = new DatabaseSync(':memory:')
for (const file of [
  'migrations/0001_init.sql',
  'migrations/0002_deprecate_personas.sql',
  'migrations/0003_creator_profile_and_character_image_meta.sql',
  'migrations/0004_clans_and_members.sql',
  'migrations/0005_account_security.sql',
  'migrations/0006_user_permissions_and_locations.sql',
  'migrations/0007_optional_user_email.sql',
  'migrations/0008_user_profiles.sql',
  'migrations/0010_user_posts.sql',
  'migrations/0011_player_profile_characters.sql',
  'migrations/0012_timelines.sql',
]) {
  db.exec(readFileSync(file, 'utf8'))
}

const env = { WOLTAR_DB: wrapDb(db), AUTH_SESSION_SECRET: 'timelines-test', ALLOW_PUBLIC_REGISTRATION: 'true' }

const { handleAuth } = await import('../worker/routes/auth.js')
const { handlePublic } = await import('../worker/routes/public.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { loginUser, createSessionToken } = await import('../worker/lib/authStore.js')
const { normalizeTimelineEvents } = await import('../src/lib/timelineEvents.js')
const staticTimelines = JSON.parse(readFileSync('src/data/timelines.json', 'utf8'))
const staticEvents = JSON.parse(readFileSync('src/data/events.json', 'utf8'))

function request(path, method = 'GET', body, cookie = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = `woltar_session=${encodeURIComponent(cookie)}`
  return new Request(`https://test.local${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function register(email, name) {
  const response = await handleAuth(request('/__auth/api/register', 'POST', { email, name, password: 'TimelinePass123' }), env, ['register'])
  return (await response.json()).user
}

async function sessionFor(name) {
  return createSessionToken(env, await loginUser(env, { identifier: name, password: 'TimelinePass123' }))
}

async function grantPermission(adminSession, userId, permission) {
  return handleAuth(request(`/__auth/api/users/${userId}`, 'PATCH', { permissions: { [permission]: true } }, adminSession), env, ['users', userId])
}

// --- Comptes de test -------------------------------------------------------

const poungou = await register('poungou-timelines@test.local', 'Poungou')
db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(poungou.id)
const adminSession = await sessionFor('Poungou')

const rina = await register('rina-timelines@test.local', 'Rina')
const emy = await register('emy-timelines@test.local', 'Emy')

// --- 1. Permission requise pour créer -------------------------------------

const deniedCreate = await handleAccount(
  request('/__account/api/collections/timelines', 'POST', { title: 'Carnets de Rina' }, await sessionFor('Rina')),
  env,
  ['collections', 'timelines'],
)
assert(deniedCreate.status === 403, 'sans la permission create_timeline, la création est refusée')

const grantRina = await grantPermission(adminSession, rina.id, 'create_timeline')
assert(grantRina.status === 200, 'admin accorde create_timeline à Rina')
const grantEmy = await grantPermission(adminSession, emy.id, 'create_timeline')
assert(grantEmy.status === 200, 'admin accorde create_timeline à Emy')

const rinaSession = await sessionFor('Rina')
const emySession = await sessionFor('Emy')

// --- 2. Une chronologie canon ne peut pas être détournée --------------------

const canonClash = await handleAccount(
  request('/__account/api/collections/timelines', 'POST', { id: 'nakamura', title: 'Usurpation', visibility: 'draft' }, rinaSession),
  env,
  ['collections', 'timelines'],
)
assert(canonClash.status === 409, 'impossible de créer une chronologie avec l’id canon "nakamura"')

// --- 3. Création par une RPiste, brouillon par défaut -----------------------

const created = await handleAccount(
  request(
    '/__account/api/collections/timelines',
    'POST',
    {
      id: 'carnets-de-rina',
      title: 'Carnets de Rina',
      description: 'Notes personnelles de Rina.',
      visibility: 'draft',
      spoiler: true,
      characters: [],
      events: [
        { title: 'Premier jour', dateRP: 'An 1', description: 'Un début.', characters: [], locations: [] },
        { id: 'evt-perso', title: 'Un secret', dateRP: 'An 2', description: 'Un secret gardé.', importance: 'majeur' },
      ],
    },
    rinaSession,
  ),
  env,
  ['collections', 'timelines'],
)
const createdBody = await created.json()
assert(created.status === 200, 'Rina crée sa chronologie')
assert(createdBody.row.ownerUserId === rina.id, 'la chronologie créée appartient à Rina')
assert(createdBody.row.spoiler === true, 'le drapeau spoiler est conservé tel quel (true)')
assert(createdBody.row.events.length === 2, 'les deux événements sont enregistrés')
assert(createdBody.row.events[0].order === 10 && createdBody.row.events[1].order === 20, 'l’ordre des événements est déduit de leur position (10, 20, ...)')
assert(createdBody.row.events[1].id === 'evt-perso', 'un id d’événement explicite est conservé')
assert(typeof createdBody.row.events[0].id === 'string' && createdBody.row.events[0].id.length > 0, 'un id d’événement manquant est déduit automatiquement (slug du titre)')

// --- 4. Visibilité publique : brouillon invisible, publié visible ----------

const publicWhileDraft = await handlePublic(request('/__public/api/timelines'), env, ['timelines'])
assert(!(await publicWhileDraft.json()).data.some((t) => t.id === 'carnets-de-rina'), 'une chronologie en brouillon n’apparaît pas publiquement')
assert((await handlePublic(request('/__public/api/timelines/carnets-de-rina'), env, ['timelines', 'carnets-de-rina'])).status === 404, 'la fiche d’une chronologie en brouillon renvoie 404 en public')

const published = await handleAccount(
  request('/__account/api/collections/timelines/carnets-de-rina', 'PUT', { ...createdBody.row, visibility: 'published' }, rinaSession),
  env,
  ['collections', 'timelines', 'carnets-de-rina'],
)
assert(published.status === 200 && (await published.clone().json()).row.visibility === 'published', 'Rina publie sa chronologie')

const publicPublished = await handlePublic(request('/__public/api/timelines'), env, ['timelines'])
assert((await publicPublished.json()).data.some((t) => t.id === 'carnets-de-rina'), 'une fois publiée, la chronologie apparaît publiquement')
const publicOne = await handlePublic(request('/__public/api/timelines/carnets-de-rina'), env, ['timelines', 'carnets-de-rina'])
assert(publicOne.status === 200 && (await publicOne.json()).data.spoiler === true, 'la fiche publique conserve le drapeau spoiler')

// --- 5. Propriété : Emy ne peut ni voir ni modifier la chronologie de Rina --

const emyBootstrap = await handleAccount(request('/__account/api/bootstrap'), env, ['bootstrap'])
// (appelé sans session : doit échouer, vérifié ci-dessous à la place d’un
// appel authentifié — la ligne suivante fait le vrai test avec la session
// d’Emy.)
assert(emyBootstrap.status === 401, 'bootstrap exige une session')

const emyBootstrapAuthed = await handleAccount(request('/__account/api/bootstrap', 'GET', undefined, emySession), env, ['bootstrap'])
const emyData = (await emyBootstrapAuthed.json()).data
assert(!emyData.timelines.some((t) => t.id === 'carnets-de-rina'), 'Emy ne voit pas la chronologie de Rina dans son propre espace')

const emyEditAttempt = await handleAccount(
  request('/__account/api/collections/timelines/carnets-de-rina', 'PUT', { title: 'Détournée' }, emySession),
  env,
  ['collections', 'timelines', 'carnets-de-rina'],
)
assert(emyEditAttempt.status === 403, 'Emy ne peut pas modifier la chronologie de Rina')

const emyDeleteAttempt = await handleAccount(
  request('/__account/api/collections/timelines/carnets-de-rina', 'DELETE', undefined, emySession),
  env,
  ['collections', 'timelines', 'carnets-de-rina'],
)
assert(emyDeleteAttempt.status === 403, 'Emy ne peut pas supprimer la chronologie de Rina')

// --- 6. Modération admin : une admin voit et modifie tout -------------------

const adminBootstrap = await handleAccount(request('/__account/api/bootstrap', 'GET', undefined, adminSession), env, ['bootstrap'])
const adminData = (await adminBootstrap.json()).data
assert(adminData.timelines.some((t) => t.id === 'carnets-de-rina'), 'l’admin voit la chronologie de Rina en modération')

const adminEdit = await handleAccount(
  request('/__account/api/collections/timelines/carnets-de-rina', 'PUT', { ...createdBody.row, visibility: 'published', description: 'Modéré par admin.' }, adminSession),
  env,
  ['collections', 'timelines', 'carnets-de-rina'],
)
assert(adminEdit.status === 200 && (await adminEdit.clone().json()).row.description === 'Modéré par admin.', 'l’admin peut modifier la chronologie de Rina')

// --- 7. Chronologie canon Nakamura : repli sur events.json -----------------

const publicNakamura = await handlePublic(request('/__public/api/timelines/nakamura'), env, ['timelines', 'nakamura'])
const nakamuraBody = (await publicNakamura.json()).data
assert(publicNakamura.status === 200, 'la chronologie canon "nakamura" est accessible publiquement')
assert(nakamuraBody.title === staticTimelines.find((t) => t.id === 'nakamura').title, 'le titre canon est conservé (src/data/timelines.json)')
assert(nakamuraBody.events.length === staticEvents.length, 'les événements canon proviennent bien de src/data/events.json (repli, aucune duplication)')
assert(nakamuraBody.events.every((e, i, arr) => i === 0 || (arr[i - 1].order ?? 0) <= (e.order ?? 0)), 'les événements canon restent triés par order')

const publicList = await handlePublic(request('/__public/api/timelines'), env, ['timelines'])
const listBody = (await publicList.json()).data
assert(listBody.some((t) => t.id === 'nakamura'), 'la chronologie canon apparaît dans la liste publique')
assert(listBody.some((t) => t.id === 'carnets-de-rina'), 'une chronologie de compte publiée coexiste avec la chronologie canon')

// Un compte, même admin, ne peut pas créer de ligne D1 pour l’id canon — la
// chronologie canon Nakamura reste éditable uniquement via /admin (fichiers
// statiques), jamais via /compte.
const adminCanonClash = await handleAccount(
  request('/__account/api/collections/timelines', 'POST', { id: 'nakamura', title: 'Nakamura bis' }, adminSession),
  env,
  ['collections', 'timelines'],
)
assert(adminCanonClash.status === 409, 'même une admin ne peut pas créer une chronologie de compte sur l’id canon "nakamura"')

// --- 8. Normalisation des événements (src/lib/timelineEvents.js) ----------

const normalized = normalizeTimelineEvents([
  { title: 'Un événement', dateRP: 'An 5', characters: ['kazuko-nakamura', 42, '', 'kazuko-nakamura'], locations: [null, 'manoir-de-setia'], importance: 'inconnu' },
  { id: 'un-evenement', title: 'Collision d’id' },
])
assert(normalized[0].characters.length === 1 && normalized[0].characters[0] === 'kazuko-nakamura', 'les références de personnages invalides/dupliquées sont nettoyées')
assert(normalized[0].locations.length === 1 && normalized[0].locations[0] === 'manoir-de-setia', 'les références de lieux invalides sont retirées')
assert(normalized[0].importance === '', 'une importance hors énumération (majeur/mineur) est réinitialisée')
assert(normalized[0].id === 'un-evenement' && normalized[1].id === 'un-evenement-2', 'deux événements dont l’id se recoupe reçoivent des ids distincts')

// --- 9. Suppression : Rina retire sa propre chronologie ---------------------

const rinaDelete = await handleAccount(
  request('/__account/api/collections/timelines/carnets-de-rina', 'DELETE', undefined, rinaSession),
  env,
  ['collections', 'timelines', 'carnets-de-rina'],
)
assert(rinaDelete.status === 200, 'Rina supprime sa propre chronologie')
const publicAfterDelete = await handlePublic(request('/__public/api/timelines'), env, ['timelines'])
assert(!(await publicAfterDelete.json()).data.some((t) => t.id === 'carnets-de-rina'), 'la chronologie supprimée disparaît de l’API publique')
assert((await handlePublic(request('/__public/api/timelines'), env, ['timelines']).then((r) => r.json())).data.some((t) => t.id === 'nakamura'), 'la chronologie canon reste intacte après la suppression de celle de Rina')

console.log(`\n${passed} OK, ${failed} FAIL`)
if (failed) process.exitCode = 1

// Exercise the actual accordion state, with animation disabled for DOM tests.
const { JSDOM } = await import('jsdom')
const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local' })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { build } = await import('esbuild')
const fs = await import('node:fs')
const path = await import('node:path')
const { pathToFileURL } = await import('node:url')
const cache = path.resolve('node_modules/.cache')
fs.mkdirSync(cache, { recursive: true })
const temporary = fs.mkdtempSync(path.join(cache, 'timelines-ui-'))
const originalFetch = globalThis.fetch
try {
  await build({ entryPoints: ['src/pages/Chronology/Chronology.jsx'], outfile: path.join(temporary, 'page.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', loader: { '.css': 'empty' }, jsx: 'automatic', plugins: [{ name: 'disable-animation', setup(builder) {
    builder.onResolve({ filter: /framer-motion|PageTransition\/PageTransition|Reveal\/Reveal/ }, (args) => ({ path: args.path, namespace: 'test-animation' }))
    builder.onLoad({ filter: /.*/, namespace: 'test-animation' }, () => ({ contents: "import React from 'react'; export default function Wrapper({children}){return children}; export const AnimatePresence=Wrapper; export const useReducedMotion=()=>true; export const motion={div:({children,id,role,className,'aria-labelledby':label})=>React.createElement('div',{id,role,className,'aria-labelledby':label},children)};", loader: 'js', resolveDir: process.cwd() }))
  } }] })
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter } = await import('react-router-dom')
  const { default: Chronology } = await import(pathToFileURL(path.join(temporary, 'page.mjs')))
  globalThis.fetch = async (url) => ({ ok: true, json: async () => ({ data: String(url).endsWith('/timelines') ? [{ id: 'a', title: 'A', spoiler: true, events: [{ id: 'e', title: 'Hidden event' }] }, { id: 'b', title: 'B', events: [] }] : [] }) })
  const root = createRoot(document.getElementById('root'))
  await React.act(async () => root.render(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Chronology))))
  const trigger = (id) => document.getElementById('chrono-header-' + id)
  await React.act(async () => trigger('a').click())
  assert(trigger('a').getAttribute('aria-expanded') === 'true', 'une chronologie peut ?tre ouverte')
  assert(!document.body.textContent.includes('Hidden event'), 'le contenu spoiler reste masqu?')
  await React.act(async () => document.querySelector('.spoiler-gate__btn').click())
  assert(document.body.textContent.includes('Hidden event'), 'la confirmation r?v?le les ?v?nements')
  await React.act(async () => trigger('a').click())
  assert(trigger('a').getAttribute('aria-expanded') === 'false', 'fermer ne r?ouvre pas automatiquement la premi?re chronologie')
  await React.act(async () => trigger('a').click())
  assert(Boolean(document.querySelector('.spoiler-gate__btn')), 'r?ouvrir restaure la protection spoiler')
  await React.act(async () => trigger('b').click())
  assert(trigger('b').getAttribute('aria-expanded') === 'true' && trigger('a').getAttribute('aria-expanded') === 'false', 'une seule chronologie reste ouverte')
  await React.act(async () => root.unmount())
} finally {
  globalThis.fetch = originalFetch
  dom.window.close()
  if (path.dirname(temporary) !== cache || !path.basename(temporary).startsWith('timelines-ui-')) throw new Error('Unsafe cleanup path')
  fs.rmSync(temporary, { recursive: true, force: true })
}
console.log(passed + ' assertions passed, ' + failed + ' failed')
if (failed) process.exitCode = 1
