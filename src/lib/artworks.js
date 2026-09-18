// src/lib/artworks.js
// Agrège toutes les images du site en une galerie unique (pas de double saisie :
// on réutilise les images des billets, des fiches perso, des lieux et des
// pages du carnet des cultures).

import { publishedPosts } from '../data/posts.js'
import { characters } from '../data/characters.js'
import { locations } from '../data/locations.js'
import { imgCredit, imgSrc } from './image.js'

// Ordre volontaire : les personnages et les lieux d'abord (ce sont les
// catégories que les visiteurs viennent chercher), la culture ensuite, le
// journal en dernier (illustrations « de contexte » plutôt qu'une catégorie
// de sujet à part entière).
export const ARTWORK_SOURCES = [
  { value: 'personnages', label: 'Personnages' },
  { value: 'lieux', label: 'Lieux' },
  { value: 'culture', label: 'Culture' },
  { value: 'journal', label: 'Journal' },
]

export function collectArtworks({
  posts = publishedPosts,
  people = characters,
  places = locations,
  cultures = [],
} = {}) {
  const items = []
  const push = (value, base) => {
    if (!imgSrc(value)) return
    items.push({ src: imgSrc(value), ...base })
  }

  people.filter(c => c.visibility !== 'draft').forEach((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
    push(c.portrait, { title: name, credit: imgCredit(c.portrait, c.image_source), to: `/personnages/${c.id}`, source: 'personnages', tags: c.tags || [] })
    ;(c.gallery || []).forEach((v) =>
      push(v, { title: name, credit: imgCredit(v, c.gallery_sources?.[imgSrc(v)]), to: `/personnages/${c.id}`, source: 'personnages', tags: c.tags || [] }),
    )
  })

  places.filter(l => l.visibility !== 'draft').forEach((l) => {
    push(l.image, { title: l.name, to: `/lieux/${l.id}`, source: 'lieux', tags: [] })
    ;(l.gallery || []).forEach((v) =>
      push(v, { title: l.name, to: `/lieux/${l.id}`, source: 'lieux', tags: [] }),
    )
  })

  cultures.forEach((post) => {
    push(post.image, { title: post.title, credit: post.imageCredit, to: `/culture/${post.id}`, source: 'culture', tags: post.tagIds || [] })
  })

  posts.filter(p => p.visibility !== 'draft').forEach((p) => {
    push(p.cover, { title: p.title, credit: p.author, to: `/journal/${p.id}`, source: 'journal', date: p.date, tags: p.tags || [] })
    ;(p.gallery || []).forEach((v) =>
      push(v, { title: p.title, credit: p.author, to: `/journal/${p.id}`, source: 'journal', date: p.date, tags: p.tags || [] }),
    )
  })

  // dédoublonne par src
  const seen = new Set()
  return items.filter((it) => (seen.has(it.src) ? false : seen.add(it.src)))
}
