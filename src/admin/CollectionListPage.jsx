// src/admin/CollectionListPage.jsx
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowUpRight, Pencil, Plus, Search, Sparkles } from 'lucide-react'
import { SCHEMA } from './schema.js'
import { useAdmin } from './useAdmin.js'

export default function CollectionListPage() {
  const { collection } = useParams()
  const s = SCHEMA[collection]
  const { data } = useAdmin()
  const [q, setQ] = useState('')

  const rows = useMemo(() => data?.[collection] || [], [data, collection])
  const singletonRow = s?.singleton ? rows[0] : null
  const createHref = singletonRow
    ? `/admin/${collection}/${encodeURIComponent(singletonRow.id)}`
    : `/admin/${collection}/new`
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = [...rows]
    if (!needle) return list
    return list.filter((r) => JSON.stringify(r).toLowerCase().includes(needle))
  }, [rows, q])

  if (collection === 'posts' && !import.meta.env.DEV) return <Navigate to="/compte/articles" replace />
  if (!s) return <p className="adm-muted">Collection inconnue.</p>

  return (
    <div className={`adm-list adm-list--${collection}`}>
      <header className="adm-list__head">
        <div>
          <span className="adm-list__eyebrow">Espace administration</span>
          <h1>{s.label}</h1>
          <p className="adm-list__lead">{collection === 'home' ? 'Pilote les textes, images et repères visibles sur la page d’accueil.' : `${rows.length} fiche${rows.length > 1 ? 's' : ''} à gérer`}</p>
        </div>
        <Link to={createHref} className="adm-btn adm-btn--primary">
          {singletonRow ? <Pencil size={16} /> : <Plus size={16} />}
          {singletonRow ? 'Modifier' : `Nouveau ${s.singular}`}
        </Link>
      </header>

      {collection === 'home' && singletonRow && (
        <section className="adm-home-dashboard" aria-labelledby="adm-home-dashboard-title">
          <div className="adm-home-dashboard__signal" aria-hidden="true">
            <span className="adm-home-dashboard__orbit adm-home-dashboard__orbit--one" />
            <span className="adm-home-dashboard__orbit adm-home-dashboard__orbit--two" />
            <span className="adm-home-dashboard__mark">W</span>
            <span className="adm-home-dashboard__caption">Vitrine<br />vivante</span>
          </div>
          <div className="adm-home-dashboard__copy">
            <span className="adm-list__eyebrow"><Sparkles size={13} /> Atelier de la vitrine</span>
            <h2 id="adm-home-dashboard-title">Donne le ton à<br /><em>l’accueil.</em></h2>
            <p>Les réglages de cette page donnent sa première impression à Woltar Nova. Ajuste le récit, les images et le rythme de découverte depuis un seul atelier.</p>
            <div className="adm-home-dashboard__actions">
              <Link to={createHref} className="adm-btn adm-btn--primary"><Pencil size={15} /> Ouvrir l’atelier</Link>
              <a href="/" target="_blank" rel="noreferrer" className="adm-home-dashboard__preview">Voir la vitrine <ArrowUpRight size={15} /></a>
            </div>
          </div>
        </section>
      )}

      <div className="adm-search" role="search">
        <Search size={15} />
        <input
          className="adm-input"
          placeholder="Filtrer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <ul className="adm-cards">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/${collection}/${encodeURIComponent(r.id)}`} className="adm-card">
              <div className="adm-card__body">
                <strong>{s.title(r)}</strong>
                <span className="adm-muted">{s.subtitle(r) || '—'}</span>
              </div>
              <code className="adm-card__id">{r.id}</code>
              {r.ownerUserId && <span className="adm-pill">{r.ownerUserId}</span>}
              {r.is_featured && <span className="adm-pill">en avant</span>}
              {r.canon === 'draft' && <span className="adm-pill">ébauche</span>}
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <li className="adm-muted">Aucun résultat.</li>}
      </ul>
    </div>
  )
}
