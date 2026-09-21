// worker/lib/originGuard.js
//
// Contrôle de l'en-tête `Origin` des NOUVELLES routes d'écriture (signalement,
// modération, rôles et droits, envoi pour validation). Un navigateur envoie
// toujours `Origin` sur un POST/PUT/PATCH/DELETE ; s'il manque ou s'il ne
// correspond pas au site, la requête est refusée. Les routes existantes ne
// sont volontairement pas modifiées ici.

import { httpError } from './authStore.js'

export function assertSameOrigin(request) {
  const origin = request.headers.get('Origin')
  if (!origin || origin !== new URL(request.url).origin) {
    throw httpError(403, 'Origine de la requête refusée.')
  }
}
