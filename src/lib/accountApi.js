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
