import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryLabel, POST_CATEGORIES } from '../../data/posts.js'
import { usePublicPosts } from '../../lib/publicData.js'
import { articleText } from '../../components/ArticleEditor/articleContent.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import './Journal.css'

const FILTERS = [{ value: 'all', label: 'Tout' }, ...POST_CATEGORIES]

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Journal() {
  const [category, setCategory] = useState('all')
  const posts = usePublicPosts()

  const list = useMemo(
    () => (category === 'all' ? posts : posts.filter((p) => p.category === category)),
    [category, posts],
  )

  return (
    <PageTransition>
      <section className="container journal-page">
        <Reveal className="journal-masthead">
          <p className="journal-masthead__kicker">Chroniques · Récits · Illustrations</p>
          <h1>Le Journal de Woltar</h1>
          <p className="journal-page__intro">
            Des histoires au fil des jours, des images au détour des pages.
          </p>
          <div className="journal-masthead__rule"><span>Les voix de l’univers</span><span aria-hidden="true">✧</span><span>Le carnet de la communauté</span></div>
        </Reveal>

        <nav className="journal-page__controls" aria-label="Rubriques du Journal">
          {FILTERS.map((filter) => <button key={filter.value} type="button" aria-pressed={category === filter.value} onClick={() => setCategory(filter.value)}>{filter.label}</button>)}
        </nav>

        {list.length > 0 ? (
          <div className="journal-grid" aria-label="Articles du Journal">
            {list.map((post, i) => (
              <Reveal key={post.id} as="article" className={`journal-entry${i === 0 ? ' journal-entry--lead' : ''}`} delay={Math.min(i * 0.05, 0.3)}>
                <Link
                  to={`/journal/${post.id}`}
                  className={`journal-entry__link${imgSrc(post.cover) ? '' : ' journal-entry__link--text'}`}
                >
                  {imgSrc(post.cover) && (
                    <div className="journal-entry__illustration">
                      <img
                        src={imgSrc(post.cover)}
                        alt=""
                        loading="lazy"
                        style={{ objectPosition: imgFocus(post.cover) }}
                      />
                    </div>
                  )}
                  <div className="journal-entry__body">
                    {i === 0 && <span className="journal-entry__rubric">À la une</span>}
                    <div className="journal-entry__meta">
                      <span>{categoryLabel(post.category)}</span>{post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
                    </div>
                    <h2>{post.title}</h2>
                    <p className="journal-entry__excerpt">{post.excerpt || articleText(post.body).slice(0, i === 0 ? 260 : 160)}</p>
                    <div className="journal-entry__signature">{post.author && <span>Par {post.author}</span>}<span className="journal-entry__read">Lire la chronique <span aria-hidden="true">↗</span></span></div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="journal-empty">
            <strong>Rien ici pour l&rsquo;instant</strong>
            Les premiers billets arriveront bientôt.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
