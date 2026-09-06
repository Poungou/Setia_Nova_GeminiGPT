// Claude outputs/test-media-upload.mjs
//
// Test d'intégration réel (vrais handlers HTTP, vraie logique
// worker/lib/mediaStore.js) pour l'upload média ajouté dans cette passe :
// musique du site (admin) + avatar joueur (compte). D1 simulé via
// node:sqlite (comme les autres tests de ce dossier), R2 simulé par un
// petit mock en mémoire (WOLTAR_MEDIA) qui implémente juste ce que
// mediaStore.js utilise (.put/.get, object.body/.httpEtag/.writeHttpMetadata).
//
// Couvre le plan de tests demandé : upload image avatar, upload audio,
// sauvegarde + reload (GET /uploads/... sert bien le contenu stocké),
// fichier invalide (mauvais type), fichier trop lourd, URL manuelle
// toujours fonctionnelle (le champ src/avatar accepte toujours une simple
// chaîne sans passer par /upload), + séparation des permissions
// (admin-only pour la musique ; /__account/api/upload ouvert à toute
// session valide — avatar ET portraits de personnages/clans/lieux édités
// depuis /compte, voir worker/routes/account.js — la permission RPiste/
// admin ne s'applique qu'à l'enregistrement du profil joueur lui-même,
// pas à l'upload d'un fichier).

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

// --- mock R2 minimal : juste ce que worker/lib/mediaStore.js et
// worker/routes/media.js utilisent réellement (.put, .get, object.body en
// ReadableStream-like, .httpEtag, .writeHttpMetadata(headers)). -----------
function makeR2Mock() {
  const store = new Map()
  return {
    async put(key, bytes, opts = {}) {
      store.set(key, { bytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), contentType: opts?.httpMetadata?.contentType || 'application/octet-stream' })
    },
    async get(key) {
      const entry = store.get(key)
      if (!entry) return null
      return {
        body: entry.bytes,
        httpEtag: `"${key}"`,
        writeHttpMetadata(headers) {
          headers.set('content-type', entry.contentType)
        },
      }
    },
    _size() {
      return store.size
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
  'migrations/0011_player_profile_characters.sql',
]) {
  db.exec(readFileSync(file, 'utf8'))
}

const env = {
  WOLTAR_DB: wrapDb(db),
  WOLTAR_MEDIA: makeR2Mock(),
  AUTH_SESSION_SECRET: 'media-upload-test',
  ALLOW_PUBLIC_REGISTRATION: 'true',
}

const { handleAuth } = await import('../worker/routes/auth.js')
const { handleAdmin } = await import('../worker/routes/admin.js')
const { handleAccount } = await import('../worker/routes/account.js')
const { handleMediaGet } = await import('../worker/routes/media.js')
const { loginUser, createSessionToken } = await import('../worker/lib/authStore.js')

