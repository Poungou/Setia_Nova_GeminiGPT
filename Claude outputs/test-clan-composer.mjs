// Claude outputs/test-clan-composer.mjs
//
// Intégration réelle (mêmes handlers que le Worker de production, SQLite en
// mémoire au lieu de D1 — voir wrapDb ci-dessous et test-player-profiles.mjs
// pour la méthodologie) pour la refonte « Composeur de clan » (voir
// src/components/ClanComposer/ClanComposer.jsx) :
//   - le Bloc B (membres) continue d'utiliser exactement la même route
//     /collections/clans/:id/members (table clan_members) qu'avant, la
//     présentation a seulement changé côté React
//   - le Bloc C (éditeur visuel de liens) n'a AJOUTÉ AUCUNE route serveur :
//     il écrit un lien des deux côtés via deux PUT
//     /collections/characters/:id successifs (même route que l'éditeur de
//     personnage générique) — ce test vérifie que ce chemin fonctionne
//     vraiment, y compris le cas où le second personnage appartient à un
//     autre compte (le réciproque échoue, le premier reste enregistré)
//   - le Bloc D (personnage central) écrit simplement
//     clan.centerCharacterId via le PUT générique /collections/clans/:id
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

const env = { WOLTAR_DB: wrapDb(db), AUTH_SESSION_SECRET: 'clan-composer-test', ALLOW_PUBLIC_REGISTRATION: 'true' }

const { handleAuth } = await import('../worker/routes/auth.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { loginUser, createSessionToken } = await import('../worker/lib/authStore.js')

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
  const response = await handleAuth(request('/__auth/api/register', 'POST', { email, name, password: 'ClanComposerPass123' }), env, ['register'])
  return (await response.json()).user
}

async function sessionFor(name) {
  return createSessionToken(env, await loginUser(env, { identifier: name, password: 'ClanComposerPass123' }))
}

async function grantPermission(adminSession, userId, permission) {
  return handleAuth(request(`/__auth/api/users/${userId}`, 'PATCH', { permissions: { [permission]: true } }, adminSession), env, ['users', userId])
}

// --- Comptes de test --------------------------------------------------------

const poungou = await register('poungou-clancomposer@test.local', 'Poungou')
db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(poungou.id)
const adminSession = await sessionFor('Poungou')

const rina = await register('rina-clancomposer@test.local', 'Rina')
const rinaSession = await sessionFor('Rina')
await grantPermission(adminSession, rina.id, 'create_clan')
await grantPermission(adminSession, rina.id, 'create_character')

const emy = await register('emy-clancomposer@test.local', 'Emy')
const emySession = await sessionFor('Emy')
await grantPermission(adminSession, emy.id, 'create_character')

// --- 1. Rina prépare deux personnages à elle + un clan ----------------------

async function createCharacter(session, id, firstName, lastName) {
  const res = await handleAccount(
    request('/__account/api/collections/characters', 'POST', { id, firstName, lastName, relations: [] }, session),
    env,
    ['collections', 'characters'],
  )
  assert(res.status === 200, `${firstName} créé(e)`)
  return (await res.json()).row
}

const kaho = await createCharacter(rinaSession, 'kaho-test', 'Kaho', 'Test')
const ren = await createCharacter(rinaSession, 'ren-test', 'Ren', 'Test')

const clanRes = await handleAccount(
  request('/__account/api/collections/clans', 'POST', { id: 'clan-test', name: 'Clan Test', residence: '' }, rinaSession),
  env,
  ['collections', 'clans'],
)
assert(clanRes.status === 200, 'Rina crée son clan')
const clan = (await clanRes.json()).row
assert(clan.ownerUserId === rina.id, 'le clan créé lui appartient')
assert(!('members' in clan) || clan.members === undefined, 'le champ `members` brut n’est jamais renvoyé par la création (passe par la sous-route dédiée)')

// --- 2. Bloc B — membres : même route qu'avant, juste une présentation différente

async function addMember(characterId) {
  return handleAccount(
    request(`/__account/api/collections/clans/${clan.id}/members`, 'POST', { characterId }, rinaSession),
    env,
    ['collections', 'clans', clan.id, 'members', ''],
  )
}

assert((await addMember(kaho.id)).status === 200, 'Kaho rejoint le clan')
assert((await addMember(ren.id)).status === 200, 'Ren rejoint le clan')

const membersRes = await handleAccount(
  request(`/__account/api/collections/clans/${clan.id}/members`, 'GET', undefined, rinaSession),
  env,
  ['collections', 'clans', clan.id, 'members'],
)
const membersBody = await membersRes.json()
assert(membersBody.data.length === 2, 'les deux membres apparaissent dans la table clan_members')

// --- 3. Bloc C — lien entre les deux membres, écrit des deux côtés ----------
// Reproduit exactement ce que fait ClanComposer (voir upsertRelation dans
// src/lib/relations.js) : deux PUT successifs sur /collections/characters/:id.

