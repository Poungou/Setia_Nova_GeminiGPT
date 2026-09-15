import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cultureApi } from '../lib/cultureApi.js'
import { useCulture } from '../pages/Culture/useCulture.js'
import '../pages/Culture/Culture.css'

export default function AdminCulturePage() {
  const { tags, posts, loading, error, reload } = useCulture()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const mutate = async (path, method, body) => {
    setBusy(true); setMessage('')
    try { await cultureApi(path, method, body); setName(''); setEditing(null); setRemoving(null); reload() } catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  return <section className="culture-admin"><span className="eyebrow">Carnet communautaire</span><h1>Culture & hashtags</h1><p>Les contributions sont publiées immédiatement. Les joueurs choisissent parmi les hashtags que vous créez ici.</p><div className="culture-actions"><Link className="adm-btn" to="/culture">Voir le carnet</Link><Link className="adm-btn adm-btn--primary" to="/culture/nouveau">Écrire une contribution</Link></div>
    <h2>Les hashtags</h2><form className="culture-actions" onSubmit={e => { e.preventDefault(); mutate(editing ? `tags/${editing}` : 'tags', editing ? 'PUT' : 'POST', { name }) }}><label htmlFor="culture-tag-name">{editing ? 'Renommer le hashtag' : 'Nouveau hashtag'}</label><input className="adm-input" id="culture-tag-name" required maxLength={32} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Traditions" disabled={busy} /><button className="adm-btn adm-btn--primary" disabled={busy}>{editing ? 'Enregistrer' : 'Ajouter'}</button>{editing && <button type="button" className="adm-btn" onClick={() => { setEditing(null); setName('') }}>Annuler</button>}</form>
    {(error || message) && <p role="alert" className="adm-error">{error || message}</p>}{error && <button className="adm-btn" onClick={reload}>Réessayer</button>}
    {loading ? <p role="status">Chargement…</p> : <><ul className="culture-admin__list">{tags.map(tag => <li key={tag.id}><strong>#{tag.name}</strong><span>{posts.filter(p => p.tagIds.includes(tag.id)).length} contribution(s)</span><button className="adm-btn" disabled={busy} onClick={() => { setEditing(tag.id); setName(tag.name) }}>Renommer</button><button className="adm-btn" disabled={busy} onClick={() => setRemoving(tag)}>Supprimer</button></li>)}</ul>{!tags.length && <p>Aucun hashtag. Ajoutez le premier ci-dessus.</p>}
    {removing && <div className="culture-confirm" role="alert"><p>Supprimer #{removing.name} de toutes les contributions ? Les publications seront conservées.</p><button className="adm-btn" disabled={busy} onClick={() => mutate(`tags/${removing.id}`, 'DELETE')}>Supprimer le hashtag</button><button className="adm-btn" disabled={busy} onClick={() => setRemoving(null)}>Annuler</button></div>}
    <h2>Les contributions ({posts.length})</h2><ul className="culture-admin__list">{posts.map(post => <li key={post.id}><Link to={`/culture/${post.id}`}><strong>{post.title}</strong></Link><span>Par {post.authorName}</span><Link className="adm-btn" to={`/culture/${post.id}/modifier`}>Modifier</Link><Link className="adm-btn" to={`/culture/${post.id}`}>Voir / supprimer</Link></li>)}</ul>{!posts.length && <p>Le carnet attend sa première contribution.</p>}</>}
  </section>
}
