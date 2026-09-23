// Les anciens textes restent intégralement visibles, sans résumé inventé.
export function eventContent(event) {
  const explicit = Array.isArray(event.keyPoints) ? event.keyPoints.filter(point => typeof point === 'string' && point.trim()) : []
  const description = String(event.description || '').trim()
  if (explicit.length) return { points: explicit, archive: description.length > 220 && description !== explicit.join('\n\n') ? description : '' }
  const paragraphs = description.split(/\n\s*\n/).filter(Boolean)
  const points = paragraphs.length > 1 ? paragraphs : description.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü])/).filter(Boolean)
  // Au-delà de quatre paragraphes, conserver tout le texte dans le dernier point.
  return { points: points.length > 4 ? [...points.slice(0, 3), points.slice(3).join('\n\n')] : points, archive: '' }
}

export const eventImportance = event => event.importance === 'majeur' ? 'majeur' : event.importance === 'notable' ? 'notable' : 'repere'
const searchable = text => String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function filterTimelineEvents(events, { query = '', character = '', location = '', majorOnly = false } = {}) {
  const needle = searchable(query.trim())
  return [...events].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).filter(event =>
    (!character || event.characters?.includes(character)) &&
    (!location || event.locations?.includes(location)) &&
    (!majorOnly || event.importance === 'majeur') &&
    (!needle || searchable([event.title, event.dateRP, event.description, ...(event.keyPoints || []), ...(event.tags || [])].join(' ')).includes(needle)),
  )
}
