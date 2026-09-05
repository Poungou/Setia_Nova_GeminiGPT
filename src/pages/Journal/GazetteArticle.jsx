import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { categoryLabel } from '../../data/posts.js'
import { formatArticleDate } from '../../components/ArticleEditor/articleContent.js'
import { imgCredit, imgSrc } from '../../lib/image.js'
import Lightbox from '../../components/Lightbox/Lightbox.jsx'
import { composeGazette } from './gazetteLayout.js'
import '../../components/Prose/Prose.css'
import './GazetteArticle.css'

export default function GazetteArticle({ post, related, characters = [], locations = [] }) {
  const layout = useMemo(() => composeGazette(post), [post])
  const category = ['fan-art', 'chapitre', 'note', 'news'].includes(post.category) ? post.category : 'chronique'
  const mainSrc = imgSrc(post.cover || post.gallery?.[0])
  const gallery = (post.gallery || []).filter((image) => imgSrc(image) && imgSrc(image) !== mainSrc)
  const hasReferences = characters.length > 0 || locations.length > 0 || post.tags?.length > 0

  return (
    <article className={`container gazette-article gazette-article--${category}${layout.long ? ' gazette-article--long' : ''}`}>
      <header className="gazette-cartouche">
        <Link to="/journal" className="gazette-cartouche__name">Le Journal de Woltar</Link>
        <div className="gazette-cartouche__edition"><span>Woltar Nova</span>{post.date && <time dateTime={post.date}>Édition du {formatArticleDate(post.date)}</time>}</div>
        <div className="gazette-cartouche__line"><span>{categoryLabel(post.category)}</span>{post.author && <span>Une chronique de {post.author}</span>}</div>
      </header>

      <div className="gazette-headline">
        <h1>{post.title}</h1>
        {post.excerpt?.trim() && <p className="gazette-chapo">{post.excerpt}</p>}
        <p className="gazette-byline">{post.author && <span>Par {post.author}</span>}{post.date && <time dateTime={post.date}>{formatArticleDate(post.date)}</time>}</p>
      </div>

      <div className="gazette-body">
        {layout.sections.map((section, index) => section.kind === 'flow'
          ? <div key={index} className={`prose gazette-flow${section.columns ? ' gazette-flow--columns' : ''}`} dangerouslySetInnerHTML={{ __html: section.html }} />
          : <div key={index} className="prose gazette-spread" dangerouslySetInnerHTML={{ __html: section.html }} />)}
        {!layout.sections.length && <p className="gazette-empty">Cette page attend encore son récit.</p>}
      </div>

      {gallery.length > 0 && <section className="gazette-margins" aria-label="Illustrations complémentaires">
        <h2>Dans les marges</h2>
        <Lightbox images={gallery.map((image) => ({ src: imgSrc(image), alt: image.alt || post.title, label: image.caption || image.label || '', source: imgCredit(image) }))} />
      </section>}

      <footer className="gazette-colophon">
        <span className="gazette-colophon__ornament" aria-hidden="true">✧</span>
        <div className="gazette-colophon__next"><span className="gazette-smallcaps">{related ? 'Chronique liée' : 'À suivre dans le Journal'}</span>
          {related ? <Link to={`/journal/${encodeURIComponent(related.id)}`}>{related.title} <span aria-hidden="true">↗</span></Link> : <Link to="/journal">Poursuivre la lecture <span aria-hidden="true">↗</span></Link>}
        </div>
        {hasReferences && <div className="gazette-references">
          {characters.length > 0 && <p><span>Personnages</span>{characters.map((character) => <Link key={character.id} to={`/personnages/${character.id}`}>{[character.firstName, character.lastName].filter(Boolean).join(' ')}</Link>)}</p>}
          {locations.length > 0 && <p><span>Lieux</span>{locations.map((location) => <Link key={location.id} to={`/lieux/${location.id}`}>{location.name}</Link>)}</p>}
          {post.tags?.length > 0 && <p><span>Au fil des pages</span>{post.tags.map((tag) => <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`}>{tag}</Link>)}</p>}
        </div>}
      </footer>
    </article>
  )
}
