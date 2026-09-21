// worker/lib/permissions.js
//
// Module central des rôles et des droits. TOUTE vérification de droit du
// Worker passe par `can(user, right)` : plus aucun contrôle sur l'ancien
// `users.status` (Membre / RPiste / Invité), qui n'est plus lu nulle part.
//
// Droits effectifs = (droits de base du rôle + droits ajoutés) - droits retirés
//   - droits de base : ROLE_BASE_RIGHTS ci-dessous
//   - droits ajoutés : lignes `user_permissions` à granted = 1 (héritage de
//     l'ancien système, conservées telles quelles à la migration)
//   - droits retirés : table `user_revoked_rights` (migration 0014) — une
//     table dédiée, car `user_permissions` dit « absent = refusé » alors qu'un
//     retrait doit dire « présent = retiré au compte malgré son rôle ».
// L'admin a tous les droits, sans exception, et rien ne peut lui être retiré.

export const ROLES = ['admin', 'creator', 'journalist', 'guest']

export const ROLE_LEVEL = { admin: 0, creator: 1, journalist: 2, guest: 3 }

export const ROLE_LABELS = {
  admin: 'Admin',
  creator: 'Créateur',
  journalist: 'Journaliste',
  guest: 'Invité',
}

// Rôles qu'un admin peut attribuer depuis l'interface / l'API. `admin` n'y
// figure volontairement jamais.
export const ASSIGNABLE_ROLES = ['creator', 'journalist', 'guest']

// Clés historiques conservées (aucune migration de données) : le droit
// « écrire des articles » reste `create_journal_article`.
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
  create_journal_article: 'Écrire des articles',
  create_timeline: 'Créer des chronologies',
}

export const RIGHTS = Object.keys(PERMISSION_LABELS)

export const ROLE_BASE_RIGHTS = {
  admin: RIGHTS,
  creator: ['create_character', 'create_clan', 'create_location'],
  journalist: ['create_journal_article'],
  guest: [],
}

// Droits liés à la fiche de joueur (/compte/profil) : réservés aux rôles qui
// créent des personnages. Ce n'est pas un droit retirable individuellement.
export const PLAYER_PROFILE_ROLES = ['admin', 'creator']

// Un ancien rôle `user` (avant la migration 0014) vaut `guest`.
export function normalizeRole(role) {
  if (ROLES.includes(role)) return role
  return 'guest'
}

export function roleOf(user) {
  return normalizeRole(user?.role)
}

export function baseRightsOf(role) {
  return ROLE_BASE_RIGHTS[normalizeRole(role)] || []
}

function revokedSet(user) {
  return new Set(Array.isArray(user?.revokedRights) ? user.revokedRights : [])
}

// État d'un droit pour un compte, tel qu'affiché par l'admin :
//   'role'    — donné par le rôle
//   'added'   — ajouté à ce compte (hors rôle)
//   'revoked' — retiré à ce compte alors que son rôle le donne
//   'none'    — pas dans ce rôle, et pas ajouté
export function rightState(user, right) {
  const role = roleOf(user)
  if (role === 'admin') return 'role'
  const inRole = baseRightsOf(role).includes(right)
  const added = user?.permissions?.[right] === true
  if (revokedSet(user).has(right)) return inRole || added ? 'revoked' : 'none'
  if (inRole) return 'role'
  if (added) return 'added'
  return 'none'
}

export function getEffectiveRights(user) {
  if (!user?.id || user.disabled) return []
  if (roleOf(user) === 'admin') return [...RIGHTS]
  return RIGHTS.filter((right) => {
    const state = rightState(user, right)
    return state === 'role' || state === 'added'
  })
}

export function can(user, right) {
  return getEffectiveRights(user).includes(right)
}

// Alias historique : `canCreate(user, 'create_clan')`.
export function canCreate(user, permission) {
  return can(user, permission)
}

// Le rôle admin passe toujours ; utilisé pour la modération et la gestion
// des comptes (vérifié côté serveur dans chaque route concernée).
export function canModerate(user) {
  return Boolean(user?.id && !user.disabled && roleOf(user) === 'admin')
}

export function canManagePlayerProfile(user) {
  return Boolean(user?.id && !user.disabled && PLAYER_PROFILE_ROLES.includes(roleOf(user)))
}

export function normalizePermissions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, granted]) => /^[a-z][a-z0-9_]{1,63}$/.test(key) && typeof granted === 'boolean')
      .map(([key, granted]) => [key, granted]),
  )
}
