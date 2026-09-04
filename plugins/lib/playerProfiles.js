import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadUsers } from './authStore.js'

function file(root) { return path.join(root, 'plugins', 'data', 'user-profiles.json') }
async function load(root) { return existsSync(file(root)) ? JSON.parse(await readFile(file(root), 'utf8')) : {} }
async function save(root, data) { await mkdir(path.dirname(file(root)), { recursive: true }); await writeFile(file(root), JSON.stringify(data, null, 2) + '\n', 'utf8') }
export function normalizePlayerProfile(payload = {}) {
  const text = (value, max = 12000) => String(value || '').trim().slice(0, max)
  return { avatar: text(payload.avatar, 2000), image_source: text(payload.image_source, 500), player_intro: text(payload.player_intro), writing_style: text(payload.writing_style), univers: text(payload.univers), tw: text(payload.tw), rhythm: text(payload.rhythm), ig_username: text(payload.ig_username, 160), profile_public: payload.profile_public === true || payload.profile_public === 1 || payload.profile_public === '1' }
}
export async function getPlayerProfile(root, userId) { const all = await load(root); return { userId, exists: Boolean(all[userId]), ...normalizePlayerProfile(all[userId]) } }
export async function createPlayerProfile(root, userId, payload) {
  // Même garde-fou que la version Worker (worker/lib/playerProfiles.js) :
  // jamais de profil joueur orphelin, même via un appel direct à l'API.
  const users = await loadUsers(root)
  if (!users.some((user) => user.id === userId)) { const error = new Error('Ce compte est introuvable.'); error.status = 404; throw error }
  const all = await load(root); if (all[userId]) { const error = new Error('Ce compte possède déjà un profil joueur.'); error.status = 409; throw error } return savePlayerProfile(root, userId, payload)
}
export async function savePlayerProfile(root, userId, payload) { const all = await load(root); all[userId] = normalizePlayerProfile(payload); await save(root, all); return getPlayerProfile(root, userId) }
export async function deletePlayerProfile(root, userId) { const all = await load(root); delete all[userId]; await save(root, all) }
export async function listPublicPlayerProfiles(root) {
  const users = await loadUsers(root); const profiles = await load(root); const characters = JSON.parse(await readFile(path.join(root, 'src', 'data', 'characters.json'), 'utf8'))
  return users.filter((user) => !user.disabled && profiles[user.id]?.profile_public).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((user) => {
    const profile = profiles[user.id]
    return { userId: user.id, name: user.name, status: user.status || 'Membre', profile: { userId: user.id, ...normalizePlayerProfile(profile) }, characters: characters.filter((character) => character.ownerUserId === user.id).map((character) => ({ id: character.id, name: [character.firstName, character.lastName].filter(Boolean).join(' ') || character.id })) }
  })
}
