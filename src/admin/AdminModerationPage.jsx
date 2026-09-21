// src/admin/AdminModerationPage.jsx — « Modération » (design-ref/6).
// Une fiche à la fois : on relit, on valide ou on renvoie un message. Le rôle
// admin est contrôlé côté serveur (routes /__admin/api/moderation) ; cette page
// n'affiche que ce que le serveur renvoie et ne décide d'aucun droit.
// Les champs vides s'affichent « — » : rien n'est inventé.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SCHEMA } from './schema.js'
import { imgSrc } from '../lib/image.js'
import { moderationApi, notifyModerationChanged } from '../lib/moderationApi.js'

const TABS = [
  { key: 'pending', label: 'À valider' },
  { key: 'reports', label: 'Signalements' },
  { key: 'history', label: 'Historique' },
]

const TYPE_LABEL = { characters: 'Personnage', clans: 'Clan', locations: 'Lieu', posts: 'Article', timelines: 'Chronologie' }
const PUBLIC_PATH = { characters: 'personnages', clans: 'clans', locations: 'lieux', posts: 'journal' }
const REASON_LABEL = { shocking: 'Contenu choquant', no_permission: 'Image sans autorisation', other: 'Autre' }
const STATUS_LABEL = { published: 'Publiée', needs_changes: 'À corriger', hidden: 'Refusée' }
const REPORT_STATUS_LABEL = { kept: 'Gardée', hidden: 'Masquée' }

const CHECKS = [
  'Le ton est respectueux (pas de harcèlement, pas de haine).',
  'Les images ne sont pas choquantes et l’auteure en a les droits.',
  'Aucune donnée personnelle réelle (adresse, téléphone, vrai nom).',
  'Ce n’est pas un doublon d’une fiche existante.',
]

const QUICK_REASONS = [
  ['Image à changer', 'Peux-tu changer l’image de cette fiche ?'],
  ['Fiche trop vide', 'La fiche est trop vide : peux-tu la compléter avant de la renvoyer ?'],
  ['Doublon', 'Cette fiche ressemble à une fiche déjà existante (doublon).'],
  ['Hors charte', 'Cette fiche ne respecte pas la charte du site.'],
]

const PATHS = {
  check: 'M5 12l5 5 9-10',
  out: 'M7 17L17 7M8 7h9v9',
}

function Icon({ name, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>
  )
}

