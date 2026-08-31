// src/admin/localAuth.js
//
// Ancien verrou local côté navigateur, conservé pour compatibilité avec les
// notes historiques. /admin utilise maintenant la session serveur créée par
// plugins/woltar-auth.js ; cette phrase ne protège plus l'API admin.

export const LOCAL_PASSPHRASE = 'woltar'

const KEY = 'woltar-admin-unlocked'

export function isUnlocked() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function unlock(passphrase) {
  if (passphrase !== LOCAL_PASSPHRASE) return false
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
  return true
}

export function lock() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
