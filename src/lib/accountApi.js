import { uploadMedia } from './mediaUpload.js'

const BASE = '/__account/api'

async function json(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body
}

export async function getAccountBootstrap() {
  return json(await fetch(`${BASE}/bootstrap`, { credentials: 'same-origin' }))
}

export async function getAccountCollection(name) {
  const body = await json(await fetch(`${BASE}/collections/${name}`, { credentials: 'same-origin' }))
  return body.data
}

export async function createAccountRow(name, row) {
  const body = await json(
    await fetch(`${BASE}/collections/${name}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    }),
  )
  return body.row
}

export async function updateAccountRow(name, id, row) {
  const body = await json(
    await fetch(`${BASE}/collections/${name}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    }),
  )
  return body.row
}

export async function deleteAccountRow(name, id) {
  return json(
    await fetch(`${BASE}/collections/${name}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  )
}

// Membres d'un clan de compte — voir /collections/clans/:id/members dans
// worker/routes/account.js (prod) et plugins/woltar-account.js (dev).
export async function getClanMembers(clanId) {
  const body = await json(
    await fetch(`${BASE}/collections/clans/${encodeURIComponent(clanId)}/members`, { credentials: 'same-origin' }),
  )
  return body.data
}

export async function addClanMember(clanId, { characterId, role = '', order = 0 } = {}) {
  const body = await json(
    await fetch(`${BASE}/collections/clans/${encodeURIComponent(clanId)}/members`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, role, order }),
    }),
  )
  return body.data
}

export async function removeClanMember(clanId, characterId) {
  const body = await json(
    await fetch(`${BASE}/collections/clans/${encodeURIComponent(clanId)}/members/${encodeURIComponent(characterId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  )
  return body.data
}

// Sécurité du compte (espace connecté) — voir /security/change-password et
// /security/change-email dans worker/routes/account.js (prod) et
// plugins/woltar-account.js (dev). Le mot de passe actuel est toujours
// revérifié côté serveur, jamais seulement côté React.
export async function changePassword({ currentPassword, newPassword }) {
  return json(
    await fetch(`${BASE}/security/change-password`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  )
}

export async function changeEmail({ newEmail, currentPassword }) {
  return json(
    await fetch(`${BASE}/security/change-email`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail, currentPassword }),
    }),
  )
}

export async function getPlayerProfile() {
  return json(await fetch(`${BASE}/profile`, { credentials: 'same-origin' }))
}

export async function savePlayerProfile(profile) {
  return json(await fetch(`${BASE}/profile`, {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile),
  }))
}

// Avatar joueur — même mécanisme d'upload que src/admin/adminApi.js
// (voir src/lib/mediaUpload.js), mais vers la route compte (ouverte à
// toute joueuse pouvant gérer un profil, pas seulement une administratrice).
export async function uploadAvatar(file) {
  return uploadMedia(file, { kind: 'image', endpoint: `${BASE}/upload` })
}
