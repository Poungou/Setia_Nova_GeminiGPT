// src/lib/timelineEvents.js
//
// Logique pure et partagée (Worker de prod, plugins Vite de dev, et rendu
// public) pour les CHRONOLOGIES COMMUNAUTAIRES — voir claude/architecture-decisions.md
// et le cahier des charges "Refonte UX + système communautaire des
// Chronologies" pour le contexte complet.
//
// Une chronologie ("timeline") est un contenu de compte comme un lieu ou un
// clan (voir worker/lib/contentStore.js) : { id, title, description, spoiler,
// visibility, ownerUserId, characters: [ids], events: [...] }.
//
// Cas particulier de la chronologie CANON (le clan Nakamura) : ses
// événements ne sont JAMAIS dupliqués dans un nouveau fichier — ils restent
// exactement ceux de src/data/events.json (édités via la collection
// "Chronologie" existante de l'admin local), pour ne rien casser ni
// réécrire de ce qui fonctionne déjà. `src/data/timelines.json` ne porte
// donc PAS de champ `events` pour la fiche "nakamura" : resolveTimelineEvents
// détecte cette absence et va chercher les événements canon à la place.
// Une chronologie créée par un compte joueur, elle, porte toujours son
// propre tableau `events` (jamais de repli canon).

const ID_MAX = 80
const TITLE_MAX = 200
const DATE_MAX = 160
const DESCRIPTION_MAX = 20000
const MAX_EVENTS = 500
const IMPORTANCE_VALUES = new Set(['majeur', 'mineur'])

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function cleanIdList(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()))]
}

// Slug minimal, local à ce fichier — même logique que src/admin/slug.js et
// src/data/clans.js#slugify, dupliquée ici volontairement pour que ce module
// reste sans dépendance (il est importé aussi bien depuis le Worker
// Cloudflare que depuis les plugins Vite de dev et le bundle client).
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Nettoie et normalise le tableau d'événements d'UNE chronologie de compte
// avant écriture (D1 en prod, JSON local en dev — voir contentStore.js /
// plugins/woltar-account.js). L'ordre d'affichage est toujours celui du
// tableau reçu (réordonné côté UI via les flèches monter/descendre) : on lui
// assigne ici un `order` numérique croissant (10, 20, 30…) pour rester
// cohérent avec le format des événements canon existants (order numérique,
// voir src/data/events.json) et permettre un tri simple et stable.
export function normalizeTimelineEvents(rawList) {
  if (!Array.isArray(rawList)) return []
  const seen = new Set()
  return rawList.slice(0, MAX_EVENTS).map((raw, index) => {
    const title = cleanText(raw?.title, TITLE_MAX)
    const base = cleanText(raw?.id, ID_MAX) || slugify(title) || `evenement-${index + 1}`
    let candidate = base
    let suffix = 2
    while (seen.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    seen.add(candidate)
    return {
      id: candidate,
      title,
      dateRP: cleanText(raw?.dateRP, DATE_MAX),
      order: (index + 1) * 10,
      description: cleanText(raw?.description, DESCRIPTION_MAX),
      characters: cleanIdList(raw?.characters),
      locations: cleanIdList(raw?.locations),
      spoiler: raw?.spoiler === true || raw?.spoiler === 'true',
      importance: IMPORTANCE_VALUES.has(raw?.importance) ? raw.importance : '',
    }
  })
}

// Résout les événements affichables d'une chronologie : ceux de son propre
// tableau `events`, sauf pour une chronologie SYSTÈME (canon, ownerUserId
// absent ou "system") qui n'a pas encore de tableau `events` du tout — dans
// ce cas uniquement, on retombe sur les événements canon fournis
// (`canonEvents`, c-à-d. src/data/events.json). Toujours trié par `order`.
export function resolveTimelineEvents(timeline, canonEvents = []) {
  if (!timeline) return []
  const isSystem = !timeline.ownerUserId || timeline.ownerUserId === 'system'
  const source = isSystem && !Array.isArray(timeline.events) ? canonEvents : timeline.events || []
  return [...source].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