const filled = (value) => (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== '')
const show = (value) => (filled(value) ? String(value) : '—')
const count = (list) => (Array.isArray(list) && list.length ? String(list.length) : '')
const initials = (text) => {
  const words = String(text || '?').split(/[\s-]+/).filter(Boolean)
  return (words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join('') : (words[0] || '?').slice(0, 2)).toUpperCase()
}
const clip = (text, max = 420) => {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

function age(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso || '')) / 60000))
  if (!Number.isFinite(minutes)) return ''
  if (minutes < 60) return `${Math.max(1, minutes)} min`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h` : `${Math.round(hours / 24)} j`
}

const formatDate = (iso) => {
  const time = Date.parse(iso || '')
  return Number.isFinite(time) ? new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''
}

function imagesLabel(record, collection) {
  const parts = []
  const main = collection === 'characters' ? record.portrait : collection === 'clans' ? record.emblem : collection === 'posts' ? record.cover : record.image
  if (filled(main)) parts.push(collection === 'characters' ? '1 portrait' : collection === 'posts' ? '1 couverture' : '1 image')
  const gallery = Array.isArray(record.gallery) ? record.gallery.length : 0
  if (gallery) parts.push(`${gallery} en galerie`)
  return parts.join(' · ')
}

// Contenu de l'aperçu : uniquement les champs réellement renseignés.
function previewOf(collection, record) {
  const title = SCHEMA[collection]?.title(record) || record.id
  switch (collection) {
    case 'characters':
      return {
        title, eyebrow: `Personnage${filled(record.clan) ? ` · ${record.clan}` : ''}`, tagline: record.title,
        lead: record.biography || record.character || record.shortDescription, image: record.portrait,
        fields: [['Âge', record.age], ['Espèce', record.species], ['Clan', record.clan], ['Images', imagesLabel(record, collection)]],
      }
    case 'clans':
      return {
        title, eyebrow: 'Clan', tagline: record.residence, lead: record.description, image: record.emblem,
        fields: [['Résidence', record.residence], ['Emblème', filled(record.emblem) ? '1 image' : ''], ['Lieux', count(record.locations)], ['Histoire', filled(record.history) ? 'Renseignée' : '']],
      }
    case 'locations':
      return {
        title, eyebrow: `Lieu${filled(record.type) ? ` · ${record.type}` : ''}`, tagline: record.location, lead: record.shortDescription || record.description, image: record.image,
        fields: [['Type', record.type], ['Situé à / dans', record.location], ['Histoire', filled(record.history) ? 'Renseignée' : ''], ['Images', imagesLabel(record, collection)]],
      }
    case 'posts':
      return {
        title, eyebrow: `Article${filled(record.category) ? ` · ${record.category}` : ''}`, tagline: '', lead: record.excerpt, image: record.cover,
        fields: [['Catégorie', record.category], ['Date', record.date], ['Auteur', record.author], ['Images', imagesLabel(record, collection)]],
      }
    default:
      return {
        title, eyebrow: 'Chronologie', tagline: '', lead: record.description, image: '',
        fields: [['Événements', count(record.events)], ['Personnages liés', count(record.characters)], ['Spoilers', record.spoiler ? 'Oui' : 'Non'], ['Identifiant', record.id]],
      }
  }
}

function Preview({ collection, record, publicLink }) {
  const p = previewOf(collection, record)
  const src = filled(p.image) ? imgSrc(p.image) : ''
  return (
    <div className="mo-panel mo-panel--flush">
      <div className="mo-panel__head">
        <h2 className="adm-mono mo-eyebrow">1 · Relire la fiche</h2>
        {publicLink && (
          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="adm-mono mo-lnk">
            Voir comme les visiteurs<Icon name="out" size={14} /><span className="visually-hidden"> (nouvel onglet)</span>
          </a>
        )}
      </div>
      <div className="mo-preview">
        <div className="mo-portrait" aria-hidden="true">{src ? <img src={src} alt="" /> : initials(p.title)}</div>
        <div className="mo-preview__text">
          <div className="adm-mono mo-preview__eyebrow">{p.eyebrow}</div>
          <div className="mo-preview__title">{p.title}</div>
          {filled(p.tagline) && <div className="mo-preview__tagline">{p.tagline}</div>}
          <p className="mo-preview__lead">{filled(p.lead) ? clip(p.lead) : '—'}</p>
        </div>
      </div>
      <dl className="mo-fields">
        {p.fields.map(([label, value]) => (
          <div key={label} className="mo-field"><dt className="adm-mono">{label}</dt><dd>{show(value)}</dd></div>
        ))}
      </dl>
    </div>
  )
}

export default function AdminModerationPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'pending'
  const [data, setData] = useState({ pending: null, reports: null, history: null })
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)
  const [note, setNote] = useState('')
  const [checks, setChecks] = useState([false, false, false, false])
  const [noteError, setNoteError] = useState('')
  const [busy, setBusy] = useState(false)
  const noteRef = useRef(null)
  const reviewRef = useRef(null)

  const load = useCallback(async (which) => {
    try {
      const [list, c] = await Promise.all([moderationApi[which](), moderationApi.counts()])
      setData((current) => ({ ...current, [which]: list }))
      setCounts(c)
      setError('')
    } catch (e) {
      setError(String(e.message || e))
    }
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  // Entrées normalisées de l'onglet courant.
  const entries = (() => {
    if (tab === 'pending') {
      return (data.pending || []).map((item) => ({
        key: `${item.collection}:${item.id}`, kind: 'content', collection: item.collection, record: item.record, ownerName: item.ownerName,
        chip: `En attente · ${age(item.record.submittedAt)}`,
      }))
    }
    if (tab === 'reports') {
      return (data.reports || []).map((report) => ({
        key: report.id, kind: 'report', collection: report.contentType, record: report.record, report, ownerName: '',
        chip: `Signalée · ${age(report.createdAt)}`,
      }))
    }
    const history = data.history
    if (!history) return []
    const content = history.content.map((item) => ({
      key: `c:${item.collection}:${item.id}`, kind: 'history', collection: item.collection, record: item.record, ownerName: item.ownerName,
      chip: `${STATUS_LABEL[item.record.reviewStatus] || item.record.reviewStatus} · ${formatDate(item.record.reviewedAt)}`, at: item.record.reviewedAt,
    }))
    const reports = history.reports.map((report) => ({
      key: `r:${report.id}`, kind: 'history-report', collection: report.contentType, record: null, report, ownerName: '',
      chip: `${REPORT_STATUS_LABEL[report.status] || report.status} · ${formatDate(report.handledAt)}`, at: report.handledAt,
    }))
    return [...content, ...reports].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
  })()

  const loaded = data[tab] !== null
  const selected = entries.find((entry) => entry.key === selectedKey) || entries[0] || null

  // Nouvelle fiche à relire : on repart d'un formulaire vierge.
  const selectedRef = selected?.key
  useEffect(() => {
    setNote('')
    setChecks([false, false, false, false])
    setNoteError('')
  }, [selectedRef, tab])

  const pendingCount = counts ? counts.pending : (data.pending ? data.pending.length : null)
  const reportCount = counts ? counts.reports : (data.reports ? data.reports.length : null)
  const tabCount = { pending: pendingCount, reports: reportCount, history: null }

  const goTab = (key) => {
    setParams(key === 'pending' ? {} : { tab: key }, { replace: true })
    setSelectedKey(null)
    setFlash('')
  }

  const onTabKey = (event, index) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = TABS[(index + step + TABS.length) % TABS.length]
    goTab(next.key)
    requestAnimationFrame(() => document.getElementById(`mo-tab-${next.key}`)?.focus())
  }

  const choose = (entry) => {
    setSelectedKey(entry.key)
    setFlash('')
    if (window.innerWidth < 1000) requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ block: 'start' }))
  }

  const addReason = (text) => {
    setNote((current) => (current.includes(text) ? current : current ? `${current}\n${text}` : text))
    setNoteError('')
    noteRef.current?.focus()
  }

  const run = async (label, message, needsNote, action) => {
    if (busy || !selected) return
    if (needsNote && !note.trim()) {
      setNoteError(`Écris un message pour ${label} : l’auteure doit savoir pourquoi.`)
      noteRef.current?.focus()
      return
    }
    setBusy(true)
    setError('')
    setNoteError('')
    try {
      await action()
      setFlash(message)
      setSelectedKey(null)
      notifyModerationChanged()
      await load(tab)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  const publicLink = selected?.record && selected.record.reviewStatus === 'published' && PUBLIC_PATH[selected.collection]
    ? `/${PUBLIC_PATH[selected.collection]}/${encodeURIComponent(selected.record.id)}` : ''
  const isReport = selected?.kind === 'report'
  const readOnly = selected?.kind === 'history' || selected?.kind === 'history-report'

  const emptyText = {
    pending: ['Rien à traiter', 'Aucune fiche n’attend ta validation pour le moment.'],
    reports: ['Rien à traiter', 'Aucun signalement ouvert : les visiteurs n’ont rien remonté.'],
    history: ['Rien dans l’historique', 'Les fiches validées, corrigées ou refusées apparaîtront ici.'],
  }[tab]

  return (
    <div className="ov mo">
      <section className="ov-hero">
        <div>
          <div className="adm-mono ov-hero__eyebrow">Pilotage · Modération</div>
          <h1>Ce qui attend <em>ton regard.</em></h1>
          <p>Une fiche à la fois : tu lis, tu valides ou tu renvoies un message.</p>
        </div>
      </section>

      <div role="tablist" aria-label="File de modération" className="mo-tabs">
        {TABS.map((t, index) => (
          <button key={t.key} type="button" role="tab" id={`mo-tab-${t.key}`} aria-selected={tab === t.key} aria-controls="mo-panel"
            tabIndex={tab === t.key ? 0 : -1} className={`mo-tab${tab === t.key ? ' is-on' : ''}`} onClick={() => goTab(t.key)} onKeyDown={(e) => onTabKey(e, index)}>
            {t.label}
            {tabCount[t.key] !== null && <span className={`adm-mono mo-count${tab === t.key ? ' is-on' : ''}`}>{tabCount[t.key]}<span className="visually-hidden"> à traiter</span></span>}
          </button>
        ))}
      </div>

      {flash && <div className="adm-banner adm-banner--ok" role="status">{flash}</div>}
      {error && <div className="adm-banner adm-banner--error" role="alert">{error}</div>}

      <div id="mo-panel" role="tabpanel" aria-labelledby={`mo-tab-${tab}`} className="mo-cols">
        {!loaded && !error && <p className="adm-muted" role="status">Chargement…</p>}

        {loaded && entries.length === 0 && (
          <div className="mo-panel mo-empty">
            <div className="mo-empty__title">{emptyText[0]}</div>
            <p>{emptyText[1]}</p>
          </div>
        )}

        {loaded && entries.length > 0 && (
          <>
            <section className="mo-panel mo-panel--flush mo-queue" aria-label="File d’attente">
              <div className="mo-queue__head adm-mono">{tab === 'history' ? 'Du plus récent au plus ancien' : 'Du plus ancien au plus récent'}</div>
              <ul>
                {entries.map((entry) => {
                  const title = entry.record ? SCHEMA[entry.collection]?.title(entry.record) : entry.report?.contentId
                  return (
                    <li key={entry.key}>
                      <button type="button" className={`mo-q${selected?.key === entry.key ? ' is-on' : ''}`} aria-current={selected?.key === entry.key ? 'true' : undefined} onClick={() => choose(entry)}>
                        <span className="mo-q__top"><span className="adm-mono mo-tag">{TYPE_LABEL[entry.collection] || entry.collection}</span><span className="adm-mono mo-chip is-w">{entry.chip}</span></span>
                        <span className="mo-q__title">{title}</span>
                        <span className="mo-q__sub">
                          {entry.kind === 'report' || entry.kind === 'history-report'
                            ? `Motif : ${REASON_LABEL[entry.report.reason] || entry.report.reason}`
                            : `Proposé par ${entry.ownerName || 'un compte'}`}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            {selected && (
              <section className="mo-review" aria-label="Relecture" ref={reviewRef} tabIndex={-1}>
                {selected.record
                  ? <Preview collection={selected.collection} record={selected.record} publicLink={publicLink} />
                  : <div className="mo-panel mo-empty"><div className="mo-empty__title">Fiche introuvable</div><p>Ce contenu n’existe plus ou n’est plus accessible.</p></div>}

                {(isReport || selected.kind === 'history-report') && (
                  <div className="mo-panel">
                    <h2 className="adm-mono mo-eyebrow">Le signalement</h2>
                    <dl className="mo-report">
                      <div><dt className="adm-mono">Motif</dt><dd>{REASON_LABEL[selected.report.reason] || selected.report.reason}</dd></div>
                      <div><dt className="adm-mono">Détails</dt><dd>{show(selected.report.details)}</dd></div>
                      <div><dt className="adm-mono">Reçu le</dt><dd>{formatDate(selected.report.createdAt) || '—'}</dd></div>
                      {selected.report.status !== 'open' && <div><dt className="adm-mono">Décision</dt><dd>{REPORT_STATUS_LABEL[selected.report.status] || selected.report.status}</dd></div>}
                    </dl>
                    {isReport && <p className="mo-hint">La fiche reste visible tant que tu ne l’as pas relue. « Garder » classe le signalement ; « Masquer » la repasse en « À corriger » avec un message.</p>}
                  </div>
                )}

                {selected.kind === 'history' && (
                  <div className="mo-panel">
                    <h2 className="adm-mono mo-eyebrow">Décision</h2>
                    <dl className="mo-report">
                      <div><dt className="adm-mono">État</dt><dd>{STATUS_LABEL[selected.record.reviewStatus] || selected.record.reviewStatus}</dd></div>
                      <div><dt className="adm-mono">Le</dt><dd>{formatDate(selected.record.reviewedAt) || '—'}</dd></div>
                      <div><dt className="adm-mono">Message envoyé</dt><dd>{show(selected.record.reviewNote)}</dd></div>
                    </dl>
                  </div>
                )}

                {selected.kind === 'content' && (
                  <div className="mo-panel">
                    <h2 className="adm-mono mo-eyebrow">2 · Vérifications rapides</h2>
                    <ul className="mo-checks">
                      {CHECKS.map((label, i) => (
                        <li key={label}>
                          <label className="mo-chk">
                            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((current) => current.map((v, j) => (j === i ? e.target.checked : v)))} />
                            <span className="mo-chk__box" aria-hidden="true"><Icon name="check" size={14} /></span>
                            <span>{label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!readOnly && selected.record && (
                  <div className="mo-panel">
                    <h2 className="adm-mono mo-eyebrow">{selected.kind === 'content' ? '3 · Ta décision' : 'Ta décision'}</h2>
                    <div className="mo-reasons" role="group" aria-label="Motifs rapides">
                      {QUICK_REASONS.map(([label, text]) => (
                        <button key={label} type="button" className="adm-mono mo-reason" onClick={() => addReason(text)}>{label}</button>
                      ))}
                    </div>
                    <label htmlFor="mo-note" className="visually-hidden">Message pour l’auteure</label>
                    <textarea id="mo-note" ref={noteRef} className="mo-note" rows={4} value={note} maxLength={1000}
                      aria-invalid={noteError ? 'true' : undefined} aria-describedby="mo-note-help"
                      placeholder="Message pour l’auteure (obligatoire si tu demandes une correction ou refuses)."
                      onChange={(e) => { setNote(e.target.value); setNoteError('') }} />
                    <p id="mo-note-help" className="mo-hint">
                      {isReport ? 'Obligatoire pour masquer la fiche.' : 'Obligatoire pour demander une correction ou refuser.'} Rien n’est supprimé : une fiche refusée reste en archive.
                    </p>
                    {noteError && <p className="adm-error" role="alert">{noteError}</p>}
                    <div className="mo-actions">
                      {selected.kind === 'content' ? (
                        <>
                          <button type="button" className="mo-btn mo-btn--p" disabled={busy}
                            onClick={() => run('valider', 'Fiche validée et publiée.', false, () => moderationApi.decide(selected.collection, selected.record.id, 'approve'))}>
                            <Icon name="check" />Valider et publier
                          </button>
                          <button type="button" className="mo-btn mo-btn--g" disabled={busy}
                            onClick={() => run('demander une correction', 'Correction demandée : l’auteure a été prévenue dans son espace.', true, () => moderationApi.decide(selected.collection, selected.record.id, 'request-changes', note))}>
                            Demander une correction
                          </button>
                          <button type="button" className="mo-btn mo-btn--d" disabled={busy}
                            onClick={() => run('refuser', 'Fiche refusée et gardée en archive.', true, () => moderationApi.decide(selected.collection, selected.record.id, 'reject', note))}>
                            Refuser
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="mo-btn mo-btn--p" disabled={busy}
                            onClick={() => run('garder', 'Signalement classé : la fiche reste visible.', false, () => moderationApi.handleReport(selected.report.id, 'keep'))}>
                            <Icon name="check" />Garder
                          </button>
                          <button type="button" className="mo-btn mo-btn--d" disabled={busy}
                            onClick={() => run('masquer', 'Fiche masquée : elle repasse en « À corriger ».', true, () => moderationApi.handleReport(selected.report.id, 'hide', note))}>
                            Masquer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
