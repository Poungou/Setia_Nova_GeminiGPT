import creatorData from './creator.json'

export const DEFAULT_CREATOR_PROFILE = {
  id: 'creator',
  displayName: 'Poungou',
  photo: {
    src: '/media/fudo-presentation-mtg1r17u.webp',
    focus: '50% 18%',
  },
  bio: 'Je rassemble ici mes personnages, leurs liens, leurs lieux et les fragments RP qui composent mon coin de Woltar. Nova-Setia est mon carnet vivant : une vitrine personnelle pour retrouver les histoires, garder les sources sous la main et ouvrir de nouvelles pistes de jeu.',
}

export function normalizeCreatorProfile(profile) {
  const source = profile && typeof profile === 'object' ? profile : {}
  const displayName = String(source.displayName || source.name || DEFAULT_CREATOR_PROFILE.displayName).trim()
  const bio = String(source.bio || DEFAULT_CREATOR_PROFILE.bio).trim()
  const photoSrc = typeof source.photo === 'string' ? source.photo.trim() : source.photo?.src

  return {
    ...DEFAULT_CREATOR_PROFILE,
    ...source,
    id: 'creator',
    displayName: displayName || DEFAULT_CREATOR_PROFILE.displayName,
    photo: photoSrc ? source.photo : DEFAULT_CREATOR_PROFILE.photo,
    bio: bio || DEFAULT_CREATOR_PROFILE.bio,
  }
}

export const creatorProfile = normalizeCreatorProfile(creatorData[0])
