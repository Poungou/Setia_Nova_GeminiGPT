import { useParams, Link, Navigate } from 'react-router-dom'
import { categoryLabel } from '../../data/posts.js'
import { usePublicPost } from '../../lib/publicData.js'
import { getCharacterById } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
import Prose from '../../components/Prose/Prose.jsx'
import './Journal.css'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PostDetail() {
  const { id } = useParams()
  const { post, loading } = usePublicPost(id)

  if (loading) return <div className="container">Chargement...</div>
  if (!post || post.visibility === 'draft') return <Navigate to="/journal" replace />

  const characters = (post.characters || []).map(getCharacterById).filter(Boolean)
  const locations = (post.locations || []).map(getLocationById).filter(Boolean)
  const gallery = post.gallery || []
  const hero = post.cover || gallery[0] || ''
  const heroSrc = imgSrc(hero)
  const hasCover = Boolean(imgSrc(post.cover))
  const restGallery = gallery.filter((image, index) => {
    if (!heroSrc) return true
    if (!hasCover && index === 0) return false
    return imgSrc(image) !== heroSrc
  })
  const hasBody = Boolean(post.body?.trim())
  const lede = post.excerpt?.trim()
  const hasLinks = characters.length > 0 || locations.length > 0 || post.tags?.length > 0

  return (
    <PageTransition>
      <article className="post">
        <header className="container post__hero">
          <Reveal className="post__intro">
            <Link to="/journal" className="post__back">
              ← Journal
            </Link>
            <span className="eyebrow post__meta">
              {categoryLabel(post.category)} · {formatDate(post.date)}
              {post.author ? ` · ${post.author}` : ''}
            </span>
            <h1 className="post__title">{post.title}</h1>
            {lede && <p className="post__lede">{lede}</p>}
          </Reveal>

          {heroSrc && (
            <Reveal className="post__cover">
              <img src={heroSrc} alt="" style={{ objectPosition: imgFocus(hero) }} />
            </Reveal>
          )}
        </header>

        <div className="container post__reading-shell">
          <Reveal className="post__panel">
            {hasBody ? (
              <Prose markdown={post.body} />
            ) : (
              <p className="post__empty">Le texte de ce billet sera ajouté ici quand il sera prêt.</p>
            )}
          </Reveal>

          {restGallery.length > 0 && (
            <Reveal className="post__gallery">
              <h2 className="eyebrow">Galerie</h2>
              <Lightbox images={restGallery.map((v) => ({ src: imgSrc(v), alt: post.title }))} />
            </Reveal>
          )}

          {hasLinks && (
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
                    <Link key={t} to={`/tag/${encodeURIComponent(t)}`} className="post__chip post__chip--tag">
                      {t}
                    </Link>
                  ))}
                </p>
              )}
            </Reveal>
          )}
        </div>
      </article>
    </PageTransition>
  )
}
