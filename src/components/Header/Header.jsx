import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getSession, accountBackendAvailable } from '../../lib/authApi.js'
import { Menu, X, ChevronDown } from 'lucide-react'
import './Header.css'

// « Univers » regroupe Clans / Lieux / Chronologie en sous-menu : la page
// Univers sert déjà de hub vers ces trois sections (cf. Universe.jsx), donc
// les garder aussi en entrées de premier niveau alourdissait la nav (9
// items). Le lien principal reste cliquable, le sous-menu est un bonus.
const NAV_LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/personnages', label: 'Personnages' },
  { to: '/joueurs', label: 'Joueurs' },
  {
    to: '/univers',
    label: 'Univers',
    children: [
      { to: '/clans', label: 'Clans' },
      { to: '/lieux', label: 'Lieux' },
      { to: '/chronologie', label: 'Chronologies' },
    ],
  },
  { to: '/journal', label: 'Journal' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/archives', label: 'Textes RP' },
  { to: '/aether', label: 'Aether' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [desktopGroupOpen, setDesktopGroupOpen] = useState(null)
  const [mobileGroupOpen, setMobileGroupOpen] = useState(null)
  const navRef = useRef(null)
  const headerRef = useRef(null)
  const toggleRef = useRef(null)
  const [user, setUser] = useState(null)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
    setDesktopGroupOpen(null)
    setMobileGroupOpen(null)
  }, [pathname])

  useEffect(() => {
    if (!accountBackendAvailable) return
    let alive = true
    const refresh = () => getSession().then((body) => { if (alive) setUser(body.user) }).catch(() => { if (alive) setUser(null) })
    refresh()
    window.addEventListener('focus', refresh)
    return () => { alive = false; window.removeEventListener('focus', refresh) }
  }, [])

  // Ferme le sous-menu desktop au clic extérieur ou à l'échap (clavier).
  useEffect(() => {
    if (!desktopGroupOpen && !open) return
    function onDocClick(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setDesktopGroupOpen(null)
        setMobileGroupOpen(null)
        setOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        if (desktopGroupOpen) navRef.current?.querySelector('.site-header__caret')?.focus()
        else toggleRef.current?.focus()
        setDesktopGroupOpen(null)
        setMobileGroupOpen(null)
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [desktopGroupOpen, open])

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container site-header__inner">
        <NavLink to="/" className="site-header__brand" onClick={() => setOpen(false)}>
          <span className="site-header__mark">N</span>
          <span className="site-header__brand-text">
            Woltar Nova
            <small>vitrine RP</small>
          </span>
        </NavLink>

        <nav
          className="site-header__nav site-header__nav--desktop"
          aria-label="Navigation principale"
          ref={navRef}
        >
          {NAV_LINKS.map((link) =>
            link.children ? (
              <div className="site-header__group" key={link.label} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDesktopGroupOpen(null) }}>
                <div className="site-header__group-trigger">
                  <NavLink
                    to={link.to}
                    onClick={() => setDesktopGroupOpen(null)}
                    className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
                  >
                    {link.label}
                  </NavLink>
                  <button
                    type="button"
                    className="site-header__caret"
                    aria-label={`Sous-menu ${link.label}`}
                    aria-expanded={desktopGroupOpen === link.label}
                    aria-controls="universe-desktop"
                    onClick={() => setDesktopGroupOpen((v) => (v === link.label ? null : link.label))}
                  >
                    <ChevronDown size={13} aria-hidden="true" />
                  </button>
                </div>
                <div
                  id="universe-desktop"
                  hidden={desktopGroupOpen !== link.label}
                  className={
                    'site-header__submenu' + (desktopGroupOpen === link.label ? ' is-open' : '')
                  }
                >
                  {link.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={() => setDesktopGroupOpen(null)}
                      className={({ isActive }) =>
                        'site-header__submenu-link' + (isActive ? ' is-active' : '')
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <NavLink to="/compte" className="site-header__account" title={user?.name || 'Connexion'}>{user?.name || 'Connexion'}</NavLink>
        <button
          ref={toggleRef}
          className="site-header__toggle"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="navigation-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav id="navigation-mobile" className="site-header__nav site-header__nav--mobile" aria-label="Navigation mobile">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <div className="site-header__mobile-group" key={link.label}>
                <div className="site-header__mobile-group-row">
                  <NavLink
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
                  >
                    {link.label}
                  </NavLink>
                  <button
                    type="button"
                    className="site-header__caret"
                    aria-label={`Déplier ${link.label}`}
                    aria-expanded={mobileGroupOpen === link.label}
                    aria-controls="universe-mobile"
                    onClick={() => setMobileGroupOpen((v) => (v === link.label ? null : link.label))}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                </div>
                {mobileGroupOpen === link.label && (
                  <div id="universe-mobile" className="site-header__mobile-submenu">
                    {link.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>
      )}
    </header>
  )
}
