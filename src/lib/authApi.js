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

// Mot de passe oublié — réponse toujours neutre (voir worker/lib/authStore.js
// #requestPasswordReset), qu'un compte existe ou non pour cette adresse.
export async function forgotPassword(email) {
  return json(
    await fetch(`${BASE}/forgot-password`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  )
}

export async function resetPassword(token, newPassword) {
  return json(
    await fetch(`${BASE}/reset-password`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    }),
  )
}

export async function confirmEmail(token) {
  return json(
    await fetch(`${BASE}/confirm-email`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }),
  )
}

export async function listUsers() {
  return json(await fetch(`${BASE}/users`, { credentials: 'same-origin' }))
}

export async function createUser(payload) {
  return json(
    await fetch(`${BASE}/users`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
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

export async function getUserProfile(id) {
  return json(await fetch(`${BASE}/users/${encodeURIComponent(id)}/profile`, { credentials: 'same-origin' }))
}

export async function updateUserProfile(id, profile) {
  return json(await fetch(`${BASE}/users/${encodeURIComponent(id)}/profile`, {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile),
  }))
}
