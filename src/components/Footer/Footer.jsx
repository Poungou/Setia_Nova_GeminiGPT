import { Link } from 'react-router-dom'
import Reveal from '../Reveal/Reveal.jsx'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Reveal as="p" className="site-footer__quote" y={12}>
          « On ne naît pas légende.
          <br />
          On le devient en refusant de disparaître. »
        </Reveal>
        <div className="site-footer__meta">
          <span>Vitrine RP privée · Univers en évolution</span>
          <span className="site-footer__links">
            <ThemeToggle />
            <Link to="/compte" className="site-footer__admin">
              Compte
            </Link>
            {import.meta.env.DEV && (
              <Link to="/admin" className="site-footer__admin">
                Admin
              </Link>
            )}
            <a href="#top" className="site-footer__top">
              Haut de page ↑
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
