export async function cultureApi(path, method = 'GET', data) {
  const response = await fetch(`/__culture/api/${path}`, {
    method, credentials: 'same-origin',
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Impossible de charger les cultures. Réessaie dans un instant.')
  if (method !== 'DELETE' && (!body.data || typeof body.data !== 'object')) throw new Error('Le serveur a renvoyé une réponse inattendue. Réessaie dans un instant.')
  if (method === 'GET' && ['posts', 'tags'].includes(path) && !Array.isArray(body.data)) throw new Error('La liste est momentanément indisponible. Réessaie dans un instant.')
  return body.data
}
