// Rôles, droits précis, modération et signalements (migration 0014).
//
// Vérifie côté Worker (jamais côté navigateur) :
//   - la migration, depuis une base vide ET depuis des données existantes
//   - un invité ne crée rien ; un créateur ne se publie pas lui-même
//   - un créateur n'appelle pas les routes admin
//   - un droit retiré est refusé par le serveur
//   - draft / pending / needs_changes / hidden n'apparaissent jamais en public
//   - le contenu canon ne passe jamais par le circuit
//   - hiérarchie des rôles (jamais d'attribution du rôle admin par l'API)
//   - signalements : Origin, validation, limitation par IP
import { DatabaseSync } from 'node:sqlite'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let passed = 0
let failed = 0
function assert(condition, label) {
  if (condition) { passed++; console.log(`  OK  ${label}`) }
  else { failed++; console.error(`  FAIL ${label}`) }
}

function wrapDb(db) {
  function bound(sql, params = []) {
    return {
      sql,
      params,
      bind(...next) { return bound(sql, next) },
      async run() { db.prepare(sql).run(...params); return { success: true } },
      async first() { return db.prepare(sql).get(...params) ?? null },
      async all() { return { results: db.prepare(sql).all(...params) } },
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

const MIGRATIONS = readdirSync('migrations').filter((file) => file.endsWith('.sql')).sort()
const ROLE_OF = (db, id) => db.prepare('SELECT role FROM users WHERE id = ?').get(id)?.role

// --- 1. Migration depuis une base vide ---------------------------------------
console.log('Migration : base vide')
const empty = new DatabaseSync(':memory:')
for (const file of MIGRATIONS) empty.exec(readFileSync(`migrations/${file}`, 'utf8'))
const cols = (table) => empty.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
assert(MIGRATIONS.at(-1) === '0014_roles_moderation.sql', 'la dernière migration est 0014')
assert(['characters', 'clans', 'locations', 'posts', 'timelines'].every((t) => ['review_status', 'review_note', 'submitted_at', 'reviewed_at', 'reviewed_by'].every((c) => cols(t).includes(c))), 'les 5 tables de contenu portent les colonnes review_*')
assert(cols('user_revoked_rights').includes('right_key') && cols('content_reports').includes('handled_by'), 'user_revoked_rights et content_reports existent')

// --- 2. Migration depuis des données existantes ------------------------------
console.log('Migration : données existantes')
const old = new DatabaseSync(':memory:')
for (const file of MIGRATIONS.filter((f) => f < '0014')) old.exec(readFileSync(`migrations/${file}`, 'utf8'))
const stamp = '2026-01-01T00:00:00Z'
const addUser = (id, role, status) => old.prepare('INSERT INTO users (id, email, name, role, status, disabled, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)').run(id, `${id}@x.test`, id, role, status, 'h', stamp, stamp)
addUser('admin1', 'admin', 'Membre'); addUser('rpiste', 'user', 'RPiste'); addUser('membre', 'user', 'Membre'); addUser('invite', 'user', 'Invité')
addUser('perm-clan', 'user', 'Membre'); addUser('perm-art', 'user', 'Membre'); addUser('perm-tl', 'user', 'Membre')
const addPerm = (user, permission) => old.prepare('INSERT INTO user_permissions (user_id, permission, granted, updated_at) VALUES (?, ?, 1, ?)').run(user, permission, stamp)
addPerm('perm-clan', 'create_clan'); addPerm('perm-art', 'create_journal_article'); addPerm('perm-tl', 'create_timeline')
const addRow = (table, id, owner, visibility, managed) => old.prepare(`INSERT INTO ${table} (id, owner_user_id, data, created_at, updated_at${managed === undefined ? '' : ', managed_by_admin'}) VALUES (?, ?, ?, ?, ?${managed === undefined ? '' : ', ?'})`).run(...[id, owner, JSON.stringify(visibility ? { visibility } : {}), stamp, stamp].concat(managed === undefined ? [] : [managed]))
addRow('characters', 'c-pub', 'rpiste', 'published', 0); addRow('characters', 'c-draft', 'rpiste', 'draft', 0); addRow('characters', 'c-system', 'system', 'draft', 1); addRow('characters', 'c-admin-draft', 'admin1', 'draft', 0)
addRow('clans', 'k-pub', 'rpiste', 'published'); addRow('clans', 'k-draft', 'rpiste', 'draft'); addRow('locations', 'l-nov', 'rpiste', null)
addRow('posts', 'p-draft', 'perm-art', 'draft'); addRow('timelines', 'tl-pub', 'perm-tl', 'published')
const permsBefore = old.prepare('SELECT COUNT(*) AS n FROM user_permissions').get().n
old.exec(readFileSync('migrations/0014_roles_moderation.sql', 'utf8'))
assert(ROLE_OF(old, 'admin1') === 'admin', 'un admin reste admin')
assert(ROLE_OF(old, 'rpiste') === 'creator', 'RPiste devient creator')
assert(ROLE_OF(old, 'membre') === 'guest' && ROLE_OF(old, 'invite') === 'guest', 'Membre et Invité deviennent guest')
assert(ROLE_OF(old, 'perm-clan') === 'creator', 'un compte avec un create_* individuel devient creator')
assert(ROLE_OF(old, 'perm-art') === 'journalist', 'un compte qui n’a que le droit d’articles devient journalist')
assert(old.prepare('SELECT COUNT(*) AS n FROM user_permissions').get().n === permsBefore, 'aucune ligne user_permissions n’est perdue (aucun droit retiré)')
const review = (table, id) => old.prepare(`SELECT review_status AS s FROM ${table} WHERE id = ?`).get(id).s
assert(review('characters', 'c-pub') === 'published' && review('clans', 'k-pub') === 'published' && review('locations', 'l-nov') === 'published' && review('timelines', 'tl-pub') === 'published', 'les contenus déjà en ligne passent en published')
assert(review('characters', 'c-draft') === 'draft' && review('clans', 'k-draft') === 'draft' && review('posts', 'p-draft') === 'draft', 'les brouillons restent des brouillons')
assert(review('characters', 'c-system') === 'published' && review('characters', 'c-admin-draft') === 'published', 'le contenu system et celui d’un admin ne passent pas par le circuit')

// --- 2 bis. Copie de la D1 locale réelle (l'original n'est jamais modifié) --
try {
  const source = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  const file = readdirSync(source).find((name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite')
  const copyDir = mkdtempSync(join(tmpdir(), 'woltar-d1-'))
  const copyPath = join(copyDir, 'copy.sqlite')
  copyFileSync(join(source, file), copyPath)
  const copy = new DatabaseSync(copyPath)
  const before = copy.prepare('SELECT COUNT(*) AS n FROM users').get().n
  const beforeChars = copy.prepare('SELECT COUNT(*) AS n FROM characters').get().n
  const hasReview = copy.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('characters') WHERE name = 'review_status'").get().n
  if (!hasReview) copy.exec(readFileSync('migrations/0014_roles_moderation.sql', 'utf8'))
  assert(copy.prepare('SELECT COUNT(*) AS n FROM users').get().n === before && copy.prepare('SELECT COUNT(*) AS n FROM characters').get().n === beforeChars, 'copie de la D1 locale : aucune ligne perdue par la migration')
  assert(copy.prepare("SELECT COUNT(*) AS n FROM users WHERE role NOT IN ('admin','creator','journalist','guest')").get().n === 0, 'copie de la D1 locale : tous les rôles sont valides')
  assert(copy.prepare("SELECT COUNT(*) AS n FROM characters WHERE review_status <> 'published' AND json_extract(data, '$.visibility') <> 'draft'").get().n === 0, 'copie de la D1 locale : rien de publié n’a été mis hors ligne')
} catch (error) {
  console.log(`  (copie de la D1 locale ignorée : ${error.message})`)
}

// --- Harnais Worker -----------------------------------------------------------
const sqlite = new DatabaseSync(':memory:')
for (const file of MIGRATIONS) sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'))
const env = { WOLTAR_DB: wrapDb(sqlite), AUTH_SESSION_SECRET: 'roles-moderation-test', ALLOW_PUBLIC_REGISTRATION: 'true' }
const { handleAuth } = await import('../worker/routes/auth.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { handleAdmin } = await import('../worker/routes/admin.js')
const { handlePublic } = await import('../worker/routes/public.js')
const { loginUser, createSessionToken, getRequestUser } = await import('../worker/lib/authStore.js')
const { getEffectiveRights, can } = await import('../worker/lib/permissions.js')
const canonLocations = JSON.parse(readFileSync('src/data/locations.json', 'utf8'))
const canonCharacters = JSON.parse(readFileSync('src/data/characters.json', 'utf8'))

function request(path, method = 'GET', body, { token = '', origin = 'https://test.local', ip = '' } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (origin) headers.Origin = origin
  if (ip) headers['CF-Connecting-IP'] = ip
  if (token) headers.Cookie = `woltar_session=${encodeURIComponent(token)}`
  return new Request(`https://test.local${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}
const account = (path, method, body, opts) => handleAccount(request(`/__account/api/${path}`, method, body, opts), env, path.split('/'))
const admin = (path, method, body, opts) => handleAdmin(request(`/__admin/api/${path}`, method, body, opts), env, path.split('/'))
const pub = (path, method, body, opts) => handlePublic(request(`/__public/api/${path}`, method, body, opts), env, path.split('/'))
const auth = (path, method, body, opts) => handleAuth(request(`/__auth/api/${path}`, method, body, opts), env, path.split('/'))

async function makeUser(name, role) {
  const response = await auth('register', 'POST', { email: `${name.toLowerCase()}@roles.test`, name, password: 'RolesPass123' })
  const created = (await response.json()).user
  if (role !== 'guest') sqlite.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, created.id)
  const session = createSessionToken(env, await loginUser(env, { identifier: name, password: 'RolesPass123' }))
  return { id: created.id, token: session }
}

console.log('Rôles et droits')
const poungou = await makeUser('Poungou', 'admin')
const invite = await makeUser('Invitee', 'guest')
const creator = await makeUser('Creatrice', 'creator')
const journalist = await makeUser('Plume', 'journalist')
const otherCreator = await makeUser('Autre', 'creator')
const at = (user) => ({ token: user.token })

assert((await (await auth('session', 'GET', undefined, at(invite))).json()).user.role === 'guest', 'une inscription publique crée un Invité (guest)')
const me = await getRequestUser(env, request('/x', 'GET', undefined, at(creator)))
assert(!('status' in me) && me.role === 'creator', 'l’ancien statut (Membre/RPiste/Invité) n’est plus exposé')
assert(getEffectiveRights(me).join() === 'create_character,create_clan,create_location', 'un Créateur a personnage, clan et lieu')
const meJ = await getRequestUser(env, request('/x', 'GET', undefined, at(journalist)))
assert(getEffectiveRights(meJ).join() === 'create_journal_article', 'un Journaliste n’a que les articles')
assert(getEffectiveRights({ id: 'x', role: 'guest' }).length === 0, 'un Invité n’a aucun droit de création')
assert(can({ id: 'a', role: 'admin' }, 'create_clan'), 'un admin a tous les droits')

const body = (id) => ({ id, name: id, firstName: id, title: id })
const collections = ['characters', 'clans', 'locations', 'posts', 'timelines']
for (const name of collections) {
  assert((await account(`collections/${name}`, 'POST', body(`inv-${name}`), at(invite))).status === 403, `un Invité ne peut pas créer (${name})`)
}
assert((await account('collections/characters', 'POST', body('journal-char'), at(journalist))).status === 403, 'un Journaliste ne peut pas créer de personnage')
assert((await account('collections/posts', 'POST', body('art-1'), at(journalist))).status === 200, 'un Journaliste peut écrire un article')
assert((await account('collections/timelines', 'POST', body('tl-x'), at(creator))).status === 403, 'un Créateur n’a pas les chronologies par défaut (droit ajouté seulement)')

console.log('Routes admin refusées aux non-admins')
for (const [label, user] of [['Créateur', creator], ['Journaliste', journalist], ['Invité', invite]]) {
  assert((await admin('moderation/counts', 'GET', undefined, at(user))).status === 403, `${label} : file de modération refusée`)
  assert((await admin(`users/${creator.id}/role`, 'PUT', { role: 'guest' }, at(user))).status === 403, `${label} : changement de rôle refusé`)
  assert((await admin(`users/${creator.id}/rights`, 'PUT', { right: 'create_clan', enabled: false }, at(user))).status === 403, `${label} : retrait de droit refusé`)
}
assert((await admin('moderation/counts', 'GET')).status === 401, 'sans session : 401')

console.log('Circuit de validation')
const create = (name, id, extra, user = creator) => account(`collections/${name}`, 'POST', { ...body(id), ...extra }, at(user))
const created = await create('characters', 'perso-a', { visibility: 'published' })
const createdRow = (await created.json()).row
assert(created.status === 200 && createdRow.reviewStatus === 'draft' && createdRow.visibility === 'draft', 'un Créateur crée en brouillon, même en demandant visibility: published')
const forged = await create('characters', 'perso-forge', { reviewStatus: 'published', visibility: 'published' })
assert((await forged.json()).row.reviewStatus === 'draft' && sqlite.prepare("SELECT review_status s FROM characters WHERE id = 'perso-forge'").get().s === 'draft', 'reviewStatus envoyé par le client est ignoré')
assert((await pub('characters/perso-a')).status === 404, 'draft : fiche publique 404')
assert(!(await (await pub('characters')).json()).data.some((c) => c.id === 'perso-a'), 'draft : absent de la liste publique')

const submitPath = (name, id) => `collections/${name}/${id}/submit`
assert((await account(submitPath('characters', 'perso-a'), 'POST', {}, { token: creator.token, origin: '' })).status === 403, 'envoi pour validation sans Origin : refusé')
assert((await account(submitPath('characters', 'perso-a'), 'POST', {}, { token: creator.token, origin: 'https://evil.test' })).status === 403, 'envoi pour validation avec un autre Origin : refusé')
assert((await account(submitPath('characters', 'perso-a'), 'POST', {}, at(otherCreator))).status === 403, 'un autre compte ne peut pas envoyer ma fiche')
const submitted = await account(submitPath('characters', 'perso-a'), 'POST', {}, at(creator))
assert(submitted.status === 200 && (await submitted.json()).row.reviewStatus === 'pending', 'draft -> pending')
assert((await pub('characters/perso-a')).status === 404, 'pending : invisible côté public')
assert((await account('collections/characters/perso-a', 'PUT', { ...body('perso-a'), title: 'Change' }, at(creator))).status === 403, 'pending : non modifiable par son auteur')
assert((await account('collections/characters/perso-a', 'DELETE', undefined, at(creator))).status === 403, 'pending : non supprimable par son auteur')
assert((await account(submitPath('characters', 'perso-a'), 'POST', {}, at(creator))).status === 409, 'pending : ne se renvoie pas deux fois')
assert((await admin('moderation/counts', 'GET', undefined, at(poungou)).then((r) => r.json())).data.pending === 1, 'compteur « À valider » réel')

const pending = (await (await admin('moderation/pending', 'GET', undefined, at(poungou))).json()).data
assert(pending.length === 1 && pending[0].id === 'perso-a' && pending[0].ownerName === 'Creatrice', 'la file liste le contenu en attente avec son auteur')
const decide = (id, action, note, user = poungou, name = 'characters', origin = 'https://test.local') => admin(`moderation/content/${name}/${id}/${action}`, 'POST', note === undefined ? {} : { note }, { token: user.token, origin })
assert((await decide('perso-a', 'request-changes')).status === 400, 'demander une correction sans message : 400')
assert((await decide('perso-a', 'reject', '   ')).status === 400, 'refuser sans message : 400')
assert((await decide('perso-a', 'approve', undefined, poungou, 'characters', '')).status === 403, 'décision sans Origin : refusée')
const changes = await decide('perso-a', 'request-changes', 'Image à changer.')
assert(changes.status === 200 && (await changes.json()).row.reviewStatus === 'needs_changes', 'pending -> needs_changes avec message')
assert((await pub('characters/perso-a')).status === 404, 'needs_changes : invisible côté public')
const boot = (await (await account('bootstrap', 'GET', undefined, at(creator))).json()).data.characters.find((c) => c.id === 'perso-a')
assert(boot.reviewStatus === 'needs_changes' && boot.reviewNote === 'Image à changer.', 'l’auteur voit le message de l’équipe')
assert((await account('collections/characters/perso-a', 'PUT', { ...body('perso-a'), title: 'Corrigée', visibility: 'published' }, at(creator))).status === 200, 'needs_changes : l’auteur peut corriger')
assert(sqlite.prepare("SELECT review_status s FROM characters WHERE id = 'perso-a'").get().s === 'needs_changes', 'corriger ne republie pas')
assert((await account(submitPath('characters', 'perso-a'), 'POST', {}, at(creator))).status === 200, 'needs_changes -> pending (renvoi)')
assert((await decide('perso-a', 'approve', undefined, creator)).status === 403, 'un Créateur ne peut pas se valider lui-même')
const approved = await decide('perso-a', 'approve')
assert(approved.status === 200 && (await approved.json()).row.reviewStatus === 'published', 'pending -> published')
const live = await pub('characters/perso-a')
const liveBody = (await live.json()).data
assert(live.status === 200 && liveBody.title === 'Corrigée', 'published : visible côté public')
assert(liveBody.reportable === true, 'une fiche de compte publiée est marquée signalable (reportable)')
assert(!('reviewNote' in liveBody) && !('reviewedBy' in liveBody) && !('reviewStatus' in liveBody), 'le message de l’équipe et le relecteur ne fuitent pas côté public')
assert((await account('collections/characters/perso-a', 'PUT', { ...body('perso-a'), title: 'Retouche' }, at(creator))).status === 200, 'published : l’auteur peut modifier')
assert(sqlite.prepare("SELECT review_status s FROM characters WHERE id = 'perso-a'").get().s === 'published', 'modifier un contenu publié le laisse publié (publication directe)')
assert((await decide('perso-a', 'approve')).status === 409, 'on ne valide qu’un contenu en attente')

await create('clans', 'clan-a'); await account(submitPath('clans', 'clan-a'), 'POST', {}, at(creator))
const rejected = await decide('clan-a', 'reject', 'Hors charte.', poungou, 'clans')
assert(rejected.status === 200 && (await rejected.json()).row.reviewStatus === 'hidden', 'pending -> hidden (refus avec message)')
assert(sqlite.prepare("SELECT COUNT(*) n FROM clans WHERE id = 'clan-a'").get().n === 1, 'un contenu refusé est conservé en archive (jamais supprimé)')
assert((await pub('clans/clan-a')).status === 404 && !(await (await pub('clans')).json()).data.some((c) => c.id === 'clan-a'), 'hidden : invisible côté public')
assert((await account('collections/clans/clan-a', 'PUT', { ...body('clan-a'), name: 'X' }, at(creator))).status === 403, 'hidden : non modifiable')
assert((await account('collections/clans/clan-a', 'DELETE', undefined, at(creator))).status === 403, 'hidden : non supprimable par son auteur')
assert((await account(submitPath('clans', 'clan-a'), 'POST', {}, at(creator))).status === 403, 'hidden : ne se renvoie pas')
assert((await account('collections/clans/clan-a/members', 'POST', { characterId: 'perso-a' }, at(creator))).status === 403, 'hidden : membres non modifiables')

const history = (await (await admin('moderation/history', 'GET', undefined, at(poungou))).json()).data
assert(history.content.some((item) => item.id === 'clan-a' && item.record.reviewStatus === 'hidden') && history.content.some((item) => item.id === 'perso-a'), 'l’historique liste les décisions')

await account('collections/locations', 'POST', { ...body('lieu-a') }, at(creator))
assert((await pub('locations/lieu-a')).status === 404, 'lieu draft : invisible')
sqlite.prepare("UPDATE posts SET review_status = 'pending' WHERE id = 'art-1'").run()
assert((await pub('posts/art-1')).status === 404 && !(await (await pub('posts')).json()).data.some((p) => p.id === 'art-1'), 'article pending : invisible')

const adminCreated = await create('locations', 'lieu-admin', { visibility: 'published' }, poungou)
assert(adminCreated.status === 200 && (await adminCreated.json()).row.reviewStatus === 'published' && (await pub('locations/lieu-admin')).status === 200, 'un Admin qui crée : publication directe')

console.log('Exposition publique : review_status seul (visibility = published)')
// Ici le JSON dit « published » : seule la relecture doit garder le contenu hors ligne.
const publicPaths = { characters: 'characters', clans: 'clans', locations: 'locations', posts: 'posts', timelines: 'timelines' }
for (const status of ['draft', 'pending', 'needs_changes', 'hidden', 'published']) {
  for (const name of collections) {
    const id = `vis-${name}-${status}`
    const data = JSON.stringify({ visibility: 'published', title: id, name: id, firstName: id })
    const extra = name === 'characters' ? ", is_featured, image_source, gallery_sources, managed_by_admin" : ''
    const extraValues = name === 'characters' ? ", 0, '', '{}', 0" : ''
    sqlite.prepare(`INSERT INTO ${name} (id, owner_user_id, data, created_at, updated_at, review_status${extra}) VALUES (?, ?, ?, ?, ?, ?${extraValues})`).run(id, creator.id, data, stamp, stamp, status)
    const detail = await pub(`${publicPaths[name]}/${id}`)
    const list = (await (await pub(publicPaths[name])).json()).data
    const shouldBeLive = status === 'published'
    assert((detail.status === 200) === shouldBeLive && list.some((row) => row.id === id) === shouldBeLive, `${name} : review_status ${status} -> ${shouldBeLive ? 'public' : 'jamais public'} (même avec visibility: published)`)
  }
}

console.log('Contenu canon')
const canonLocation = canonLocations[0]?.id
const canonCharacter = canonCharacters[0]?.id
assert((await decide(canonLocation, 'approve', undefined, poungou, 'locations')).status === 404, 'un lieu canon ne passe pas par le circuit')
assert((await decide(canonCharacter, 'reject', 'Non', poungou, 'characters')).status === 404, 'un personnage canon ne passe pas par le circuit')
assert((await pub('locations/' + canonLocation)).status === 200, 'le canon reste public')
const canonClan = JSON.parse(readFileSync('src/data/clans.json', 'utf8')).find((clan) => clan.id === 'nakamura')
assert((await (await pub('clans/nakamura')).json()).data.members.length === canonClan.members.length && canonClan.members.length > 0, 'le clan canon garde ses membres embarqués, même avec un ownerUserId dans le JSON')
assert((await (await pub('locations/' + canonLocation)).json()).data.reportable !== true, 'le canon n’est jamais marqué signalable')
assert((await account('collections/locations', 'POST', body(canonLocation), at(creator))).status === 409, 'un id canon reste réservé')

console.log('Droits précis')
const setRight = (user, target, right, enabled) => admin(`users/${target.id}/rights`, 'PUT', { right, enabled }, at(user))
assert((await create('locations', 'lieu-b')).status === 200, 'avant retrait : le Créateur crée un lieu')
const revoked = await setRight(poungou, creator, 'create_location', false)
const revokedUser = (await revoked.json()).user
assert(revoked.status === 200 && revokedUser.rightStates.create_location === 'revoked' && !revokedUser.rights.includes('create_location'), 'l’admin retire « créer des lieux »')
assert((await create('locations', 'lieu-c')).status === 403, 'droit retiré : refusé par le serveur')
assert((await create('clans', 'clan-b')).status === 200, 'les autres droits du rôle restent actifs')
const restored = await setRight(poungou, creator, 'create_location', true)
assert(restored.status === 200 && (await create('locations', 'lieu-d')).status === 200, 'droit rétabli : de nouveau accepté')
const added = await setRight(poungou, creator, 'create_timeline', true)
assert((await added.json()).user.rightStates.create_timeline === 'added', 'un droit hors rôle apparaît « ajouté »')
assert((await create('timelines', 'tl-y')).status === 200, 'droit ajouté : accepté')
await setRight(poungou, creator, 'create_timeline', false)
assert((await create('timelines', 'tl-z')).status === 403, 'droit ajouté puis retiré : refusé')
assert((await setRight(poungou, creator, 'delete_everything', true)).status === 400, 'droit inconnu : 400')
assert((await setRight(poungou, poungou, 'create_clan', false)).status === 400, 'les droits d’un admin ne se modifient pas')
assert((await admin(`users/${creator.id}/rights`, 'PUT', { right: 'create_clan', enabled: false }, { token: poungou.token, origin: '' })).status === 403, 'retrait de droit sans Origin : refusé')

console.log('Hiérarchie des rôles')
const setRole = (actor, target, role, opts = {}) => admin(`users/${target.id}/role`, 'PUT', { role }, { token: actor.token, ...opts })
assert((await setRole(poungou, otherCreator, 'admin')).status === 403, 'impossible de passer un compte en admin via l’API')
assert(ROLE_OF(sqlite, otherCreator.id) === 'creator', '… et le rôle n’a pas changé')
assert((await auth(`users/${otherCreator.id}`, 'PATCH', { role: 'admin' }, at(poungou))).status === 403, 'impossible non plus via l’ancienne route PATCH')
assert((await setRole(poungou, poungou, 'guest')).status === 400, 'un admin ne peut pas se retirer son rôle')
assert((await setRole(poungou, otherCreator, 'root')).status === 400, 'rôle inconnu : 400')
const promoted = await setRole(poungou, otherCreator, 'journalist')
assert(promoted.status === 200 && ROLE_OF(sqlite, otherCreator.id) === 'journalist', 'l’admin change un rôle')
assert((await create('characters', 'perso-oc', {}, otherCreator)).status === 403, 'le nouveau rôle s’applique tout de suite (côté serveur)')
assert((await setRole(poungou, otherCreator, 'creator', { origin: '' })).status === 403, 'changement de rôle sans Origin : refusé')
await setRole(poungou, otherCreator, 'creator')
assert((await auth('users', 'POST', { name: 'Neuf', email: 'neuf@roles.test', password: 'NeufPass1234', passwordConfirmation: 'NeufPass1234', role: 'admin' }, at(poungou))).status === 400, 'création de compte avec le rôle admin : refusée')
assert((await auth('users', 'POST', { name: 'Neuf', email: 'neuf@roles.test', password: 'NeufPass1234', passwordConfirmation: 'NeufPass1234', role: 'journalist' }, at(poungou))).status === 201, 'création de compte avec un rôle attribuable : acceptée')

console.log('Signalements')
const reportBody = { contentType: 'characters', contentId: 'perso-a', reason: 'shocking', details: 'Image choquante' }
const report = (payload, opts = {}) => pub('reports', 'POST', payload, { ip: '10.0.0.1', ...opts })
assert((await report(reportBody, { origin: '' })).status === 403, 'signalement sans Origin : refusé')
assert((await report(reportBody, { origin: 'https://evil.test' })).status === 403, 'signalement avec un autre Origin : refusé')
assert((await report({ ...reportBody, contentType: 'posts' }, { ip: '10.0.0.2' })).status === 400, 'type de contenu hors fiches publiques : 400')
assert((await report({ ...reportBody, reason: 'spam' }, { ip: '10.0.0.3' })).status === 400, 'motif invalide : 400')
assert((await report({ ...reportBody, contentId: '../etc' }, { ip: '10.0.0.4' })).status === 400, 'identifiant invalide : 400')
assert((await report({ ...reportBody, contentId: 'inconnu' }, { ip: '10.0.0.5' })).status === 404, 'contenu inexistant : 404')
assert((await report({ ...reportBody, contentId: 'perso-forge' }, { ip: '10.0.0.6' })).status === 404, 'contenu non publié : 404')
assert((await report({ ...reportBody, contentId: canonCharacter }, { ip: '10.0.0.7' })).status === 404, 'contenu canon : 404')
assert(sqlite.prepare('SELECT COUNT(*) n FROM content_reports').get().n === 0, 'aucun signalement invalide n’est enregistré')
const ok = await report({ ...reportBody, details: 'x'.repeat(2000) })
assert(ok.status === 201 && sqlite.prepare('SELECT details FROM content_reports').get().details.length === 500, 'signalement valide : enregistré, détails limités à 500 caractères')
const stored = sqlite.prepare('SELECT * FROM content_reports').get()
assert(!Object.keys(stored).some((k) => /ip|user|email|reporter/i.test(k.replace('handled_by', ''))), 'aucune donnée sur la personne qui signale')
assert((await pub('characters/perso-a')).status === 200, 'un contenu signalé reste visible tant que l’admin n’a pas traité')
for (let i = 0; i < 3; i++) assert((await report({ ...reportBody, reason: 'other' })).status === 201, `signalement ${i + 2}/5 accepté depuis la même IP`)
assert((await report({ ...reportBody, reason: 'other' })).status === 201, 'signalement 5/5 accepté')
assert((await report({ ...reportBody, reason: 'other' })).status === 429, 'le 6e signalement de la même IP dans l’heure est limité (429)')
assert((await report({ ...reportBody, reason: 'other' }, { ip: '10.9.9.9' })).status === 201, 'une autre IP n’est pas limitée')

const reports = (await (await admin('moderation/reports', 'GET', undefined, at(poungou))).json()).data
assert(reports.length === 6 && reports[0].record?.id === 'perso-a', 'la file des signalements est complète')
assert((await admin('moderation/counts', 'GET', undefined, at(poungou)).then((r) => r.json())).data.reports === 6, 'compteur « Signalements » réel')
const firstReport = reports[0]
const handleReport = (id, action, note, opts = {}) => admin(`moderation/reports/${id}/${action}`, 'POST', note === undefined ? {} : { note }, { token: poungou.token, ...opts })
assert((await handleReport(firstReport.id, 'keep', undefined, { origin: '' })).status === 403, 'traiter un signalement sans Origin : refusé')
assert((await admin(`moderation/reports/${firstReport.id}/keep`, 'POST', {}, at(creator))).status === 403, 'un Créateur ne traite pas les signalements')
const kept = await handleReport(firstReport.id, 'keep')
assert(kept.status === 200 && sqlite.prepare('SELECT status FROM content_reports WHERE id = ?').get(firstReport.id).status === 'kept', '« Garder » classe le signalement')
assert((await pub('characters/perso-a')).status === 200, 'après « Garder » la fiche reste publique')
assert((await handleReport(firstReport.id, 'keep')).status === 409, 'un signalement déjà traité : 409')
const secondReport = reports[1]
assert((await handleReport(secondReport.id, 'hide')).status === 400, '« Masquer » sans message : 400')
const hidden = await handleReport(secondReport.id, 'hide', 'Image à retirer.')
assert(hidden.status === 200, '« Masquer » avec message')
assert(sqlite.prepare("SELECT review_status s, review_note n FROM characters WHERE id = 'perso-a'").get().s === 'needs_changes', '« Masquer » passe le contenu en needs_changes')
assert((await pub('characters/perso-a')).status === 404, 'contenu masqué : invisible côté public')
assert(sqlite.prepare("SELECT COUNT(*) n FROM content_reports WHERE status = 'open'").get().n === 0, 'tous les signalements ouverts du contenu sont clos')
const emptyReports = (await (await admin('moderation/reports', 'GET', undefined, at(poungou))).json()).data
assert(emptyReports.length === 0, 'état vide : « Rien à traiter »')

console.log(`\n${passed} OK, ${failed} FAIL`)
if (failed) process.exit(1)
