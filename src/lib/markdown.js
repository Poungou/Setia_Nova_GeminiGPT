// src/lib/markdown.js
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

// Convertit du markdown en HTML nettoyé (pas de <script>, pas d'attributs
// d'événements). Le contenu vient de l'admin (toi, puis des joueurs validés),
// mais on nettoie quand même par principe.
export function renderMarkdown(md) {
  if (!md) return ''
  const raw = marked.parse(md, { async: false })
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}

// Petit extrait texte (pour les cartes) à partir du markdown.
export function excerptFromMarkdown(md, max = 160) {
  if (!md) return ''
  const text = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
