// src/lib/musicSettings.js
//
// Forme normalisée des réglages de musique de fond globale, partagée entre
// le Worker (worker/routes/admin.js, worker/routes/public.js), le plugin Vite
// dev (plugins/woltar-admin.js, plugins/woltar-public.js) et le client
// (src/components/MusicPlayer). Un seul endroit pour la validation/les
// valeurs par défaut, comme src/lib/timelineEvents.js pour les chronologies.
//
// Stockage : table D1 `site_settings` (clé "music", déjà créée par
// migrations/0003_creator_profile_and_character_image_meta.sql, jusqu'ici
// inutilisée) — voir worker/lib/siteSettings.js. En dev, équivalent fichier
// plugins/data/site-settings.json (pas de D1 côté Vite).

export const MUSIC_MODES = ['off', 'single', 'playlist']

export function normalizeTrack(track, index) {
  return {
    id: String(track?.id || '').trim() || `track-${index + 1}`,
    title: String(track?.title || '').trim() || `Piste ${index + 1}`,
    src: String(track?.src || '').trim(),
    order: Number.isFinite(track?.order) ? Number(track.order) : index,
    active: track?.active !== false,
  }
}

export function normalizeMusicSettings(raw) {
  const mode = MUSIC_MODES.includes(raw?.mode) ? raw.mode : 'off'
  const tracksInput = Array.isArray(raw?.tracks) ? raw.tracks : []
  const tracks = tracksInput
    .map((t, i) => normalizeTrack(t, i))
    .filter((t) => t.src)
    .sort((a, b) => a.order - b.order)
  const volume = Number.isFinite(Number(raw?.volume)) ? Math.min(1, Math.max(0, Number(raw.volume))) : 0.4

  return {
    mode,
    loop: raw?.loop !== false,
    shuffle: Boolean(raw?.shuffle),
    volume,
    autoplay: Boolean(raw?.autoplay),
    resume: raw?.resume !== false,
    tracks,
  }
}

export const DEFAULT_MUSIC_SETTINGS = normalizeMusicSettings({})

// Pistes réellement jouables pour le lecteur public (actives, et une seule
// en mode "single") — l'admin, elle, doit voir toutes les pistes (actives ou
// non) pour pouvoir les réactiver : ne pas utiliser cette fonction côté admin.
export function activeTracksFor(settings) {
  if (!settings || settings.mode === 'off') return []
  const active = settings.tracks.filter((t) => t.active)
  return settings.mode === 'single' ? active.slice(0, 1) : active
}
