// Shared HTTP contract for D1 and the local development store.
const fail = (status, message) => Object.assign(new Error(message), { status })
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

function text(value, label, max, required = false) {
  if (value !== undefined && typeof value !== 'string') throw fail(400, `${label} invalide.`)
  const clean = (value || '').trim()
  if ((required && !clean) || clean.length > max) throw fail(400, `${label} : ${required ? '1 à' : 'maximum'} ${max} caractères.`)
  return clean
}

export function normalizeCulture(body, tags) {
  if (!body || Array.isArray(body)) throw fail(400, 'Publication invalide.')
  const image = text(body.image, 'Illustration', 2000)
  if (image && !/^https:\/\/[^\s]+$/i.test(image) && !/^\/(?:media|uploads)\/[^\s]+$/.test(image)) throw fail(400, 'Utilise une adresse HTTPS ou une image du site.')
  if (!Array.isArray(body.tagIds) || body.tagIds.length > 8 || body.tagIds.some(id => typeof id !== 'string' || !tags.some(tag => tag.id === id))) throw fail(400, 'Choisis jusqu’à 8 hashtags parmi ceux proposés. Recharge la page si la liste a changé.')
  return {
    title: text(body.title, 'Titre', 140, true),
    summary: text(body.summary, 'Introduction', 320),
    body: text(body.body, 'Récit', 50000, true),
    image, imageCredit: text(body.imageCredit, 'Crédit de l’image', 250),
    tagIds: [...new Set(body.tagIds)],
  }
}

export async function cultureRequest(request, parts, { store, getUser }) {
  try {
    const [collection, id] = parts
    const method = request.method
    if (parts.length > 2 || !['posts', 'tags'].includes(collection)) throw fail(404, 'Page introuvable.')
    if (method === 'GET') {
      if (collection === 'tags' && !id) return json({ data: await store.tags() })
      if (collection === 'posts') {
        if (!id) return json({ data: await store.posts() })
        const post = await store.post(id)
        if (!post) throw fail(404, 'Cette contribution n’existe plus.')
        return json({ data: post })
      }
      throw fail(404, 'Page introuvable.')
    }
    if (!['POST', 'PUT', 'DELETE'].includes(method)) throw fail(405, 'Méthode non autorisée.')
    const origin = request.headers.get('Origin')
    if (origin && origin !== new URL(request.url).origin) throw fail(403, 'Origine non autorisée.')
    const user = await getUser()
    if (!user || user.disabled) throw fail(401, 'Connecte-toi pour partager ta culture.')
    const admin = user.role === 'admin'
    if (collection === 'tags' && !admin) throw fail(403, 'Les hashtags sont gérés par l’administration.')
    if ((method === 'POST' && id) || (method !== 'POST' && !id)) throw fail(405, 'Méthode non autorisée.')
    let body = {}
    if (method !== 'DELETE') {
      if (!request.headers.get('Content-Type')?.includes('application/json')) throw fail(415, 'Format JSON requis.')
      const raw = await request.text()
      if (raw.length > 100000) throw fail(413, 'Publication trop volumineuse.')
      try { body = JSON.parse(raw) } catch { throw fail(400, 'Données illisibles.') }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'Données invalides.')
    }
    if (collection === 'tags') {
      const tags = await store.tags()
      if (id && !tags.some(tag => tag.id === id)) throw fail(404, 'Hashtag introuvable.')
      if (method === 'DELETE') { await store.deleteTag(id); return json({ ok: true }) }
      const name = text(body.name, 'Hashtag', 32, true).replace(/^#+/, '').normalize('NFC')
      if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(name)) throw fail(400, 'Utilise des lettres, chiffres, tirets ou underscores, sans espace.')
      if (tags.some(tag => tag.id !== id && tag.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) throw fail(409, 'Ce hashtag existe déjà.')
      const tag = { id: id || crypto.randomUUID(), name }
      await store.saveTag(tag, method === 'POST')
      return json({ data: tag }, method === 'POST' ? 201 : 200)
    }
    const existing = id ? await store.post(id) : null
    if (id && !existing) throw fail(404, 'Cette contribution n’existe plus.')
    if (existing && !admin && existing.ownerUserId !== user.id) throw fail(403, 'Tu peux modifier uniquement tes contributions.')
    if (method === 'DELETE') { await store.deletePost(id); return json({ ok: true }) }
    if (existing && body.updatedAt !== existing.updatedAt) throw fail(409, 'Cette contribution a changé. Recharge-la avant de modifier à nouveau.')
    const clean = normalizeCulture(body, await store.tags())
    const now = new Date(Math.max(Date.now(), existing ? Date.parse(existing.updatedAt) + 1 : 0)).toISOString()
    const post = { ...clean, id: id || crypto.randomUUID(), ownerUserId: existing?.ownerUserId || user.id,
      authorName: existing?.authorName || user.name, createdAt: existing?.createdAt || now, updatedAt: now }
    await store.savePost(post, !existing, existing?.updatedAt)
    return json({ data: post }, existing ? 200 : 201)
  } catch (error) {
    if (!error.status) console.error('[culture]', error)
    return json({ error: error.status ? error.message : 'La culture est momentanément indisponible. Réessaie dans un instant.' }, error.status || 500)
  }
}
