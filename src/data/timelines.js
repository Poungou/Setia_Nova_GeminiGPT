// src/data/timelines.js
// Source de vérité pour la chronologie CANON : src/data/timelines.json
// (métadonnées : titre, description, spoiler) + src/data/events.json (les
// événements eux-mêmes, inchangés — voir src/lib/timelineEvents.js pour le
// détail du repli canon). Les chronologies créées par un compte joueur
// vivent en D1 en production (voir worker/lib/contentStore.js) et n'ont pas
// de repli statique ici — ce fichier ne sert que de premier rendu instantané
// pour /chronologie, avant l'hydratation "live" via /__public/api/timelines
// (voir src/lib/publicData.js#usePublicTimelines).

import timelinesData from './timelines.json'
import { events as staticEvents } from './events.js'
import { resolveTimelineEvents } from '../lib/timelineEvents.js'

export const timelines = timelinesData.map((timeline) => ({
  ...timeline,
  events: resolveTimelineEvents(timeline, staticEvents),
}))

export function getTimelineById(id) {
  return timelines.find((timeline) => timeline.id === id)
}
