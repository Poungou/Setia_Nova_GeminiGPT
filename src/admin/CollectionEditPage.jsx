// src/admin/CollectionEditPage.jsx
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation, Link, Navigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { SCHEMA } from './schema.js'
import { useAdmin } from './useAdmin.js'
import { Field } from './Fields.jsx'
import { adminStorageLabel, localFileUploadsAvailable } from './adminApi.js'

// Ancre stable d'une rubrique, dérivée de son nom (et non de sa position) :
// « Accueil de la galerie » -> #home-group-accueil-de-la-galerie. L'accueil
// garde son préfixe historique « home-group- » ; AdminLayout et
// AdminOverviewPage pointent vers la même ancre.
const groupAnchor = (collection, group) => `${collection === 'home' ? 'home-group' : 'group'}-${group.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
const pad = (n) => String(n).padStart(2, '0')

// Icônes reprises de design-ref/4 (viewBox 24×24).
const IC = {
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  out: 'M7 17L17 7M8 7h9v9',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
}
function Ic({ name, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={IC[name]} /></svg>
  )
}

// Égalité profonde, insensible à l'ordre des clés : sert à savoir si le
// formulaire diffère réellement des données chargées.
function sameValue(a, b) {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => k in b && sameValue(a[k], b[k]))
}

const ArticleComposer = lazy(() => import('../components/ArticleEditor/ArticleComposer.jsx'))

export default function CollectionEditPage() {
  const { collection, id } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const s = SCHEMA[collection]
  const { data, save, readOnly, currentUser } = useAdmin()

  const rows = data?.[collection] || []
  const isNew = id === 'new'
  const existing = isNew ? null : rows.find((r) => r.id === decodeURIComponent(id || ''))

  const [form, setForm] = useState(() => ({ ...s?.defaults, ...(collection === 'posts' && isNew ? { visibility: 'draft' } : {}), ...(existing || {}) }))
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState('') // '' | 'saved' | 'error:<msg>'
  const skipReset = useRef(false)
  const headingRef = useRef(null)
  const firstRubrique = useRef(true)

  // (Ré)initialise le formulaire quand on change de fiche, ou quand les données
  // finissent de charger. On saute ce reset juste après un enregistrement
  // (sinon le message de confirmation disparaîtrait aussitôt).
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false
      return
    }
    setForm({ ...s?.defaults, ...(collection === 'posts' && isNew ? { visibility: 'draft' } : {}), ...(existing || {}) })
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

  // Une seule rubrique est visible à la fois. La rubrique courante vient de
  // l'ancre (#home-group-<nom>), ce qui garde les liens directs valides ;
  // sans ancre reconnue, c'est la première.
  const groupNames = Object.keys(groups)
  const found = groupNames.findIndex((name) => groupAnchor(collection, name) === hash.slice(1))
  const current = found >= 0 ? found : 0
  const dataReady = Boolean(data)

  // À chaque changement de rubrique (ou arrivée directe sur une ancre), on
  // ramène le titre de la rubrique à l'écran et on y place le focus, pour que
  // le clavier et les lecteurs d'écran suivent. Rien au tout premier rendu
  // sans ancre : la page s'ouvre normalement.
  useEffect(() => {
    if (!dataReady) return
    if (firstRubrique.current) {
      firstRubrique.current = false
      if (!hash) return
    }
    headingRef.current?.focus()
  }, [dataReady, current, hash])

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
      onChange={setForm} onSave={onSave} onDelete={onDelete}
      saving={saving} readOnly={readOnly} flash={flash} isNew={isNew} backTo="/admin/posts"
      data={data} uploadEnabled={localFileUploadsAvailable} draftScope={`local-admin:${currentUser?.id || 'local'}:${id}`}
    /></Suspense>
  }

  // « Modifications non enregistrées » : seulement si le formulaire diffère
  // vraiment des données chargées (revenir à la valeur d'origine l'efface).
  const baseline = { ...s.defaults, ...(collection === 'posts' && isNew ? { visibility: 'draft' } : {}), ...(existing || {}) }
  const changed = !sameValue(form, baseline)

  const rubrique = groupNames[current]
  const fields = groups[rubrique] || []
  const multi = groupNames.length > 1
  const anchorOf = (name) => groupAnchor(collection, name)
  const prev = current > 0 ? groupNames[current - 1] : null
  const next = current < groupNames.length - 1 ? groupNames[current + 1] : null

  return (
    <div className="adm-edit ed">
      <header className="ed-head">
        <div className="ed-head__text">
          <Link to={`/admin/${collection}`} className="ed-back"><Ic name="left" size={16} />Retour</Link>
          <h1>{isNew ? `Nouveau ${s.singular}` : collection === 'home' ? 'Accueil du site' : s.title(form)}</h1>
          {!s.singleton && <code className="ed-head__id">{computedId || '(identifiant à venir)'}</code>}
          {collection === 'home' && <p className="ed-lead">Personnalise les textes, les cartes et les images de la vitrine. Enregistrer applique les changements sur le site, sans redéploiement.</p>}
        </div>
        <div className="ed-head__actions">
          <div className="ed-status" role="status" aria-live="polite">
            {readOnly ? <span className="ed-status__pill is-readonly"><i />Lecture seule</span>
              : saving ? <span className="ed-status__pill is-saving"><i />Enregistrement…</span>
              : changed ? <span className="ed-status__pill is-changed"><i />Modifications non enregistrées</span>
              : flash === 'saved' ? <span className="ed-status__pill is-saved" title={`Enregistré dans ${adminStorageLabel}`}><i />Enregistré</span>
              : null}
          </div>
          {collection === 'home' && <a href="/" target="_blank" rel="noreferrer" className="ed-btn ed-btn--ghost">Voir l’accueil<Ic name="out" /></a>}
          {!isNew && !s.singleton && (
            <button type="button" className="ed-btn ed-btn--danger" onClick={onDelete} disabled={readOnly || saving}>
              <Trash2 size={18} /> Supprimer
            </button>
          )}
          <button type="button" className="ed-btn ed-btn--primary" onClick={onSave} disabled={readOnly || saving}>
            <Ic name="save" />{saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {flash.startsWith('error:') && <div className="adm-banner adm-banner--error" role="alert">{flash.slice(6)}</div>}

      <div className="ed-body">
        {multi && (
          <nav className="ed-rail" aria-label={`Rubriques : ${s.title(form)}`}>
            <div className="ed-rail__count adm-mono">{groupNames.length} rubriques</div>
            {groupNames.map((name, index) => (
              <Link key={name} to={{ hash: `#${anchorOf(name)}` }} replace className={`ed-rail__link${index === current ? ' is-current' : ''}`}
                aria-current={index === current ? 'step' : undefined}>
                <b>{pad(index + 1)}</b>{name}
              </Link>
            ))}
          </nav>
        )}

        <form
          className="ed-card"
          id={anchorOf(rubrique)}
          aria-label={`Rubrique ${rubrique}`}
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          {multi && <div className="ed-card__step adm-mono">{pad(current + 1)} / {pad(groupNames.length)}</div>}
          <h2 ref={headingRef} tabIndex={-1}>{rubrique}</h2>

          <div className="ed-fields">
            {fields.map((f) => (
              <div key={f.key} className={`adm-field adm-field--${f.type}`}>
                <label htmlFor={`f-${f.key}`}>{f.label}</label>
                <Field
                  field={f}
                  value={form[f.key]}
                  onChange={(v) => setField(f.key, v)}
                  allData={data}
                  disabled={readOnly || saving}
                  uploadEnabled={localFileUploadsAvailable}
                />
                {f.hint && <p className="adm-hint" id={`h-${f.key}`}>{f.hint}</p>}
              </div>
            ))}
          </div>

          {multi && (
            <div className="ed-card__nav">
              {prev ? (
                <Link to={{ hash: `#${anchorOf(prev)}` }} replace className="ed-nav-btn"><Ic name="left" />Précédent</Link>
              ) : (
                <span className="ed-nav-btn is-off" aria-disabled="true"><Ic name="left" />Précédent</span>
              )}
              {next && (
                <Link to={{ hash: `#${anchorOf(next)}` }} replace className="ed-nav-btn">Suivant : {next}<Ic name="right" /></Link>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
