import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, PenLine, Save, Send, Trash2, ImagePlus } from 'lucide-react'
import { Field } from '../../admin/Fields.jsx'
import { SCHEMA } from '../../admin/schema.js'
import { articleText } from './articleContent.js'
import { ArticleBody, ArticleHeading } from './ArticleReading.jsx'
import RichArticleEditor from './RichArticleEditor.jsx'
import './ArticleComposer.css'

function readRecovery(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return saved?.version === 1 && saved.form && typeof saved.form.body === 'string' ? saved : null
  } catch { return null }
}

export default function ArticleComposer({ form, onChange, onSave, onDelete, saving, readOnly = false, flash, isNew, backTo, data, uploadEnabled, draftScope }) {
  const [preview, setPreview] = useState(false)
  const draftKey = `woltar:journal-draft:${draftScope}`
  const [recovery, setRecovery] = useState(() => readRecovery(draftKey))
  const [localStatus, setLocalStatus] = useState('')
  const [validation, setValidation] = useState('')
  const [baseline, setBaseline] = useState(() => JSON.stringify(form))
  const savedSnapshot = useRef(null)
  const serialized = JSON.stringify(form)
  const dirty = serialized !== baseline
  const disabled = readOnly || saving
  const words = useMemo(() => articleText(form.body).split(/\s+/).filter(Boolean).length, [form.body])
  const set = (key, value) => onChange({ ...form, [key]: value })

  useEffect(() => {
    // A parent may render the server response before this component updates its baseline.
    // Clear a queued autosave again when the confirmed snapshot reaches the form.
    if (serialized === savedSnapshot.current) {
      try { localStorage.removeItem(draftKey) } catch { /* optional cache */ }
      setLocalStatus('')
      return
    }
    if (!dirty || readOnly || recovery) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), form }))
      setLocalStatus('Copie de travail enregistrée sur cet appareil')
    } catch { setLocalStatus('Copie locale indisponible : pensez à enregistrer votre brouillon') }
  }, [draftKey, dirty, form, serialized, readOnly, recovery])

  useEffect(() => {
    if (!dirty) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = async (visibility) => {
    if (disabled) return
    if (!form.title?.trim()) { setValidation('Donnez un titre à votre article avant de l’enregistrer.'); setPreview(false); return }
    setValidation('')
    const success = await onSave(visibility)
    if (success) {
      savedSnapshot.current = JSON.stringify(typeof success === 'object' ? success : { ...form, visibility })
      setBaseline(savedSnapshot.current)
      try { localStorage.removeItem(draftKey) } catch { /* Storage can be unavailable in private browsing. */ }
      setRecovery(null)
      setLocalStatus('')
    }
  }
  const field = (key, label) => {
    const definition = SCHEMA.posts.fields.find((entry) => entry.key === key)
    return <div className="adm-field" key={key}><label htmlFor={`f-${key}`}>{label || definition.label}</label><Field field={definition} value={form[key]} onChange={(value) => set(key, value)} allData={data} disabled={disabled} uploadEnabled={uploadEnabled} /></div>
  }
  const published = form.visibility === 'published'

  return (
    <div className="article-composer">
      <header className="article-composer__head">
        <div><Link to={backTo} className="article-composer__back"><ArrowLeft size={15} />Journal</Link><div className="article-composer__name"><h1>Atelier du Journal</h1><span className={`article-composer__status${published ? ' is-published' : ''}`}>{published ? 'Publié' : 'Brouillon'}</span></div><p>Une page pour les histoires, les images et les idées de Woltar.</p></div>
        <div className="article-composer__actions">
          <button type="button" className="adm-btn" onClick={() => save('draft')} disabled={disabled}><Save size={15} />{published ? 'Repasser en brouillon' : 'Enregistrer le brouillon'}</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => save('published')} disabled={disabled}><Send size={15} />{saving ? 'Enregistrement…' : published ? 'Mettre à jour' : 'Publier'}</button>
        </div>
      </header>
      {recovery && !readOnly && <div className="article-composer__recovery"><div><strong>Une copie de travail vous attend.</strong><p>Enregistrée sur cet appareil le {new Date(recovery.savedAt).toLocaleString('fr-FR')}. La restaurer ne publie rien.</p></div><button className="adm-btn" type="button" disabled={disabled} onClick={() => { onChange({ ...form, ...recovery.form }); setRecovery(null) }}>Restaurer</button><button className="adm-btn adm-btn--ghost" type="button" disabled={disabled} onClick={() => { try { localStorage.removeItem(draftKey) } catch { /* optional cache */ } setRecovery(null) }}>Ignorer</button></div>}
      {flash === 'saved' && !dirty && <div className="adm-banner adm-banner--ok" role="status">{published ? 'Article publié. Vos modifications sont en ligne.' : 'Brouillon enregistré. Il n’est pas visible dans le Journal public.'}</div>}
      {(validation || flash.startsWith('error:')) && <div className="adm-banner adm-banner--error" role="alert">{validation || flash.slice(6)}</div>}
      <div className="article-composer__workspace">
        <section className="article-composer__sheet" aria-label="Votre article">
          <div className="article-composer__viewbar"><div role="group" aria-label="Mode de l’article"><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)} className={!preview ? 'is-active' : ''}><PenLine size={15} />Écrire</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)} className={preview ? 'is-active' : ''}><Eye size={15} />Aperçu</button></div><span>{words} mot{words !== 1 ? 's' : ''} · {Math.max(1, Math.ceil(words / 200))} min</span></div>
          {preview && <div className="article-composer__preview"><ArticleHeading post={form} /><ArticleBody body={form.body} /></div>}
          <div hidden={preview}>
            <div className="article-composer__opening">
              <label htmlFor="article-title" className="eyebrow">Titre de l’article</label><textarea id="article-title" className="article-composer__title" rows={2} placeholder="Une histoire à raconter" value={form.title || ''} disabled={disabled} onChange={(event) => set('title', event.target.value.replace(/\n/g, ' '))} />
              <label htmlFor="article-excerpt" className="eyebrow">Sous-titre / accroche</label><textarea id="article-excerpt" className="article-composer__excerpt" rows={2} placeholder="Quelques mots pour inviter à la lecture…" value={form.excerpt || ''} disabled={disabled} onChange={(event) => set('excerpt', event.target.value)} />
              <details className="article-composer__cover" open={Boolean(form.cover)}><summary><ImagePlus size={17} />{form.cover ? 'Image de couverture' : 'Ajouter une couverture'}<span>Facultatif</span></summary>{field('cover')}</details>
            </div>
            <RichArticleEditor value={form.body || ''} onChange={(value) => set('body', value)} disabled={disabled} uploadEnabled={uploadEnabled} />
          </div>
        </section>
        <aside className="article-composer__sidebar" aria-label="Paramètres de l’article">
          <section className="article-composer__card"><span className="eyebrow">La signature du récit</span>{field('author')}{field('date')}{field('category')}</section>
          <section className="article-composer__card"><span className="eyebrow">Publication</span><strong>{published ? 'Dans le Journal public' : 'Votre espace de brouillon'}</strong><p>{published ? 'Enregistrez avec « Mettre à jour » pour publier vos changements.' : 'Prenez le temps d’écrire. Le brouillon reste privé jusqu’à sa publication.'}</p><p className="article-composer__local" aria-live="polite">{localStatus || (dirty ? 'Modifications à enregistrer' : 'À jour')}</p>{!isNew && published && <Link to={`/journal/${encodeURIComponent(form.id)}`} target="_blank" rel="noopener noreferrer">Voir l’article ↗</Link>}</section>
          <details className="article-composer__card"><summary>Galerie complémentaire</summary>{field('gallery')}</details>
          <details className="article-composer__card"><summary>Liens avec l’univers</summary>{['characters', 'locations', 'tags'].map((key) => field(key))}</details>
          {!isNew && onDelete && <button type="button" className="adm-btn adm-btn--ghost article-composer__delete" onClick={onDelete} disabled={disabled}><Trash2 size={14} />Supprimer l’article</button>}
        </aside>
      </div>
    </div>
  )
}
