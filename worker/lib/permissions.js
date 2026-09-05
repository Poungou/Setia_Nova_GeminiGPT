export const CREATE_PERMISSIONS = {
  characters: 'create_character',
  clans: 'create_clan',
  locations: 'create_location',
  posts: 'create_journal_article',
  timelines: 'create_timeline',
}

export const PERMISSION_LABELS = {
  create_character: 'Créer des personnages RP',
  create_clan: 'Créer des clans',
  create_location: 'Créer des lieux',
  create_journal_article: 'Créer des articles de journal',
  create_timeline: 'Créer des chronologies',
}

export function canCreate(user, permission) {
  return Boolean(user?.id && (user.role === 'admin' || user.permissions?.[permission] === true))
}

export function normalizePermissions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, granted]) => /^[a-z][a-z0-9_]{1,63}$/.test(key) && typeof granted === 'boolean')
      .map(([key, granted]) => [key, granted]),
  )
}
