import DOMPurify from 'dompurify'
import { renderMarkdown } from '../../lib/markdown.js'

export function isSafeArticleUrl(value, image = false) {
  const url = String(value || '').trim()
  if (!url || /[\s\\]/.test(url) || [...url].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false
  if (/^\/(?!\/)/.test(url)) return true
  if (!image && (/^#[^\s]*$/.test(url) || /^mailto:[^\s@]+@[^\s@]+$/i.test(url))) return true
  if (!/^https?:\/\//i.test(url)) return false
  try { return Boolean(new window.URL(url).hostname) } catch { return false }
}

export function sanitizeArticleHtml(html) {
  const clean = DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } })
  const template = document.createElement('template')
  template.innerHTML = clean
  template.content.querySelectorAll('[href], [src]').forEach((element) => {
    for (const attribute of ['href', 'src']) {
      if (element.hasAttribute(attribute) && !isSafeArticleUrl(element.getAttribute(attribute), attribute === 'src')) {
        element.removeAttribute(attribute)
      }
    }
  })
  return template.innerHTML
}

export function articleHtml(body) {
  return sanitizeArticleHtml(renderMarkdown(body || ''))
}

export function articleText(body) {
  const template = document.createElement('div')
  template.innerHTML = articleHtml(body)
  template.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, figcaption, br').forEach((element) => element.append(' '))
  return (template.textContent || '').replace(/\s+/g, ' ').trim()
}

export function formatArticleDate(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
