// src/admin/localAuth.js
//
// Verrou local léger pour /admin en attendant la connexion Google (Piste A).
// Ce n'est PAS de la sécurité : l'admin ne tourne qu'en local sur ta machine.
// Change la phrase ci-dessous si tu veux.

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
