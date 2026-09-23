import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getSession, accountBackendAvailable } from '../../lib/authApi.js'
import { Menu, X } from 'lucide-react'
import './Header.css'

// « Univers » est un simple lien vers la page /univers, qui sert de hub vers
// Clans / Lieux / Chronologie / Culture. Ces pages restent atteignables (et
// leurs routes inchangées) ; `section` sert seulement à garder « Univers »
// allumé quand on est dessus.
const NAV_LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/personnages', label: 'Personnages' },
  { to: '/joueurs', label: 'Joueurs' },
  {
    to: '/univers',
    label: 'Univers',
    section: ['/clans', '/lieux', '/chronologie', '/culture'],
  },
  { to: '/journal', label: 'Journal' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/aether', label: 'Aether' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)
  const headerRef = useRef(null)
  const toggleRef = useRef(null)
  const [user, setUser] = useState(null)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!accountBackendAvailable) return
    let alive = true
    const refresh = () => getSession().then((body) => { if (alive) setUser(body.user) }).catch(() => { if (alive) setUser(null) })
    refresh()
    window.addEventListener('focus', refresh)
    return () => { alive = false; window.removeEventListener('focus', refresh) }
  }, [])

  // Ferme le menu mobile au clic extérieur ou à l'échap (clavier).
  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        toggleRef.current?.focus()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const linkClass = (link) => ({ isActive }) =>
    'site-header__link' +
    ((isActive || link.section?.some((path) => pathname === path || pathname.startsWith(path + '/'))) ? ' is-active' : '')

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container site-header__inner">
        <NavLink to="/" className="site-header__brand" onClick={() => setOpen(false)}>
          <span className="site-header__mark" aria-hidden="true">W</span>
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
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass(link)}>
              {link.label}
            </NavLink>
          ))}
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
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={linkClass(link)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
