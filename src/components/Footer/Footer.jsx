import { Link } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
          <nav className="site-footer__links" aria-label="Pied de page">
            <ThemeToggle compact />
            {import.meta.env.DEV && (
              <Link to="/admin" className="site-footer__admin">
                Admin
              </Link>
            )}
            <a href="#top" className="site-footer__top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'instant' }) }}>
              Haut de page ↑
            </a>
          </nav>
      </div>
    </footer>
  )
}
