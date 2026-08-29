import { characters } from '../data/characters.js'
import { locations } from '../data/locations.js'

export function getSiteStats() {
  return {
    characterCount: characters.length,
    locationCount: locations.filter((l) => l.canon === 'confirmed').length,
  }
}
