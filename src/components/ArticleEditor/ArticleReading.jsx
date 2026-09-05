import { useMemo } from 'react'
import { categoryLabel } from '../../data/posts.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import { articleHtml, articleText, formatArticleDate } from './articleContent.js'
import '../Prose/Prose.css'
import './ArticleReading.css'

export function ArticleHeading({ post, children }) {
  const cover = post.cover || post.gallery?.[0]
  const words = articleText(post.body).split(/\s+/).filter(Boolean).length
  return (
    <header className="article-heading">
      <div className="article-heading__text">
        {children}
        <p className="article-heading__category eyebrow">{categoryLabel(post.category)}</p>
        <h1>{post.title || 'Le titre de votre article'}</h1>
        {post.excerpt?.trim() && <p className="article-heading__lede">{post.excerpt}</p>}
        <div className="article-heading__meta">
          {post.author && <span>Par {post.author}</span>}
          {post.date && <time dateTime={post.date}>{formatArticleDate(post.date)}</time>}
          {words > 0 && <span>{Math.max(1, Math.ceil(words / 200))} min de lecture</span>}
        </div>
      </div>
      {imgSrc(cover) && <div className="article-heading__cover"><img src={imgSrc(cover)} alt="" style={{ objectPosition: imgFocus(cover) }} /></div>}
    </header>
  )
}

export function ArticleBody({ body }) {
  const html = useMemo(() => articleHtml(body), [body])
  return html
    ? <div className="prose article-prose" dangerouslySetInnerHTML={{ __html: html }} />
    : <p className="post__empty">Le texte de cet article prendra place ici.</p>
}
