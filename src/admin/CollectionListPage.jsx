// src/admin/CollectionListPage.jsx
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, Plus, Search } from 'lucide-react'
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

  if (!s) return <p className="adm-muted">Collection inconnue.</p>

  return (
    <div className="adm-list">
      <header className="adm-list__head">
        <div>
          <h1>{s.label}</h1>
          <p className="adm-muted">{rows.length} fiche(s)</p>
        </div>
        <Link to={createHref} className="adm-btn adm-btn--primary">
          {singletonRow ? <Pencil size={16} /> : <Plus size={16} />}
          {singletonRow ? 'Modifier' : `Nouveau ${s.singular}`}
        </Link>
      </header>

      <div className="adm-search">
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
              {r.canon === 'draft' && <span className="adm-pill">ébauche</span>}
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <li className="adm-muted">Aucun résultat.</li>}
      </ul>
    </div>
  )
}
