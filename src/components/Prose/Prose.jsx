import { useMemo } from 'react'
import { renderMarkdown } from '../../lib/markdown.js'
import './Prose.css'

// Rend un texte markdown (bios, descriptions, billets) en HTML mis en forme.
export default function Prose({ markdown, className = '' }) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown])
  if (!html) return null
  return <div className={`prose ${className}`.trim()} dangerouslySetInnerHTML={{ __html: html }} />
}
