// src/admin/AdminLayout.jsx
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { SCHEMA, COLLECTION_NAMES } from './schema.js'
import { useAdmin } from './useAdmin.js'
import { useModerationCounts } from './useModerationCounts.js'

// Tracés SVG repris tels quels de design-ref/3-dashboard-admin-bureau.html.
const PATHS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  inbox: 'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M17 4a3.5 3.5 0 0 1 0 7M22 20v-1a5 5 0 0 0-3-4.5',
  sparkle: 'M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  hash: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  down: 'M6 9l6 6 6-6',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  arrow: 'M7 17L17 7M8 7h9v9',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
}

function Icon({ name, size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d={PATHS[name]} />
    </svg>
  )
}

// Ancre stable de la rubrique « Accueil de la galerie » (voir groupAnchor dans
// CollectionEditPage.jsx).
const GALLERY_HASH = '#home-group-accueil-de-la-galerie'

const PAGE_LABELS = { overview: 'Vue d’ensemble', moderation: 'Modération', users: 'Utilisateurs', players: 'Joueurs', music: 'Musique du site', culture: 'Culture & hashtags', home: 'Accueil du site' }

export default function AdminLayout({ onLock, currentUser }) {
  const { readOnly, error, reload } = useAdmin()
  const { pathname, hash } = useLocation()
  const moderation = useModerationCounts(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [universOpen, setUniversOpen] = useState(true)
  const menuButton = useRef(null)
  const closeButton = useRef(null)

  // Tiroir mobile : Échap le ferme, le focus entre dans le tiroir puis revient
  // sur le bouton hamburger à la fermeture.
  useEffect(() => {
    if (!menuOpen) return undefined
    const button = menuButton.current
    closeButton.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      button?.focus()
    }
  }, [menuOpen])

  const galleryActive = pathname.startsWith('/admin/home') && hash === GALLERY_HASH
  const universNames = COLLECTION_NAMES.filter((name) => name !== 'home')
  const segment = pathname.split('/')[2] || ''
  const pageLabel = PAGE_LABELS[segment] || SCHEMA[segment]?.label || ''
  const displayName = currentUser?.name || currentUser?.email || 'Admin'
  const initial = displayName.trim().charAt(0).toUpperCase()

  return (
    <div className="adm adm-shell">
      <header className="adm-mbar">
        <button type="button" ref={menuButton} className="adm-mbar__btn" aria-label="Ouvrir le menu" aria-expanded={menuOpen} aria-controls="adm-side" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
        <Link to="/admin" className="adm-mbar__brand"><span className="adm-logo" aria-hidden="true">W</span><span>Woltar Nova</span></Link>
        <span className="adm-avatar" aria-hidden="true">{initial}</span>
      </header>
      {menuOpen && <button type="button" className="adm-scrim" aria-label="Fermer le menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />}

      <aside id="adm-side" className={`adm-side${menuOpen ? ' is-open' : ''}`} onClick={(event) => event.target.closest('a') && setMenuOpen(false)}>
        <button type="button" ref={closeButton} className="adm-side__close" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}><Icon name="close" size={20} /></button>
        <div className="adm-side__head">
          <Link to="/" className="adm-side__brand">
            <span className="adm-logo" aria-hidden="true">W</span>
            <span><strong>Woltar Nova</strong><small className="adm-mono">Administration</small></span>
          </Link>
        </div>

        <div className="adm-mode">
          <Link to="/compte" className="adm-mono">Mon espace</Link>
          <Link to="/admin" className="adm-mono is-current" aria-current="page">Admin</Link>
        </div>

        <nav className="adm-nav" aria-label="Navigation administration">
          <span className="adm-nav__label adm-mono">Pilotage</span>
          <NavLink to="/admin/overview" className="adm-nav__link"><Icon name="grid" />Vue d’ensemble</NavLink>
          <NavLink to="/admin/moderation" className="adm-nav__link">
            <Icon name="inbox" />Modération
            {moderation && moderation.pending > 0 && <span className="adm-nav__badge">{moderation.pending}<span className="visually-hidden"> à valider</span></span>}
          </NavLink>
          <NavLink to="/admin/users" className="adm-nav__link"><Icon name="users" />Utilisateurs</NavLink>
          <NavLink to="/admin/players" className="adm-nav__link"><Icon name="sparkle" />Joueurs</NavLink>

          <span className="adm-nav__label adm-mono">Publication</span>
          <NavLink to="/admin/home" className={({ isActive }) => `adm-nav__link${isActive && !galleryActive ? ' active' : ''}`}><Icon name="home" />Accueil du site</NavLink>
          <NavLink to="/admin/music" className="adm-nav__link"><Icon name="music" />Musique du site</NavLink>
          <NavLink to="/admin/culture" className="adm-nav__link"><Icon name="hash" />Culture &amp; hashtags</NavLink>
          <Link to={`/admin/home/home${GALLERY_HASH}`} className={`adm-nav__link${galleryActive ? ' active' : ''}`} aria-current={galleryActive ? 'page' : undefined}><Icon name="image" />Galerie</Link>

          <span className="adm-nav__label adm-mono">Contenus</span>
          <button type="button" className="adm-nav__link adm-nav__button" aria-expanded={universOpen} aria-controls="adm-univers" onClick={() => setUniversOpen((open) => !open)}>
            <Icon name="book" />Univers<span className="adm-nav__n">{universNames.length}</span>
            <Icon name="down" size={14} className={`adm-nav__chev${universOpen ? ' is-open' : ''}`} />
          </button>
          {universOpen && (
            <div id="adm-univers" className="adm-nav__sub">
              {universNames.map((name) => <NavLink key={name} to={`/admin/${name}`} className="adm-nav__sublink">{SCHEMA[name].label}</NavLink>)}
            </div>
          )}
        </nav>

        <div className="adm-side__spacer" />
        <div className="adm-user">
          <span className="adm-avatar" aria-hidden="true">{initial}</span>
          <div><div className="adm-user__name">{displayName}</div><div className="adm-mono adm-user__role">Admin</div></div>
        </div>
        {onLock && <button type="button" className="adm-nav__link adm-nav__button" onClick={onLock}><Icon name="lock" />Verrouiller</button>}
        <Link to="/" className="adm-nav__link"><Icon name="arrow" />Voir le site</Link>
      </aside>

      <main className="adm-main">
        <div className="adm-topbar adm-mono">
          <span className="adm-topbar__path">Woltar Nova <b>/</b> Administration{pageLabel && <> <b>/</b> <span className="adm-topbar__page">{pageLabel}</span></>}</span>
          <span className="adm-topbar__right">
            <button type="button" className="adm-topbar__reload adm-mono" onClick={reload}>Recharger</button>
            <span className={`adm-topbar__status${readOnly ? ' is-readonly' : ''}`}>
              <span className="adm-topbar__dot" aria-hidden="true" />
              {readOnly ? 'Lecture seule' : 'Espace actif'}
            </span>
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
