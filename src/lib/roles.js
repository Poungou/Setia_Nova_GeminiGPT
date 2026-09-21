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
