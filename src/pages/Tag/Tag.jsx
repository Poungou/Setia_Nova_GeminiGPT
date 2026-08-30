import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { characters } from '../../data/characters.js'
import { publishedPosts, categoryLabel } from '../../data/posts.js'
import { events } from '../../data/events.js'
import CharacterCard from '../../components/CharacterCard/CharacterCard.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Tag.css'

const has = (arr, tag) => (arr || []).some((t) => t.toLowerCase() === tag.toLowerCase())

export default function Tag() {
  const { tag: raw } = useParams()
  const tag = decodeURIComponent(raw || '')

  const { chars, posts, evts } = useMemo(
    () => ({
      chars: characters.filter((c) => has(c.tags, tag)),
      posts: publishedPosts.filter((p) => has(p.tags, tag)),
      evts: events.filter((e) => has(e.tags, tag)),
    }),
    [tag],
  )

  const total = chars.length + posts.length + evts.length

  return (
    <PageTransition>
      <section className="container tag-page">
        <Reveal className="section-heading">
          <span className="eyebrow">Mot-clé</span>
          <h1 className="section-title">#{tag}</h1>
          <p className="tag-page__intro">
            {total > 0
              ? `${total} élément${total > 1 ? 's' : ''} rattaché${total > 1 ? 's' : ''} à ce mot-clé.`
              : 'Rien n’est encore rattaché à ce mot-clé.'}
          </p>
        </Reveal>

        {posts.length > 0 && (
          <Reveal as="section" className="tag-group">
            <h2 className="eyebrow">Journal</h2>
            <ul className="tag-list">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link to={`/journal/${p.id}`}>
                    <strong>{p.title}</strong>
                    <span>{categoryLabel(p.category)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {chars.length > 0 && (
          <Reveal as="section" className="tag-group">
            <h2 className="eyebrow">Personnages</h2>
            <div className="characters-page__grid">
              {chars.map((c, i) => (
                <CharacterCard key={c.id} character={c} index={i} />
              ))}
            </div>
          </Reveal>
        )}

        {evts.length > 0 && (
          <Reveal as="section" className="tag-group">
            <h2 className="eyebrow">Chronologie</h2>
            <ul className="tag-list">
              {evts.map((e) => (
                <li key={e.id}>
                  <Link to="/chronologie">
                    <strong>{e.title}</strong>
                    <span>{e.dateRP}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <p>
          <Link to="/" className="btn">
            ← Accueil
          </Link>
        </p>
      </section>
    </PageTransition>
  )
}
