// src/data/posts.js
// Journal de Woltar : fan arts, chapitres d'histoire, notes, nouvelles.
// Source de vérité : src/data/posts.json (édité via /admin).
//
// Schéma d'un billet :
//   { id, title, category, date (AAAA-MM-JJ), excerpt, cover, body (markdown),
//     gallery: [], characters: [], locations: [], tags: [], author, visibility }

import postsData from './posts.json'

export const POST_CATEGORIES = [
  { value: 'fan-art', label: 'Fan art' },
  { value: 'chapitre', label: "Chapitre d'histoire" },
  { value: 'note', label: 'Note' },
  { value: 'news', label: 'Nouvelle' },
]

export function categoryLabel(value) {
  return POST_CATEGORIES.find((c) => c.value === value)?.label || value || '—'
}

const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''))

export const posts = [...postsData].sort(byDateDesc)

// Ce que le site public affiche (les brouillons restent privés).
export const publishedPosts = posts.filter((p) => p.visibility !== 'draft')

export function getPostById(id) {
  return posts.find((p) => p.id === id)
}
