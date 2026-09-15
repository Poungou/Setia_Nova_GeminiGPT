import bundled from '../data/home.json' with { type: 'json' }

// Shared by the public page, editor and both server implementations.
export const HOME_DEFAULTS = {
  ...bundled[0],
  windowImage: '/media/fond_sombre.jfif', windowTitle: 'Woltar Nova',
  windowEyebrow: 'Un univers, mille histoires', playersLabel: 'Rencontrer les joueurs', playersUrl: '/joueurs',
  charactersStat: 'Personnages à découvrir', locationsStat: 'Lieux à explorer', storiesStat: 'Histoires à écrire',
  cultureEyebrow: '01 / TRANSMETTRE', cultureTitle: 'Les cultures vivantes',
  cultureDescription: 'Coutumes, croyances et petits rituels : découvrez ce que chacun fait vivre dans son univers.',
  cultureCtaLabel: 'Découvrir les cultures', cultureCtaUrl: '/culture',
  journalEyebrow: '02 / FEUILLETER', journalTitle: 'Au fil des récits',
  journalDescription: 'Des nouvelles, des instants partagés et les traces laissées par les histoires.',
  aetherEyebrow: '03 / S’INSPIRER', aetherTitle: 'Une rencontre avec Aether',
  aetherDescription: 'Une présence pour échanger et laisser naître de nouvelles idées.',
  charactersEyebrow: 'Les visages derrière les histoires', charactersTitle: 'Visages de Woltar', charactersLinkLabel: 'Tous les personnages',
  locationsEyebrow: 'D’un lieu à l’autre', locationsTitle: 'Les lieux de Woltar Nova', locationsLinkLabel: 'Explorer l’univers',
  darkBackgroundFallback: '/media/fond_sombre.jfif', darkBackgroundVideo: '/media/fond_sombre_anime.mp4',
}

export const HOME_GROUPS = [
  ['Bienvenue', ['eyebrow', 'title', 'subtitle', 'communityNote', 'primaryCtaLabel', 'primaryCtaUrl', 'secondaryCtaLabel', 'secondaryCtaUrl']],
  ['Fenêtre illustrée', ['windowImage', 'windowTitle', 'windowEyebrow', 'intro', 'playersLabel', 'playersUrl']],
  ['Compteurs automatiques', ['charactersStat', 'locationsStat', 'storiesStat']],
  ['Carte Cultures', ['cultureEyebrow', 'cultureTitle', 'cultureDescription', 'cultureCtaLabel', 'cultureCtaUrl']],
  ['Carte Journal', ['journalEyebrow', 'journalTitle', 'journalDescription', 'journalCtaLabel', 'journalCtaUrl']],
  ['Carte Aether', ['aetherEyebrow', 'aetherTitle', 'aetherDescription', 'aetherCtaLabel', 'aetherCtaUrl']],
  ['Galerie de personnages', ['charactersEyebrow', 'charactersTitle', 'charactersLinkLabel']],
  ['Galerie de lieux', ['locationsEyebrow', 'locationsTitle', 'locationsLinkLabel']],
  ['Fonds du site', ['lightBackgroundFallback', 'lightBackgroundVideo', 'darkBackgroundFallback', 'darkBackgroundVideo']],
]

const LABELS = {
  eyebrow: 'Petit titre', title: 'Titre principal', subtitle: 'Présentation', communityNote: 'Note communautaire',
  primaryCtaLabel: 'Texte du bouton principal', primaryCtaUrl: 'Lien principal', secondaryCtaLabel: 'Texte du lien secondaire', secondaryCtaUrl: 'Lien secondaire',
  windowImage: 'Adresse de l’image', windowTitle: 'Titre sur l’image', windowEyebrow: 'Petit titre de la citation', intro: 'Citation', playersLabel: 'Texte du lien joueurs', playersUrl: 'Lien joueurs',
  charactersStat: 'Libellé personnages', locationsStat: 'Libellé lieux', storiesStat: 'Libellé histoires',
  lightBackgroundFallback: 'Image du thème clair', lightBackgroundVideo: 'Vidéo du thème clair', darkBackgroundFallback: 'Image du thème sombre', darkBackgroundVideo: 'Vidéo du thème sombre',
}
export const HOME_FIELDS = HOME_GROUPS.flatMap(([group, keys]) => keys.map(key => ({
  key, group,
  label: LABELS[key] || (key.endsWith('Eyebrow') ? 'Petit titre' : key.endsWith('Title') ? 'Titre' : key.endsWith('Description') ? 'Description' : key.endsWith('Url') ? 'Lien' : 'Texte du lien'),
  type: /Description$/.test(key) || ['subtitle', 'communityNote', 'intro', 'title'].includes(key) ? 'textarea' : 'text',
  hint: /Video$/.test(key) ? 'Adresse de la vidéo MP4. Laisser vide pour utiliser uniquement l’image.' : /(Image|Fallback)$/.test(key) ? 'Adresse de l’image (https://… ou /media/…). Les images peuvent être remplacées par leur URL.' : /Url$/.test(key) ? 'Chemin du site (/culture par exemple) ou adresse https://…' : group === 'Compteurs automatiques' ? 'Le nombre est calculé à partir des fiches publiques.' : undefined,
})))

export function normalizeHomeSettings(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return Object.fromEntries(Object.entries(HOME_DEFAULTS).map(([key, fallback]) => {
    let value = typeof source[key] === 'string' ? source[key].trim().slice(0, 5000) : fallback
    if (/(Url|Image|Fallback|Video)$/.test(key) && value) {
      // Site-local paths or web URLs only; never script/data/protocol-relative URLs.
      const local = /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)
      let web = false
      try { web = ['https:', 'http:'].includes(new globalThis.URL(value).protocol) } catch { /* local path */ }
      if (!local && !web) value = fallback
    }
    return [key, key === 'id' ? 'home' : value]
  }))
}
