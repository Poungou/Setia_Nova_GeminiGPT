// src/admin/AdminLayout.jsx
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Users, MapPin, Shield, CalendarClock, ScrollText, Circle } from 'lucide-react'
import { SCHEMA, COLLECTION_NAMES } from './schema.js'
import { useAdmin } from './useAdmin.js'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle.jsx'

const ICONS = { Users, MapPin, Shield, CalendarClock, ScrollText }

export default function AdminLayout({ onLock }) {
  const { readOnly, error, reload } = useAdmin()
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-side__head">
          <Link to="/" className="adm-side__logo">Woltar</Link>
          <span className="adm-side__tag">Administration</span>
        </div>
        <nav className="adm-nav">
          {COLLECTION_NAMES.map((name) => {
            const s = SCHEMA[name]
            const Icon = ICONS[s.icon] || Circle
            return (
              <NavLink key={name} to={`/admin/${name}`} className="adm-nav__link">
                <Icon size={16} />
                {s.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="adm-side__foot">
          <ThemeToggle />
          <button type="button" className="adm-btn adm-btn--ghost" onClick={reload}>
            Recharger
          </button>
          {onLock && (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onLock}>
              Verrouiller
            </button>
          )}
          <Link to="/" className="adm-btn adm-btn--ghost">Voir le site</Link>
        </div>
      </aside>

      <main className="adm-main">
        {readOnly && (
          <div className="adm-banner adm-banner--warn">
            Mode lecture seule — l’édition fonctionne uniquement en local via
            <code> npm run dev</code>.
          </div>
        )}
        {error && (
          <div className="adm-banner adm-banner--error">
            Problème de chargement : {error} <button onClick={reload}>réessayer</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
