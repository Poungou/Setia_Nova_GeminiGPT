const BASE = '/__auth/api'

export const accountBackendAvailable =
  import.meta.env.VITE_WOLTAR_ACCOUNT_BACKEND !== 'disabled'

async function json(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return body
}

export async function getSession() {
  return json(await fetch(`${BASE}/session`, { credentials: 'same-origin' }))
}

export async function registerAccount(payload) {
  return json(
    await fetch(`${BASE}/register`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function loginAccount(payload) {
  return json(
    await fetch(`${BASE}/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function loginLocalAdmin(passphrase) {
  return json(
    await fetch(`${BASE}/local-admin`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    }),
  )
}

export async function logoutAccount() {
  return json(
    await fetch(`${BASE}/logout`, {
      method: 'POST',
      credentials: 'same-origin',
    }),
  )
}

export async function listUsers() {
  return json(await fetch(`${BASE}/users`, { credentials: 'same-origin' }))
}

export async function updateUser(id, patch) {
  return json(
    await fetch(`${BASE}/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  )
}
