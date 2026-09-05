// src/admin/CollectionEditPage.jsx
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom'
import { Save, Trash2, ArrowLeft } from 'lucide-react'
import { SCHEMA } from './schema.js'
import { useAdmin } from './useAdmin.js'
import { Field } from './Fields.jsx'
import { adminStorageLabel, localFileUploadsAvailable } from './adminApi.js'

const ArticleComposer = lazy(() => import('../components/ArticleEditor/ArticleComposer.jsx'))

export default function CollectionEditPage() {
  const { collection, id } = useParams()
  const navigate = useNavigate()
  const s = SCHEMA[collection]
  const { data, save, readOnly, currentUser } = useAdmin()

  const rows = data?.[collection] || []
  const isNew = id === 'new'
  const existing = isNew ? null : rows.find((r) => r.id === decodeURIComponent(id || ''))

  const [form, setForm] = useState(() => ({ ...s?.defaults, ...(collection === 'posts' && isNew ? { visibility: 'draft' } : {}), ...(existing || {}) }))
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState('') // '' | 'saved' | 'error:<msg>'
  const [dirty, setDirty] = useState(false)
  const skipReset = useRef(false)

  // (Ré)initialise le formulaire quand on change de fiche, ou quand les données
  // finissent de charger. On saute ce reset juste après un enregistrement
  // (sinon le message de confirmation disparaîtrait aussitôt).
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false
      return
    }
    setForm({ ...s?.defaults, ...(collection === 'posts' && isNew ? { visibility: 'draft' } : {}), ...(existing || {}) })
    setDirty(false)
    setFlash('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, id, existing])

  useEffect(() => {
    if (flash !== 'saved') return
    const t = setTimeout(() => setFlash(''), 3000)
    return () => clearTimeout(t)
  }, [flash])

  const groups = useMemo(() => {
    const g = {}
    for (const f of s?.fields || []) (g[f.group || 'Autres'] ||= []).push(f)
    return g
  }, [s])

  if (collection === 'posts' && !import.meta.env.DEV) return <Navigate to={`/compte/articles/${id}`} replace />
  if (!s) return <p className="adm-muted">Collection inconnue.</p>
  if (!data) return <p className="adm-muted">Chargement…</p>
  if (!isNew && !existing) {
    return (
      <p className="adm-muted">
        Fiche introuvable. <Link to={`/admin/${collection}`}>Retour à la liste</Link>
      </p>
    )
  }

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const computedId = isNew ? s.makeId(form) : existing.id

  const onSave = async (visibility) => {
    if (readOnly || saving) return
    if (isNew) {
      if (!computedId) {
        setFlash('error:Renseigne au moins le champ qui sert d’identifiant (nom / titre).')
        return
      }
      if (rows.some((r) => r.id === computedId)) {
        setFlash(`error:L’identifiant « ${computedId} » existe déjà.`)
        return
      }
    }
    setSaving(true)
    try {
      const row = { ...s.defaults, ...form, id: computedId, ...(typeof visibility === 'string' ? { visibility } : {}) }
      const next = isNew ? [...rows, row] : rows.map((r) => (r.id === computedId ? row : r))
      skipReset.current = true
      const savedRows = await save(collection, next)
      setForm(savedRows?.find((r) => r.id === computedId) || row)
      setDirty(false)
      setFlash('saved')
      setSaving(false)
      if (isNew) navigate(`/admin/${collection}/${encodeURIComponent(computedId)}`, { replace: true })
      return savedRows?.find((r) => r.id === computedId) || row
    } catch (e) {
      skipReset.current = false
      setSaving(false)
      setFlash(`error:${e.message || e}`)
    }
  }

  const onDelete = async () => {
    if (readOnly || isNew) return
    if (!window.confirm(`Supprimer « ${s.title(form)} » ? Le fichier de données sera réécrit.`)) return
    setSaving(true)
    try {
      await save(collection, rows.filter((r) => r.id !== existing.id))
      navigate(`/admin/${collection}`, { replace: true })
    } catch (e) {
      setSaving(false)
      setFlash(`error:${e.message || e}`)
    }
  }

  if (collection === 'posts') {
    if ((isNew && form.id) || (!isNew && form.id !== existing.id)) return <p className="adm-muted">Ouverture de l’article…</p>
    return <Suspense fallback={<p className="adm-muted">Ouverture de l’atelier…</p>}><ArticleComposer
      key={`admin-${id}`} form={form}
      onChange={(next) => { setForm(next); setDirty(true) }} onSave={onSave} onDelete={onDelete}
      saving={saving} readOnly={readOnly} flash={flash} isNew={isNew} backTo="/admin/posts"
      data={data} uploadEnabled={localFileUploadsAvailable} draftScope={`local-admin:${currentUser?.id || 'local'}:${id}`}
    /></Suspense>
  }

  return (
    <div className="adm-edit">
      <header className="adm-edit__head">
        <Link to={`/admin/${collection}`} className="adm-btn adm-btn--ghost">
          <ArrowLeft size={15} /> {s.label}
        </Link>
        <div className="adm-edit__title">
          <h1>{isNew ? `Nouveau ${s.singular}` : s.title(form)}</h1>
          <code>{computedId || '(identifiant à venir)'}</code>
        </div>
        <div className="adm-edit__actions">
          {!isNew && !s.singleton && (
            <button type="button" className="adm-btn adm-btn--danger" onClick={onDelete} disabled={readOnly || saving}>
              <Trash2 size={15} /> Supprimer
            </button>
          )}
          <button type="button" className="adm-btn adm-btn--primary" onClick={onSave} disabled={readOnly || saving}>
            <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {flash === 'saved' && (
        <div className="adm-banner adm-banner--ok">Enregistré dans {adminStorageLabel}</div>
      )}
      {flash.startsWith('error:') && <div className="adm-banner adm-banner--error">{flash.slice(6)}</div>}
      {dirty && !saving && flash !== 'saved' && (
        <div className="adm-banner">Modifications non enregistrées.</div>
      )}

      <form
        className="adm-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave()
        }}
      >
        {Object.entries(groups).map(([group, fields]) => (
          <fieldset key={group} className="adm-fieldset">
            <legend>{group}</legend>
            {fields.map((f) => (
              <div key={f.key} className={`adm-field adm-field--${f.type}`}>
                <label htmlFor={`f-${f.key}`}>{f.label}</label>
                {f.hint && <p className="adm-hint">{f.hint}</p>}
                <Field
                  field={f}
                  value={form[f.key]}
                  onChange={(v) => setField(f.key, v)}
                  allData={data}
                  disabled={readOnly || saving}
                  uploadEnabled={localFileUploadsAvailable}
                />
              </div>
            ))}
          </fieldset>
        ))}
      </form>
    </div>
  )
}
