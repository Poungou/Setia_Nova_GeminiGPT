import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Feather, ArrowUpRight, Search, Sparkles } from 'lucide-react'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import { excerptFromMarkdown } from '../../lib/markdown.js'
import { useCulture } from './useCulture.js'
import './Culture.css'

export default function Culture() {
  const { posts, tags, user, loading, error, reload } = useCulture()
  const [params, setParams] = useSearchParams()
  const tagId = params.get('tag') || ''
  const mine = params.get('mes') === '1'
  const [query, setQuery] = useState('')
  const change = (key, value) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }
  const visible = posts.filter(post => (!tagId || post.tagIds.includes(tagId)) && (!mine || post.ownerUserId === user?.id) && `${post.title} ${post.summary} ${post.authorName}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))
  return <PageTransition><section className="container culture-page">
    <header className="culture-hero">
      <div><span className="eyebrow">L’univers, raconté par vous</span><h1>Le carnet<br />des <em>cultures.</em></h1><p>Les gestes que l’on transmet. Les fêtes que l’on attend. Les histoires qui nous rassemblent.</p>
        <div className="culture-actions"><Link className="btn culture-primary" to={user ? '/culture/nouveau' : '/compte'}><Feather size={17} /> {user ? 'Partager ma culture' : 'Me connecter pour contribuer'}</Link>{user?.role === 'admin' && <Link className="btn" to="/admin/culture">Gérer les hashtags</Link>}</div>
      </div>
      <aside className="culture-hero__note"><Sparkles size={28} aria-hidden="true" /><span className="eyebrow">Une mosaïque de voix</span><p>Une coutume de famille, une recette de voyage, une croyance singulière… Chaque contribution ouvre une fenêtre sur votre univers.</p><small>Des créations de joueurs, publiées dès leur partage.</small></aside>
    </header>
    <div className="culture-toolbar"><h2><BookOpen size={20} /> Les pages du carnet <span>{posts.length}</span></h2><label className="culture-search"><Search size={17} /><span className="sr-only">Rechercher une culture</span><input placeholder="Un titre, un auteur…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <div className="culture-filters" aria-label="Filtrer les cultures"><button className={!tagId ? 'is-selected' : ''} onClick={() => change('tag', '')} aria-pressed={!tagId}>Tout le carnet</button>{tags.map(tag => <button key={tag.id} className={tagId === tag.id ? 'is-selected' : ''} aria-pressed={tagId === tag.id} onClick={() => change('tag', tag.id)}>#{tag.name}</button>)}{user && <button className={mine ? 'is-selected' : ''} aria-pressed={mine} onClick={() => change('mes', mine ? '' : '1')}>Mes contributions</button>}</div>
    {loading ? <p role="status">Ouverture du carnet…</p> : error ? <div role="alert" className="culture-empty"><p>{error}</p><button className="btn" onClick={reload}>Réessayer</button></div> : visible.length ? <div className="culture-grid">{visible.map((post, index) => <article className={`culture-card ${post.image ? 'culture-card--illustrated' : ''}`} key={post.id}>
      {post.image ? <Link to={`/culture/${post.id}`} tabIndex={-1} aria-hidden="true"><img className="culture-card__image" src={post.image} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true }} /></Link> : <span className="culture-card__folio" aria-hidden="true">{String(index + 1).padStart(2, '0')}<Feather size={27} /></span>}
      <div className="culture-card__content"><div className="culture-tags">{post.tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean).map(tag => <Link key={tag.id} to={`/culture?tag=${tag.id}`}>#{tag.name}</Link>)}</div><h3><Link to={`/culture/${post.id}`}>{post.title}</Link></h3><p>{post.summary || excerptFromMarkdown(post.body, 180)}</p><footer><span>Par {post.authorName}<small>{new Date(post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small></span><Link to={`/culture/${post.id}`} aria-label={`Lire : ${post.title}`}><ArrowUpRight size={23} /></Link></footer></div>
    </article>)}</div> : <div className="culture-empty"><Feather size={34} /><h3>{posts.length ? 'Aucune page pour cette recherche' : 'La première page vous attend'}</h3><p>{posts.length ? 'Essayez un autre mot ou un autre hashtag.' : 'Un petit rituel suffit parfois à raconter tout un monde. Partagez le vôtre.'}</p>{posts.length ? <button className="btn" onClick={() => { setQuery(''); setParams({}) }}>Voir tout le carnet</button> : <Link className="btn" to={user ? '/culture/nouveau' : '/compte'}>Écrire la première contribution</Link>}</div>}
  </section></PageTransition>
}
