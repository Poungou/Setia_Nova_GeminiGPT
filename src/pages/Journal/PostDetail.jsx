import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { getPostById, categoryLabel } from '../../data/posts.js'
import { getCharacterById } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import { renderMarkdown } from '../../lib/markdown.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
import './Journal.css'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PostDetail() {
  const { id } = useParams()
  const post = getPostById(id)
  const html = useMemo(() => renderMarkdown(post?.body), [post])

  if (!post || post.visibility === 'draft') return <Navigate to="/journal" replace />

  const characters = (post.characters || []).map(getCharacterById).filter(Boolean)
  const locations = (post.locations || []).map(getLocationById).filter(Boolean)

  return (
    <PageTransition>
      <article className="container post">
        <Reveal className="post__head">
          <Link to="/journal" className="post__back">
            ← Journal
          </Link>
          <span className="eyebrow">
            {categoryLabel(post.category)} · {formatDate(post.date)}
            {post.author ? ` · ${post.author}` : ''}
          </span>
          <h1 className="section-title">{post.title}</h1>
        </Reveal>

        {post.cover && (
          <Reveal className="post__cover" y={16}>
            <img src={post.cover} alt="" />
          </Reveal>
        )}

        {html && (
          <Reveal className="post__body-wrap">
            <div className="post__body" dangerouslySetInnerHTML={{ __html: html }} />
          </Reveal>
        )}

        {post.gallery?.length > 0 && (
          <Reveal className="post__gallery">
            <h2 className="eyebrow">Galerie</h2>
            <Lightbox images={post.gallery} />
          </Reveal>
        )}

        {(characters.length > 0 || locations.length > 0 || post.tags?.length > 0) && (
          <Reveal className="post__links">
            {characters.length > 0 && (
              <p>
                <span className="eyebrow">Personnages</span>
                {characters.map((c) => (
                  <Link key={c.id} to={`/personnages/${c.id}`} className="post__chip">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ')}
                  </Link>
                ))}
              </p>
            )}
            {locations.length > 0 && (
              <p>
                <span className="eyebrow">Lieux</span>
                {locations.map((l) => (
                  <Link key={l.id} to={`/lieux/${l.id}`} className="post__chip">
                    {l.name}
                  </Link>
                ))}
              </p>
            )}
            {post.tags?.length > 0 && (
              <p>
                <span className="eyebrow">Mots-clés</span>
                {post.tags.map((t) => (
                  <span key={t} className="post__chip post__chip--tag">
                    {t}
                  </span>
                ))}
              </p>
            )}
          </Reveal>
        )}
      </article>
    </PageTransition>
  )
}
