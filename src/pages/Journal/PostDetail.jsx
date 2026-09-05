import { useParams, Link, Navigate } from 'react-router-dom'
import { usePublicPost } from '../../lib/publicData.js'
import { getCharacterById } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import { imgSrc } from '../../lib/image.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
import { ArticleHeading, ArticleBody } from '../../components/ArticleEditor/ArticleReading.jsx'
import './Journal.css'

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
  const hasLinks = characters.length > 0 || locations.length > 0 || post.tags?.length > 0

  return (
    <PageTransition>
      <article className="post post--gazette">
        <div className="container post__hero">
          <nav className="post__folio" aria-label="Navigation du Journal">
            <Link to="/journal" className="post__back">← Le Journal de Woltar</Link>
            <span>Chroniques &amp; illustrations</span>
          </nav>
          <ArticleHeading post={post} />
        </div>

        <div className="container post__reading-shell">
          <Reveal className="post__panel">
            <ArticleBody body={post.body} />
            <div className="post__endmark" aria-hidden="true">✧</div>
          </Reveal>

          {restGallery.length > 0 && (
            <Reveal className="post__gallery">
              <h2>Dans les marges</h2>
              <p className="post__gallery-note">Images et fragments de cette chronique.</p>
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
