export async function cultureApi(path, method = 'GET', data) {
  const response = await fetch(`/__culture/api/${path}`, {
    method, credentials: 'same-origin',
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Impossible de charger les cultures. Réessaie dans un instant.')
  return body.data
}