async function putCharacter(session, characterRow) {
  return handleAccount(
    request(`/__account/api/collections/characters/${characterRow.id}`, 'PUT', characterRow, session),
    env,
    ['collections', 'characters', characterRow.id],
  )
}

const kahoWithRelation = { ...kaho, relations: [{ characterId: ren.id, type: 'Frère jumeau', description: '', nature: '', intensity: '' }] }
const kahoPut = await putCharacter(rinaSession, kahoWithRelation)
assert(kahoPut.status === 200, 'le lien est écrit côté Kaho')

const renWithRelation = { ...ren, relations: [{ characterId: kaho.id, type: 'Sœur jumelle', description: '', nature: '', intensity: '' }] }
const renPut = await putCharacter(rinaSession, renWithRelation)
assert(renPut.status === 200, 'le réciproque est écrit côté Ren, avec un libellé différent')

const bootstrapAfterLink = await handleAccount(request('/__account/api/bootstrap', 'GET', undefined, rinaSession), env, ['bootstrap'])
const bootstrapAfterLinkBody = await bootstrapAfterLink.json()
const kahoAfter = bootstrapAfterLinkBody.data.characters.find((c) => c.id === kaho.id)
const renAfter = bootstrapAfterLinkBody.data.characters.find((c) => c.id === ren.id)
assert(kahoAfter.relations[0].type === 'Frère jumeau' && kahoAfter.relations[0].characterId === ren.id, 'le lien de Kaho vers Ren est bien persisté')
assert(renAfter.relations[0].type === 'Sœur jumelle' && renAfter.relations[0].characterId === kaho.id, 'le lien de Ren vers Kaho est bien persisté, avec son propre libellé')

// --- 4. Bloc C, cas limite — le second personnage appartient à un autre compte
// (ex. une admin a ajouté le personnage d'Emy au clan de Rina, en modération) :
// le réciproque doit échouer proprement (403) sans empêcher le premier côté
// d'être enregistré — c'est le comportement que ClanComposer attrape et
// signale à l'utilisatrice plutôt que de tout annuler.

const emyChar = await createCharacter(emySession, 'yumi-test', 'Yumi', 'Test')
const adminAddEmyChar = await handleAccount(
  request(`/__account/api/collections/clans/${clan.id}/members`, 'POST', { characterId: emyChar.id }, adminSession),
  env,
  ['collections', 'clans', clan.id, 'members', ''],
)
assert(adminAddEmyChar.status === 200, 'une admin peut ajouter le personnage d’une autre joueuse au clan de Rina (modération)')

const kahoWithForeignLink = { ...kahoAfter, relations: [...kahoAfter.relations, { characterId: emyChar.id, type: 'Amitié', description: '', nature: '', intensity: '' }] }
assert((await putCharacter(rinaSession, kahoWithForeignLink)).status === 200, 'Rina peut quand même écrire le lien de SON côté (son propre personnage)')

const foreignReciprocal = { ...emyChar, relations: [{ characterId: kaho.id, type: 'Amitié', description: '', nature: '', intensity: '' }] }
const foreignAttempt = await putCharacter(rinaSession, foreignReciprocal)
assert(foreignAttempt.status === 403, 'Rina ne peut PAS écrire le réciproque sur le personnage d’Emy (403, pas un crash) — ClanComposer garde le premier côté et le signale')

// --- 5. Bloc D — personnage central : simple PUT sur la fiche clan ----------

const centerPut = await handleAccount(
  request(`/__account/api/collections/clans/${clan.id}`, 'PUT', { ...clan, centerCharacterId: kaho.id }, rinaSession),
  env,
  ['collections', 'clans', clan.id],
)
assert(centerPut.status === 200, 'le personnage central se définit par un simple PUT sur la fiche clan')
assert((await centerPut.json()).row.centerCharacterId === kaho.id, 'centerCharacterId est bien persisté')

// --- 6. Retirer un membre ne supprime jamais le personnage ------------------

const removeMember = await handleAccount(
  request(`/__account/api/collections/clans/${clan.id}/members/${encodeURIComponent(ren.id)}`, 'DELETE', undefined, rinaSession),
  env,
  ['collections', 'clans', clan.id, 'members', encodeURIComponent(ren.id)],
)
assert(removeMember.status === 200, 'Ren est retiré du clan')
const renStillExists = await handleAccount(
  request(`/__account/api/collections/characters/${ren.id}`, 'GET', undefined, rinaSession),
  env,
  ['collections', 'characters'],
)
const renStillExistsBody = await renStillExists.json()
assert(renStillExistsBody.data.some((c) => c.id === ren.id), 'le personnage de Ren existe toujours après avoir été retiré du clan')

console.log(`\n${passed} test(s) OK, ${failed} échec(s).`)
if (failed > 0) process.exit(1)
