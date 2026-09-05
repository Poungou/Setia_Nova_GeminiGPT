import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryLabel, POST_CATEGORIES } from '../../data/posts.js'
import { usePublicPosts } from '../../lib/publicData.js'
import { articleText } from '../../components/ArticleEditor/articleContent.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import FilterBar from '../../components/FilterBar/FilterBar.jsx'
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
        <Reveal className="section-heading">
          <span className="eyebrow">Journal</span>
          <h1 className="section-title">Le journal de Woltar</h1>
          <p className="journal-page__intro">
            Fan arts, chapitres d&rsquo;histoire, notes d&rsquo;univers et nouvelles. Un espace qui
            grandit au fil des envies.
          </p>
        </Reveal>

        <div className="journal-page__controls">
          <FilterBar filters={FILTERS} active={category} onChange={setCategory} />
        </div>

        {list.length > 0 ? (
          <div className="journal-grid">
            {list.map((post, i) => (
              <Reveal key={post.id} as="article" className="journal-card" delay={Math.min(i * 0.05, 0.3)}>
                <Link
                  to={`/journal/${post.id}`}
                  className={`journal-card__link${imgSrc(post.cover) ? '' : ' journal-card__link--nocover'}`}
                >
                  {imgSrc(post.cover) && (
                    <div className="journal-card__cover">
                      <img
                        src={imgSrc(post.cover)}
                        alt=""
                        loading="lazy"
                        style={{ objectPosition: imgFocus(post.cover) }}
                      />
                    </div>
                  )}
                  <div className="journal-card__body">
                    <span className="journal-card__meta">
                      {categoryLabel(post.category)} · {formatDate(post.date)}
                    </span>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt || articleText(post.body).slice(0, 160)}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Rien ici pour l&rsquo;instant</strong>
            Les premiers billets arriveront bientôt.
          </div>
        )}
      </section>
    </PageTransition>
  )
}
