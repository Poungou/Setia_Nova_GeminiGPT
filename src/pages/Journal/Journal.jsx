import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageOff, Feather, ArrowUpRight, Search } from 'lucide-react'
import { categoryLabel, POST_CATEGORIES } from '../../data/posts.js'
import { usePublicPosts } from '../../lib/publicData.js'
import { articleText } from '../../components/ArticleEditor/articleContent.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import Reveal from '../../components/Reveal/Reveal.jsx'
import SafeImage from '../../components/SafeImage/SafeImage.jsx'
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
  const [query, setQuery] = useState('')
  const posts = usePublicPosts()

  const list = useMemo(
    () => posts.filter(post => post.visibility !== 'draft' && (category === 'all' || post.category === category) && `${post.title} ${post.author || ''} ${post.excerpt || ''}`.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [category, posts, query],
  )

  return (
    <PageTransition>
      <section className="container journal-page">
        <Reveal className="journal-masthead">
          <div className="journal-edition"><span>Woltar Nova · Publication communautaire</span><Feather size={18} aria-hidden="true" /><span>Récits & créations</span></div>
          <p className="journal-masthead__kicker">Des plumes, des regards, des histoires.</p>
          <h1>Le <em>Journal</em><span className="journal-masthead__seal" aria-hidden="true">W<br />N</span></h1>
          <p className="journal-page__intro">
            Les histoires se vivent. Ici, elles laissent une trace.
          </p>
          <div className="journal-masthead__rule"><span>Chroniques · Récits · Illustrations</span><span aria-hidden="true">✧</span><Link to="/compte/articles">Mes articles <ArrowUpRight size={13} aria-hidden="true" /></Link></div>
        </Reveal>

        <div className="journal-toolbar"><nav className="journal-page__controls" aria-label="Rubriques du Journal">
          {FILTERS.map((filter) => <button key={filter.value} type="button" aria-pressed={category === filter.value} onClick={() => setCategory(filter.value)}>{filter.label}</button>)}
        </nav><label className="journal-search"><Search size={15} aria-hidden="true" /><span className="visually-hidden">Rechercher un article ou un auteur</span><input type="search" placeholder="Un titre, une plume…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        <div className="journal-index"><span>Au sommaire</span><span role="status">{list.length} article{list.length > 1 ? 's' : ''}</span></div>

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
                      <SafeImage
                        fallback={<ImageOff size={24} aria-hidden="true" />}
                        src={imgSrc(post.cover)}
                        alt=""
                        loading="lazy"
                        style={{ objectPosition: imgFocus(post.cover) }}
                      />
                    </div>
                  )}
                  <div className="journal-entry__body">
                    <span className="journal-entry__rubric">{i === 0 ? 'À la une' : `Lecture ${String(i + 1).padStart(2, '0')}`}</span>
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
            <strong>{posts.length ? 'Aucun article pour cette sélection' : 'La première page reste à écrire'}</strong>
            {posts.length ? <button type="button" onClick={() => { setCategory('all'); setQuery('') }}>Voir tous les articles</button> : <p>Les articles publiés par la communauté apparaîtront ici.</p>}
          </div>
        )}
        <footer className="journal-colophon"><Feather size={25} aria-hidden="true" /><p><strong>Le journal s’écrit à plusieurs.</strong><span>Une illustration, un récit, une nouvelle : chaque contribution trouve sa page.</span></p><Link to="/compte/articles">Mon espace d’écriture <ArrowUpRight size={16} aria-hidden="true" /></Link></footer>
      </section>
    </PageTransition>
  )
}
