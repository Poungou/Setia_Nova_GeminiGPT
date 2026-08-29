import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="site-footer__quote">
          « On ne naît pas légende.
          <br />
          On le devient en refusant de disparaître. »
        </p>
        <div className="site-footer__meta">
          <span>Vitrine RP privée · Univers en évolution</span>
          <a href="#top" className="site-footer__top">
            Haut de page ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
