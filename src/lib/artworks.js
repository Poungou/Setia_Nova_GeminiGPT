// src/lib/artworks.js
// Agrège toutes les images du site en une galerie unique (pas de double saisie :
// on réutilise les images des billets, des fiches perso et des lieux).

import { publishedPosts } from '../data/posts.js'
import { characters } from '../data/characters.js'
import { locations } from '../data/locations.js'
import { imgCredit, imgSrc } from './image.js'

export const ARTWORK_SOURCES = [
  { value: 'all', label: 'Tout' },
  { value: 'journal', label: 'Journal' },
  { value: 'personnages', label: 'Personnages' },
  { value: 'lieux', label: 'Lieux' },
]

export function collectArtworks() {
  const items = []
  const push = (value, base) => {
    if (!imgSrc(value)) return
    items.push({ src: imgSrc(value), ...base })
  }

  publishedPosts.forEach((p) => {
    push(p.cover, { title: p.title, credit: p.author, to: `/journal/${p.id}`, source: 'journal', date: p.date, tags: p.tags || [] })
    ;(p.gallery || []).forEach((v) =>
      push(v, { title: p.title, credit: p.author, to: `/journal/${p.id}`, source: 'journal', date: p.date, tags: p.tags || [] }),
    )
  })

  characters.forEach((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
    push(c.portrait, { title: name, credit: imgCredit(c.portrait, c.image_source), to: `/personnages/${c.id}`, source: 'personnages', tags: c.tags || [] })
    ;(c.gallery || []).forEach((v) =>
      push(v, { title: name, credit: imgCredit(v, c.gallery_sources?.[imgSrc(v)]), to: `/personnages/${c.id}`, source: 'personnages', tags: c.tags || [] }),
    )
  })

  locations.forEach((l) => {
    push(l.image, { title: l.name, to: `/lieux/${l.id}`, source: 'lieux', tags: [] })
    ;(l.gallery || []).forEach((v) =>
      push(v, { title: l.name, to: `/lieux/${l.id}`, source: 'lieux', tags: [] }),
    )
  })

  // dédoublonne par src
  const seen = new Set()
  return items.filter((it) => (seen.has(it.src) ? false : seen.add(it.src)))
}
