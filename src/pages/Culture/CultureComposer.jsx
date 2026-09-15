import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cultureApi } from '../../lib/cultureApi.js'
import Prose from '../../components/Prose/Prose.jsx'
import { useCulture } from './useCulture.js'
import './Culture.css'

export default function CultureComposer() {
  const { id } = useParams()
  const data = useCulture(id)
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', summary: '', body: '', image: '', imageCredit: '', tagIds: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  useEffect(() => { if (!data.loading) setForm(data.post || { title: '', summary: '', body: '', image: '', imageCredit: '', tagIds: [] }) }, [data.post, data.loading])
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try { const saved = await cultureApi(id ? `posts/${id}` : 'posts', id ? 'PUT' : 'POST', form); navigate(`/culture/${saved.id}`) } catch (e) { setError(e.message); setBusy(false) }
  }
  if (data.loading) return <section className="container culture-page" role="status">Préparation de votre page…</section>
  if (data.error) return <section className="container culture-page"><p role="alert">{data.error}</p><button className="btn" onClick={data.reload}>Réessayer</button></section>
  if (!data.user) return <section className="container culture-page culture-empty"><h1>Une voix de plus dans le carnet</h1><p>Connectez-vous pour publier votre culture.</p><Link className="btn" to="/compte">Me connecter</Link><Link className="btn" to="/culture">Retour au carnet</Link></section>
  if (id && data.user.role !== 'admin' && data.post.ownerUserId !== data.user.id) return <section className="container culture-page"><p>Seul l’auteur ou l’administration peut modifier cette contribution.</p><Link to="/culture">Retour au carnet</Link></section>
  return <section className="container culture-page culture-compose"><Link className="culture-back" to={id ? `/culture/${id}` : '/culture'}>← Retour au carnet</Link><span className="eyebrow">À votre plume</span><h1>{id ? 'Retoucher votre page' : 'Une culture à partager'}</h1><p>Racontez une tradition, une recette ou une croyance de votre univers. Votre page sera visible dès sa publication.</p>
    <form onSubmit={submit}><fieldset disabled={busy} className="culture-fields"><label>Titre<input required maxLength={140} value={form.title} onChange={e => change('title', e.target.value)} placeholder="Le nom de cette petite part de votre monde" /></label><label>Quelques mots pour ouvrir la page<textarea rows={2} maxLength={320} value={form.summary} onChange={e => change('summary', e.target.value)} placeholder="Une courte introduction…" /></label>
    <fieldset className="culture-tag-picker"><legend>Hashtags · jusqu’à 8</legend><div className="culture-filters">{data.tags.map(tag => <label className={form.tagIds.includes(tag.id) ? 'is-selected' : ''} key={tag.id}><input type="checkbox" checked={form.tagIds.includes(tag.id)} disabled={!form.tagIds.includes(tag.id) && form.tagIds.length >= 8} onChange={e => change('tagIds', e.target.checked ? [...form.tagIds, tag.id] : form.tagIds.filter(t => t !== tag.id))} />#{tag.name}</label>)}</div>{!data.tags.length && <p>L’administration n’a pas encore ajouté de hashtags. Vous pouvez publier sans en choisir.</p>}</fieldset>
    <label>Votre récit<textarea required rows={15} maxLength={50000} value={form.body} onChange={e => change('body', e.target.value)} placeholder="Tout commence par…" /><small>Vous pouvez utiliser le Markdown : **gras**, *italique*, ## titre, listes et liens.</small></label>
    <button className="btn" type="button" aria-expanded={preview} onClick={() => setPreview(v => !v)}>{preview ? 'Fermer l’aperçu' : 'Aperçu du récit'}</button>{preview && <div className="culture-paper"><Prose markdown={form.body || '*Votre récit apparaîtra ici.*'} /></div>}
    <div className="culture-image-fields"><label>Lien de l’illustration (facultatif)<input value={form.image} maxLength={2000} onChange={e => change('image', e.target.value)} placeholder="https://…" /></label><label>Crédit de l’illustration<input value={form.imageCredit} maxLength={250} onChange={e => change('imageCredit', e.target.value)} placeholder="Artiste, source…" /></label></div>
    <button className="btn culture-primary" type="submit">{busy ? 'Publication…' : id ? 'Enregistrer les modifications' : 'Publier ma culture'}</button></fieldset>{error && <p role="alert" className="culture-error">{error}</p>}</form>
  </section>
}
