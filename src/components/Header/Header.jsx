import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import './Header.css'

const NAV_LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/journal', label: 'Journal' },
  { to: '/personnages', label: 'Personnages' },
  { to: '/univers', label: 'Univers' },
  { to: '/clans', label: 'Clans' },
  { to: '/lieux', label: 'Lieux' },
  { to: '/chronologie', label: 'Chronologie' },
  { to: '/archives', label: 'Archives' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [])

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <NavLink to="/" className="site-header__brand" onClick={() => setOpen(false)}>
          <span className="site-header__mark">W</span>
          <span className="site-header__brand-text">
            WOLTAR
            <small>Archives Vivantes</small>
          </span>
        </NavLink>

        <nav className="site-header__nav site-header__nav--desktop" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="site-header__toggle"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="site-header__nav site-header__nav--mobile" aria-label="Navigation mobile">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => 'site-header__link' + (isActive ? ' is-active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
