// src/lib/roles.js
//
// Noms et niveaux des rôles, pour l'AFFICHAGE uniquement. Les droits réels
// sont calculés et revérifiés par le Worker (worker/lib/permissions.js) : le
// navigateur ne fait que lire `user.rights`, jamais décider.

export const ROLE_LABELS = {
  admin: 'Admin',
  creator: 'Créateur',
  journalist: 'Journaliste',
  guest: 'Invité',
}

export const ROLE_LEVELS = { admin: 0, creator: 1, journalist: 2, guest: 3 }

// Rôles proposés à l'admin : `admin` n'y figure jamais.
export const ASSIGNABLE_ROLES = ['creator', 'journalist', 'guest']

export function roleLabel(role) {
  return ROLE_LABELS[role] || ROLE_LABELS.guest
}

// `user.rights` est fourni par le Worker. En dev local (sans D1) il est
// absent : on retombe alors sur les permissions individuelles historiques.
export function userHasRight(user, right) {
  if (!user) return false
  if (Array.isArray(user.rights)) return user.rights.includes(right)
  return user.role === 'admin' || user.permissions?.[right] === true
}

export function canManagePlayerProfile(user) {
  if (!user) return false
  if (Array.isArray(user.rights)) return user.role === 'admin' || user.role === 'creator'
  return user.role === 'admin' || user.status === 'RPiste'
}

// --- Droits précis (affichage uniquement) ----------------------------------------
// Miroir de worker/lib/permissions.js pour PRÉVISUALISER un changement avant
// « Enregistrer ». Le Worker recalcule et revérifie tout : ce tableau ne donne
// jamais un droit, il ne fait que dessiner l'écran.

export const RIGHT_LABELS = {
  create_character: 'Créer des personnages',
  create_clan: 'Créer des clans',
  create_location: 'Créer des lieux',
  create_journal_article: 'Écrire des articles',
  create_timeline: 'Créer des chronologies',
}

export const RIGHTS = Object.keys(RIGHT_LABELS)

export const ROLE_BASE_RIGHTS = {
  admin: RIGHTS,
  creator: ['create_character', 'create_clan', 'create_location'],
  journalist: ['create_journal_article'],
  guest: [],
}

export const ROLE_SUMMARY = {
  admin: 'Tous les droits',
  creator: 'Crée personnages, clans et lieux',
  journalist: 'Uniquement la partie Articles',
  guest: 'Uniquement les paramètres de son compte',
}

export const ROLE_TAGLINE = {
  admin: 'Tous les droits',
  creator: 'Crée personnages, clans, lieux',
  journalist: 'Écrit des articles',
  guest: 'Son compte seulement',
}

// 'role' | 'added' | 'revoked' | 'none' — même règle que rightState() du Worker.
export function previewRightState(role, added, revoked, right) {
  if (role === 'admin') return 'role'
  const inRole = (ROLE_BASE_RIGHTS[role] || []).includes(right)
  const isAdded = added.has(right)
  if (revoked.has(right)) return inRole || isAdded ? 'revoked' : 'none'
  if (inRole) return 'role'
  if (isAdded) return 'added'
  return 'none'
}

export const RIGHT_STATE_TEXT = {
  role: 'Donné par le rôle',
  added: 'Ajouté par toi',
  revoked: 'Retiré par toi',
  none: 'Pas dans ce rôle',
}
