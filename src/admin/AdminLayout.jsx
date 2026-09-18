// src/admin/AdminLayout.jsx
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Users, MapPin, Shield, CalendarClock, History, ScrollText, PenLine, MessageCircle, Circle, UserCog, House, Music, Images, UserRound, LayoutDashboard } from 'lucide-react'
import { SCHEMA, COLLECTION_NAMES } from './schema.js'
import { useAdmin } from './useAdmin.js'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle.jsx'

const ICONS = { Users, MapPin, Shield, CalendarClock, History, ScrollText, PenLine, MessageCircle, House }

export default function AdminLayout({ onLock, currentUser }) {
  const { readOnly, error, reload } = useAdmin()
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-side__head">
          <Link to="/" className="adm-side__brand">
            <span className="adm-side__brand-mark">W</span>
            <span><strong>Woltar Nova</strong><small>Administration</small></span>
          </Link>
        </div>
        <nav className="adm-nav">
          <span className="adm-nav__label">Pilotage</span>
          <NavLink to="/admin/home" className="adm-nav__link">
            <LayoutDashboard size={16} />
            Accueil
          </NavLink>
          <NavLink to="/admin/users" className="adm-nav__link">
            <UserCog size={16} />
            Utilisateurs
          </NavLink>
          <NavLink to="/admin/players" className="adm-nav__link">
            <Users size={16} />
            Joueurs
          </NavLink>
          <span className="adm-nav__label">Publication</span>
          <NavLink to="/admin/music" className="adm-nav__link">
            <Music size={16} />
            Musique du site
          </NavLink>
          <NavLink to="/admin/culture" className="adm-nav__link"><PenLine size={16} />Culture & hashtags</NavLink>
          <NavLink to="/admin/home/home#home-group-8" className="adm-nav__link"><Images size={16} />Galerie</NavLink>
          <span className="adm-nav__label">Univers</span>
          {COLLECTION_NAMES.filter((name) => name !== 'home').map((name) => {
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
          {currentUser && <span className="adm-muted">{currentUser.name || currentUser.email}</span>}
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
          <Link to="/compte" className="adm-btn adm-btn--ghost"><UserRound size={15} /> Compte Poungou</Link>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-topbar">
          <span className="adm-topbar__path">Woltar Nova <b>/</b> Administration</span>
          <span className={`adm-topbar__status${readOnly ? ' is-readonly' : ''}`}>
            <span className="adm-topbar__dot" aria-hidden="true" />
            {readOnly ? 'Lecture seule' : 'Espace actif'}
          </span>
        </div>
        {readOnly && (
          <div className="adm-banner adm-banner--warn">
            Mode lecture seule — le backend admin n’est pas joignable sur ce build.
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