function request(path, method = 'GET', body, cookie = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = `woltar_session=${encodeURIComponent(cookie)}`
  return new Request(`https://test.local${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
}

async function register(email, name) {
  const response = await handleAuth(request('/__auth/api/register', 'POST', { email, name, password: 'MediaPass123' }), env, ['register'])
  return (await response.json()).user
}

// 1x1 PNG transparent (67 octets réels une fois décodé) et un faux "mp3"
// (contenu arbitraire, seul le type MIME déclaré compte pour la validation).
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
function fakeAudioDataUrl(sizeBytes) {
  const bytes = Buffer.alloc(sizeBytes, 65) // rempli de 'A'
  return `data:audio/mpeg;base64,${bytes.toString('base64')}`
}

// --- Poungou = admin, Tallouna = RPiste, Membre = ni l'un ni l'autre -----
const poungou = await register('poungou-media@test.local', 'PoungouMedia')
db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(poungou.id)
const adminSession = createSessionToken(env, await loginUser(env, { identifier: 'PoungouMedia', password: 'MediaPass123' }))

const tallouna = await register('tallouna-media@test.local', 'TallounaMedia')
db.prepare("UPDATE users SET status = 'RPiste' WHERE id = ?").run(tallouna.id)
const rpisteSession = createSessionToken(env, await loginUser(env, { identifier: 'TallounaMedia', password: 'MediaPass123' }))

const membre = await register('membre-media@test.local', 'MembreMedia')
const membreSession = createSessionToken(env, await loginUser(env, { identifier: 'MembreMedia', password: 'MediaPass123' }))

// ---------------------------------------------------------------------
// 1. Upload musique (admin) — image/audio via /__admin/api/upload
// ---------------------------------------------------------------------
{
  const noAuth = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'x.png', dataUrl: PNG_1PX }), env, ['upload'])
  assert(noAuth.status === 401, 'upload admin refuse sans session')

  const notAdminWithCookie = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'x.png', dataUrl: PNG_1PX }, rpisteSession), env, ['upload'])
  assert(notAdminWithCookie.status === 403, 'upload admin refuse une session non-admin (RPiste)')

  const audioRes = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'Piste 1.mp3', dataUrl: fakeAudioDataUrl(2048), kind: 'audio' }, adminSession), env, ['upload'])
  const audioBody = await audioRes.json()
  assert(audioRes.status === 200 && /^\/uploads\/audio\/piste-1-.*\.mp3$/.test(audioBody.path), `admin upload audio -> chemin propre (${audioBody.path})`)

  const imgRes = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'portrait.png', dataUrl: PNG_1PX, kind: 'image' }, adminSession), env, ['upload'])
  const imgBody = await imgRes.json()
  assert(imgRes.status === 200 && /^\/uploads\/images\/portrait-.*\.png$/.test(imgBody.path), `admin upload image -> chemin propre (${imgBody.path})`)

  // fichier invalide : mauvais type MIME pour le kind déclaré
  const badType = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'x.exe', dataUrl: 'data:application/x-msdownload;base64,QUJD', kind: 'image' }, adminSession), env, ['upload'])
  assert(badType.status === 415, 'fichier invalide (type non supporté) rejeté avec un message clair')
  assert((await badType.json()).error?.includes('non supporté'), 'message d\'erreur explicite pour un type refusé')

  // dataUrl mal formée
  const malformed = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'x.png', dataUrl: 'ceci-nest-pas-une-dataurl' }, adminSession), env, ['upload'])
  assert(malformed.status === 400, 'dataUrl invalide rejetée (400)')

  // fichier trop lourd (audio > 20 Mo)
  const tooBig = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'gros.mp3', dataUrl: fakeAudioDataUrl(21 * 1024 * 1024), kind: 'audio' }, adminSession), env, ['upload'])
  assert(tooBig.status === 413, 'fichier audio trop lourd (>20 Mo) rejeté (413)')
  assert((await tooBig.json()).error?.includes('volumineux'), 'message d\'erreur explicite pour un fichier trop lourd')

  // sauvegarde + reload : le fichier uploadé est bien récupérable via /uploads/<clé>
  const key = audioBody.path.replace(/^\/uploads\//, '')
  const served = await handleMediaGet(request(`/uploads/${key}`), env, key)
  assert(served.status === 200, 'GET /uploads/<clé> sert le fichier audio uploadé (reload)')
  assert(served.headers.get('content-type') === 'audio/mpeg', 'le fichier servi garde son content-type')
  const servedBytes = await served.arrayBuffer()
  assert(servedBytes.byteLength === 2048, 'le contenu servi correspond exactement à ce qui a été uploadé (2048 octets)')

  const missing = await handleMediaGet(request('/uploads/images/inconnu.png'), env, 'images/inconnu.png')
  assert(missing.status === 404, 'GET /uploads/<clé inconnue> -> 404')

  // le champ src (piste musicale) reste une simple chaîne : une URL saisie
  // à la main continue de fonctionner sans jamais passer par /upload —
  // vérifié via normalizeMusicSettings (même logique que l'UI admin).
  const { normalizeMusicSettings } = await import('../src/lib/musicSettings.js')
  const manualUrl = normalizeMusicSettings({ mode: 'single', tracks: [{ title: 'Externe', src: 'https://example.com/ambiance.mp3', active: true }] })
  assert(manualUrl.tracks[0].src === 'https://example.com/ambiance.mp3', 'une URL manuelle (hors upload) reste acceptée pour une piste')
}

// ---------------------------------------------------------------------
// 2. Upload avatar (compte) — /__account/api/upload
// ---------------------------------------------------------------------
{
  const noAuth = await handleAccount(request('/__account/api/upload', 'POST', { filename: 'a.png', dataUrl: PNG_1PX }), env, ['upload'])
  assert(noAuth.status === 401, 'upload compte refuse sans session')

  // L'upload lui-même (écrire un fichier, recevoir une URL) est ouvert à
  // toute session valide — y compris un compte ni admin ni RPiste, ex. une
  // joueuse ayant seulement la permission "create_character" : c'est cette
  // route qu'utilisent aussi les portraits de personnages édités depuis
  // /compte (voir src/account/AccountApp.jsx), pas seulement l'avatar.
  const membreUploadRes = await handleAccount(request('/__account/api/upload', 'POST', { filename: 'portrait-perso.png', dataUrl: PNG_1PX }, membreSession), env, ['upload'])
  const membreUploadBody = await membreUploadRes.json()
  assert(membreUploadRes.status === 200 && /^\/uploads\/images\/portrait-perso-.*\.png$/.test(membreUploadBody.path), `upload compte (ni admin ni RPiste) -> chemin propre (${membreUploadBody.path})`)

  // ... mais le vrai garde-fou reste ailleurs : un compte ni admin ni
  // RPiste ne peut toujours pas enregistrer de profil joueur (avatar y
  // compris), même avec une URL déjà uploadée avec succès ci-dessus.
  const membreProfile = await handleAccount(request('/__account/api/profile', 'PUT', { avatar: membreUploadBody.path, profile_public: true }, membreSession), env, ['profile'])
  assert(membreProfile.status === 403, 'enregistrer un profil joueur (avatar) reste refusé à un compte ni admin ni RPiste')

  const avatarRes = await handleAccount(request('/__account/api/upload', 'POST', { filename: 'Mon Avatar.png', dataUrl: PNG_1PX }, rpisteSession), env, ['upload'])
  const avatarBody = await avatarRes.json()
  assert(avatarRes.status === 200 && /^\/uploads\/images\/mon-avatar-.*\.png$/.test(avatarBody.path), `upload avatar RPiste -> chemin propre (${avatarBody.path})`)

  // même si un client malicieux envoie kind:'audio', l'endpoint avatar ne
  // stocke jamais que des images (forcé côté serveur, voir account.js).
  const forcedKind = await handleAccount(request('/__account/api/upload', 'POST', { filename: 'x.mp3', dataUrl: fakeAudioDataUrl(1024), kind: 'audio' }, rpisteSession), env, ['upload'])
  assert(forcedKind.status === 415, 'l\'endpoint avatar refuse un fichier audio même si kind est falsifié à "audio" (forcé "image" côté serveur)')

  // sauvegarde + reload : l'avatar uploadé est enregistré dans le profil
  // joueur puis relu tel quel (chaîne simple, jamais un objet {src,focus}).
  await handleAccount(request('/__account/api/profile', 'PUT', { avatar: avatarBody.path, profile_public: true }, rpisteSession), env, ['profile'])
  const reloaded = await handleAccount(request('/__account/api/profile', 'GET', undefined, rpisteSession), env, ['profile'])
  const reloadedProfile = (await reloaded.json()).profile
  assert(reloadedProfile.avatar === avatarBody.path, 'l\'avatar enregistré est bien relu tel quel après reload')
  assert(typeof reloadedProfile.avatar === 'string', 'l\'avatar reste une chaîne simple en base (pas un objet {src,focus})')

  // URL manuelle toujours fonctionnelle : un chemin/URL saisi à la main
  // (jamais passé par /upload) est accepté et conservé tel quel.
  await handleAccount(request('/__account/api/profile', 'PUT', { avatar: 'https://example.com/moi.jpg', profile_public: true }, rpisteSession), env, ['profile'])
  const manual = await handleAccount(request('/__account/api/profile', 'GET', undefined, rpisteSession), env, ['profile'])
  assert((await manual.json()).profile.avatar === 'https://example.com/moi.jpg', 'une URL d\'avatar saisie à la main reste fonctionnelle (pas besoin d\'upload)')
}

// ---------------------------------------------------------------------
// 3. Stockage R2 sans binding configuré -> message clair (pas un crash)
// ---------------------------------------------------------------------
{
  const envNoBucket = { ...env, WOLTAR_MEDIA: undefined }
  const res = await handleAdmin(request('/__admin/api/upload', 'POST', { filename: 'x.png', dataUrl: PNG_1PX }, adminSession), envNoBucket, ['upload'])
  assert(res.status === 501, 'sans bucket R2 configuré, upload répond 501 (message clair) plutôt que de planter')
}

console.log(`\n${passed} OK, ${failed} FAIL`)
if (failed) process.exitCode = 1
