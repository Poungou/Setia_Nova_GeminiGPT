import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Feather } from 'lucide-react'
import Prose from '../../components/Prose/Prose.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import { cultureApi } from '../../lib/cultureApi.js'
import { useCulture } from './useCulture.js'
import './Culture.css'

export default function CultureDetail() {
  const { id } = useParams()
  const { post, tags, user, loading, error, reload } = useCulture(id)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()
  const remove = async () => { setBusy(true); try { await cultureApi(`posts/${id}`, 'DELETE'); navigate('/culture') } catch (e) { setActionError(e.message); setBusy(false) } }
  if (loading) return <section className="container culture-page" role="status">Ouverture de la page…</section>
  if (error) return <section className="container culture-page"><p role="alert">{error}</p><button className="btn" onClick={reload}>Réessayer</button><Link className="btn" to="/culture">Retour au carnet</Link></section>
  const canEdit = user && (user.role === 'admin' || user.id === post.ownerUserId)
  return <PageTransition><article className="container culture-page culture-reading"><Link className="culture-back" to="/culture">← Le carnet des cultures</Link><header><span className="eyebrow"><Feather size={16} /> Culture partagée</span><div className="culture-tags">{tags.filter(tag => post.tagIds.includes(tag.id)).map(tag => <Link to={`/culture?tag=${tag.id}`} key={tag.id}>#{tag.name}</Link>)}</div><h1>{post.title}</h1><p className="culture-reading__summary">{post.summary}</p><p className="culture-byline">Par <strong>{post.authorName}</strong> · <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('fr-FR')}</time></p></header>
    {canEdit && <div className="culture-actions"><Link className="btn" to={`/culture/${id}/modifier`}>Modifier</Link><button className="btn" onClick={() => setConfirm(true)}>Supprimer</button></div>}
    {confirm && <div className="culture-confirm" role="alert"><p>Supprimer définitivement « {post.title} » ?</p><button className="btn" disabled={busy} onClick={remove}>Oui, supprimer</button><button className="btn" disabled={busy} onClick={() => setConfirm(false)}>Annuler</button></div>}{actionError && <p role="alert">{actionError}</p>}
    {post.image && <figure className="culture-reading__image"><img src={post.image} alt={`Illustration de ${post.title}`} onError={e => { e.currentTarget.hidden = true }} />{post.imageCredit && <figcaption>{post.imageCredit}</figcaption>}</figure>}
    <div className="culture-paper"><Prose markdown={post.body} /></div><footer className="culture-reading__footer">Une culture imaginée et partagée par {post.authorName}.<br /><Link to="/culture">Continuer à feuilleter le carnet →</Link></footer>
  </article></PageTransition>
}
